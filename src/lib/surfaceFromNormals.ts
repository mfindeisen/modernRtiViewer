import { fft2d, nextPow2 } from './fft2d.js';

export const MAX_MESH_DIMENSION = 1024;
const ALPHA_MIN = 16;
const NZ_MIN = 0.08;

export interface PackedNormalField {
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  mask: Uint8Array;
  width: number;
  height: number;
}

export interface MeshScale {
  pixelSize: number;
  unit: string;
}

export interface SurfaceMesh {
  positions: Float32Array;
  colors: Uint8Array;
  indices: Uint32Array;
  vertexCount: number;
  faceCount: number;
}

function decodeChannel(value: number) {
  return (value / 255) * 2 - 1;
}

/** Decode packed RGB normals (n * 0.5 + 0.5) from GL readPixels (origin bottom-left). */
export function normalsFromPackedRgba(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): PackedNormalField {
  const count = width * height;
  const nx = new Float32Array(count);
  const ny = new Float32Array(count);
  const nz = new Float32Array(count);
  const mask = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (pixels[o + 3] < ALPHA_MIN) {
      nx[i] = 0;
      ny[i] = 0;
      nz[i] = 1;
      continue;
    }
    let x = decodeChannel(pixels[o]);
    let y = decodeChannel(pixels[o + 1]);
    let z = decodeChannel(pixels[o + 2]);
    const len = Math.hypot(x, y, z);
    if (len < 1e-5) {
      nx[i] = 0;
      ny[i] = 0;
      nz[i] = 1;
      continue;
    }
    x /= len;
    y /= len;
    z /= len;
    nx[i] = x;
    ny[i] = y;
    nz[i] = z;
    mask[i] = 1;
  }

  return { nx, ny, nz, mask, width, height };
}

function gradientsFromNormals(field: PackedNormalField) {
  const { nx, ny, nz, mask, width, height } = field;
  const count = width * height;
  const p = new Float64Array(count);
  const q = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    if (!mask[i]) continue;
    const z = nz[i] < NZ_MIN ? NZ_MIN : nz[i];
    p[i] = -nx[i] / z;
    q[i] = -ny[i] / z;
  }
  return { p, q };
}

function boxBlur3(src: Float64Array, width: number, height: number) {
  const out = new Float64Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += src[yy * width + xx];
          n++;
        }
      }
      out[y * width + x] = n ? sum / n : src[y * width + x];
    }
  }
  return out;
}

/**
 * Frankot–Chellappa integration of surface gradients (Frankot & Chellappa 1988).
 * Input arrays are row-major with y increasing upward (GL readPixels).
 */
export function integrateGradientsFrankotChellappa(
  p: Float64Array,
  q: Float64Array,
  width: number,
  height: number,
) {
  const padW = nextPow2(width);
  const padH = nextPow2(height);
  const padCount = padW * padH;
  const pRe = new Float64Array(padCount);
  const pIm = new Float64Array(padCount);
  const qRe = new Float64Array(padCount);
  const qIm = new Float64Array(padCount);

  for (let y = 0; y < height; y++) {
    pRe.set(p.subarray(y * width, y * width + width), y * padW);
    qRe.set(q.subarray(y * width, y * width + width), y * padW);
  }

  fft2d(pRe, pIm, padW, padH, false);
  fft2d(qRe, qIm, padW, padH, false);

  const zRe = new Float64Array(padCount);
  const zIm = new Float64Array(padCount);
  for (let y = 0; y < padH; y++) {
    const fy = y < padH / 2 ? y / padH : (y - padH) / padH;
    const wy = 2 * Math.PI * fy;
    for (let x = 0; x < padW; x++) {
      const fx = x < padW / 2 ? x / padW : (x - padW) / padW;
      const wx = 2 * Math.PI * fx;
      const denom = wx * wx + wy * wy;
      const i = y * padW + x;
      if (denom < 1e-20) continue;
      // Z = (-j wx P - j wy Q) / (wx² + wy²)
      zRe[i] = (wx * pIm[i] + wy * qIm[i]) / denom;
      zIm[i] = (-wx * pRe[i] - wy * qRe[i]) / denom;
    }
  }

  fft2d(zRe, zIm, padW, padH, true);

  const heightField = new Float32Array(width * height);
  let sum = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const z = zRe[y * padW + x];
      heightField[y * width + x] = z;
      sum += z;
    }
  }
  const mean = sum / (width * height);
  for (let i = 0; i < heightField.length; i++) heightField[i] -= mean;
  return heightField;
}

export function integrateNormalsToHeight(field: PackedNormalField) {
  const { p, q } = gradientsFromNormals(field);
  const pSmooth = boxBlur3(p, field.width, field.height);
  const qSmooth = boxBlur3(q, field.width, field.height);
  const heightField = integrateGradientsFrankotChellappa(pSmooth, qSmooth, field.width, field.height);
  orientHeightTowardCamera(heightField, field);
  return heightField;
}

/**
 * Photometric normals have a convex/concave ambiguity. RTI subjects sit in
 * front of the camera, so the interior of the object should bulge toward +Z.
 */
export function orientHeightTowardCamera(heightField: Float32Array, field: PackedNormalField) {
  const { mask, width, height } = field;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return false;

  const insetX = Math.max(1, Math.round((maxX - minX) * 0.2));
  const insetY = Math.max(1, Math.round((maxY - minY) * 0.2));
  let innerSum = 0;
  let innerCount = 0;
  let outerSum = 0;
  let outerCount = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const outer = x < minX + insetX || x > maxX - insetX || y < minY + insetY || y > maxY - insetY;
      if (outer) {
        outerSum += heightField[i];
        outerCount++;
      } else {
        innerSum += heightField[i];
        innerCount++;
      }
    }
  }
  if (!innerCount || !outerCount) return false;
  if (innerSum / innerCount >= outerSum / outerCount) return false;
  for (let i = 0; i < heightField.length; i++) heightField[i] *= -1;
  return true;
}

export function heightFieldToMesh(
  heightField: Float32Array,
  field: PackedNormalField,
  colorPixels: Uint8Array | Uint8ClampedArray | null,
  scale: MeshScale,
): SurfaceMesh {
  const { mask, width, height } = field;
  const pixelSize = scale.pixelSize > 0 ? scale.pixelSize : 1;
  const indexOf = new Int32Array(width * height).fill(-1);
  let vertexCount = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) indexOf[i] = vertexCount++;
  }
  if (vertexCount < 3) {
    throw new Error('Not enough surface pixels to build a mesh');
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let sumZ = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (indexOf[i] < 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      sumZ += heightField[i];
    }
  }
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = sumZ / vertexCount;

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Uint8Array(vertexCount * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const vi = indexOf[i];
      if (vi < 0) continue;
      const o = vi * 3;
      positions[o] = (x - cx) * pixelSize;
      positions[o + 1] = (y - cy) * pixelSize;
      positions[o + 2] = (heightField[i] - cz) * pixelSize;
      if (colorPixels) {
        const c = i * 4;
        colors[o] = colorPixels[c];
        colors[o + 1] = colorPixels[c + 1];
        colors[o + 2] = colorPixels[c + 2];
      } else {
        colors[o] = 180;
        colors[o + 1] = 180;
        colors[o + 2] = 180;
      }
    }
  }

  const faces: number[] = [];
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i00 = indexOf[y * width + x];
      const i10 = indexOf[y * width + x + 1];
      const i01 = indexOf[(y + 1) * width + x];
      const i11 = indexOf[(y + 1) * width + x + 1];
      if (i00 < 0 || i10 < 0 || i01 < 0 || i11 < 0) continue;
      faces.push(i00, i10, i11, i00, i11, i01);
    }
  }
  if (faces.length < 3) {
    throw new Error('Surface integration produced no triangles');
  }

  return {
    positions,
    colors,
    indices: Uint32Array.from(faces),
    vertexCount,
    faceCount: faces.length / 3,
  };
}

export function encodeBinaryPly(mesh: SurfaceMesh, comments: string[] = []) {
  const { positions, colors, indices, vertexCount, faceCount } = mesh;
  const headerLines = [
    'ply',
    'format binary_little_endian 1.0',
    ...comments.map((line) => `comment ${line}`),
    `element vertex ${vertexCount}`,
    'property float x',
    'property float y',
    'property float z',
    'property uchar red',
    'property uchar green',
    'property uchar blue',
    `element face ${faceCount}`,
    'property list uchar int vertex_indices',
    'end_header\n',
  ];
  const header = new TextEncoder().encode(headerLines.join('\n'));
  const vertexBytes = vertexCount * (12 + 3);
  const faceBytes = faceCount * (1 + 12);
  const buffer = new ArrayBuffer(header.length + vertexBytes + faceBytes);
  const bytes = new Uint8Array(buffer);
  bytes.set(header, 0);
  const view = new DataView(buffer);
  let offset = header.length;
  for (let i = 0; i < vertexCount; i++) {
    const p = i * 3;
    view.setFloat32(offset, positions[p], true);
    view.setFloat32(offset + 4, positions[p + 1], true);
    view.setFloat32(offset + 8, positions[p + 2], true);
    bytes[offset + 12] = colors[p];
    bytes[offset + 13] = colors[p + 1];
    bytes[offset + 14] = colors[p + 2];
    offset += 15;
  }
  for (let f = 0; f < faceCount; f++) {
    const i = f * 3;
    bytes[offset] = 3;
    view.setInt32(offset + 1, indices[i], true);
    view.setInt32(offset + 5, indices[i + 1], true);
    view.setInt32(offset + 9, indices[i + 2], true);
    offset += 13;
  }
  return buffer;
}

export function pixelSizeFromCalibration(
  calibration: { pixelsPerUnit: number; unit: string } | null | undefined,
): MeshScale {
  if (!calibration || !(calibration.pixelsPerUnit > 0)) {
    return { pixelSize: 1, unit: 'px' };
  }
  return { pixelSize: 1 / calibration.pixelsPerUnit, unit: calibration.unit };
}

export interface ReconstructedSurface {
  mesh: SurfaceMesh;
  ply: ArrayBuffer;
  scale: MeshScale;
}

export function plyCommentsForScale(scale: MeshScale) {
  return [
    'modernRtiViewer RTI normal integration (Frankot-Chellappa)',
    `unit ${scale.unit}`,
    `pixelSize ${scale.pixelSize}`,
    'one-sided surface; not a closed 3D scan',
  ];
}

export function buildSurfaceFromPackedNormals(
  normalPixels: Uint8Array | Uint8ClampedArray,
  colorPixels: Uint8Array | Uint8ClampedArray | null,
  width: number,
  height: number,
  scale: MeshScale,
): ReconstructedSurface {
  const field = normalsFromPackedRgba(normalPixels, width, height);
  const heightField = integrateNormalsToHeight(field);
  const mesh = heightFieldToMesh(heightField, field, colorPixels, scale);
  return {
    mesh,
    ply: encodeBinaryPly(mesh, plyCommentsForScale(scale)),
    scale,
  };
}

export function buildPlyFromPackedNormals(
  normalPixels: Uint8Array | Uint8ClampedArray,
  colorPixels: Uint8Array | Uint8ClampedArray | null,
  width: number,
  height: number,
  scale: MeshScale,
) {
  return buildSurfaceFromPackedNormals(normalPixels, colorPixels, width, height, scale).ply;
}
