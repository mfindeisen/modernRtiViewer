import { fft2d, nextPow2 } from './fft2d.js';
import { flipMaskY, resizeMask } from './meshMask.js';

export const MESH_MASK_DIMENSION = 1024;
export const MAX_MESH_DIMENSION = 8192;
export const DEFAULT_MESH_RESOLUTION = 2048;
export const MESH_RESOLUTION_PRESETS = [1024, 2048, 4096];

export function meshResolutionChoices(sourceMax: number) {
  const max = Math.min(
    MAX_MESH_DIMENSION,
    Math.max(1, Math.round(sourceMax || DEFAULT_MESH_RESOLUTION)),
  );
  const threshold = max * 0.92;
  const values = MESH_RESOLUTION_PRESETS.filter((value) => value <= threshold);
  if (!values.includes(max)) values.push(max);
  return values;
}

const ALPHA_MIN = 16;
const NZ_MIN = 0.18;
const MAX_SLOPE = 0.7;

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
    p[i] = clampSlope(-nx[i] / z);
    q[i] = clampSlope(-ny[i] / z);
  }
  return { p, q };
}

function clampSlope(value: number) {
  if (value > MAX_SLOPE) return MAX_SLOPE;
  if (value < -MAX_SLOPE) return -MAX_SLOPE;
  return value;
}

function boxBlur3Masked(
  src: Float64Array,
  mask: Uint8Array,
  width: number,
  height: number,
) {
  const out = new Float64Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) {
        out[i] = src[i];
        continue;
      }
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const j = yy * width + xx;
          if (!mask[j]) continue;
          sum += src[j];
          n++;
        }
      }
      out[i] = n ? sum / n : src[i];
    }
  }
  return out;
}

function extendGradientsHarmonic(
  p: Float64Array,
  q: Float64Array,
  mask: Uint8Array,
  width: number,
  height: number,
  iterations = 48,
) {
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (mask[i]) continue;
        let pSum = 0;
        let qSum = 0;
        let n = 0;
        if (x > 0) {
          pSum += p[i - 1];
          qSum += q[i - 1];
          n++;
        }
        if (x < width - 1) {
          pSum += p[i + 1];
          qSum += q[i + 1];
          n++;
        }
        if (y > 0) {
          pSum += p[i - width];
          qSum += q[i - width];
          n++;
        }
        if (y < height - 1) {
          pSum += p[i + width];
          qSum += q[i + width];
          n++;
        }
        if (!n) continue;
        p[i] = pSum / n;
        q[i] = qSum / n;
      }
    }
  }
}

function reflectIndex(i: number, n: number) {
  if (n <= 1) return 0;
  const period = n * 2;
  let k = i % period;
  if (k < 0) k += period;
  return k < n ? k : period - 1 - k;
}

function recenterMasked(heightField: Float32Array, field: PackedNormalField) {
  const { mask } = field;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < heightField.length; i++) {
    if (!mask[i]) continue;
    sum += heightField[i];
    n++;
  }
  if (!n) return;
  const mean = sum / n;
  for (let i = 0; i < heightField.length; i++) {
    if (mask[i]) heightField[i] -= mean;
  }
}

function solveLinearSystem(matrix: number[][], rhs: number[]) {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    const swap = a[col];
    a[col] = a[pivot];
    a[pivot] = swap;
    const div = a[col][col];
    for (let c = col; c <= n; c++) a[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row) => row[n]);
}

function quadraticTerms(x: number, y: number) {
  return [1, x, y, x * x, x * y, y * y];
}

function fitQuadratic(heightField: Float32Array, field: PackedNormalField, keep: Uint8Array) {
  const { width, height } = field;
  const scale = 1 / Math.max(width, height);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const ata = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const atb = new Array(6).fill(0);
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!keep[i]) continue;
      const px = (x - cx) * scale;
      const py = (y - cy) * scale;
      const t = quadraticTerms(px, py);
      const z = heightField[i];
      n++;
      for (let r = 0; r < 6; r++) {
        atb[r] += t[r] * z;
        for (let c = 0; c < 6; c++) ata[r][c] += t[r] * t[c];
      }
    }
  }
  if (n < 24) return null;
  return solveLinearSystem(ata, atb);
}

function evalQuadratic(coeff: number[], x: number, y: number) {
  const t = quadraticTerms(x, y);
  return t[0] * coeff[0] + t[1] * coeff[1] + t[2] * coeff[2]
    + t[3] * coeff[3] + t[4] * coeff[4] + t[5] * coeff[5];
}

/**
 * Remove the low-frequency bowl/tilt that photometric integration invents.
 * Local relief (lettering, flake scars) stays.
 */
export function detrendQuadraticHeight(heightField: Float32Array, field: PackedNormalField) {
  const { mask, width, height } = field;
  const first = fitQuadratic(heightField, field, mask);
  if (!first) return false;
  const scale = 1 / Math.max(width, height);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const residuals: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      residuals.push(heightField[i] - evalQuadratic(first, (x - cx) * scale, (y - cy) * scale));
    }
  }
  const sorted = residuals.slice().sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = Math.max(1e-8, q3 - q1);
  const keep = new Uint8Array(mask.length);
  let kept = 0;
  let r = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      if (Math.abs(residuals[r++]) <= 2.5 * iqr) {
        keep[i] = 1;
        kept++;
      }
    }
  }
  const coeff = kept >= 24 ? (fitQuadratic(heightField, field, keep) ?? first) : first;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      heightField[i] -= evalQuadratic(coeff, (x - cx) * scale, (y - cy) * scale);
    }
  }
  return true;
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

  for (let y = 0; y < padH; y++) {
    const sy = reflectIndex(y, height);
    for (let x = 0; x < padW; x++) {
      const sx = reflectIndex(x, width);
      const src = sy * width + sx;
      const dst = y * padW + x;
      pRe[dst] = p[src];
      qRe[dst] = q[src];
    }
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

export function applyDisplayMask(
  field: PackedNormalField,
  displayMask: Uint8Array | null | undefined,
  maskSize?: { width: number; height: number } | null,
) {
  if (!displayMask) return field;
  let mask = displayMask;
  if (mask.length !== field.mask.length) {
    const mw = maskSize?.width;
    const mh = maskSize?.height;
    if (!mw || !mh || mw * mh !== displayMask.length) {
      throw new Error('Mask size does not match captured image');
    }
    mask = resizeMask(displayMask, mw, mh, field.width, field.height);
  }
  const glMask = flipMaskY(mask, field.width, field.height);
  for (let i = 0; i < field.mask.length; i++) {
    if (!glMask[i]) field.mask[i] = 0;
  }
  return field;
}

export function cropPackedField(
  field: PackedNormalField,
  colorPixels: Uint8Array | Uint8ClampedArray | null,
  pad = 4,
): { field: PackedNormalField; colorPixels: Uint8Array | Uint8ClampedArray | null } {
  const { width, height, mask } = field;
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
  if (maxX < minX) return { field, colorPixels };
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  if (cropW === width && cropH === height) return { field, colorPixels };

  const count = cropW * cropH;
  const nx = new Float32Array(count);
  const ny = new Float32Array(count);
  const nz = new Float32Array(count);
  const cropMask = new Uint8Array(count);
  let cropColor: Uint8Array | null = null;
  if (colorPixels) cropColor = new Uint8Array(count * 4);

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const src = (minY + y) * width + (minX + x);
      const dst = y * cropW + x;
      nx[dst] = field.nx[src];
      ny[dst] = field.ny[src];
      nz[dst] = field.nz[src];
      cropMask[dst] = mask[src];
      if (cropColor && colorPixels) {
        const so = src * 4;
        const doff = dst * 4;
        cropColor[doff] = colorPixels[so];
        cropColor[doff + 1] = colorPixels[so + 1];
        cropColor[doff + 2] = colorPixels[so + 2];
        cropColor[doff + 3] = colorPixels[so + 3];
      }
    }
  }

  return {
    field: { nx, ny, nz, mask: cropMask, width: cropW, height: cropH },
    colorPixels: cropColor,
  };
}

export function integrateNormalsToHeight(
  field: PackedNormalField,
  options?: { orient?: boolean },
) {
  const { p, q } = gradientsFromNormals(field);
  let pSmooth = p;
  let qSmooth = q;
  for (let pass = 0; pass < 3; pass++) {
    pSmooth = boxBlur3Masked(pSmooth, field.mask, field.width, field.height);
    qSmooth = boxBlur3Masked(qSmooth, field.mask, field.width, field.height);
  }
  const iters = Math.min(64, Math.max(24, Math.round(Math.max(field.width, field.height) / 40)));
  extendGradientsHarmonic(pSmooth, qSmooth, field.mask, field.width, field.height, iters);
  const heightField = integrateGradientsFrankotChellappa(pSmooth, qSmooth, field.width, field.height);
  recenterMasked(heightField, field);
  if (options?.orient !== false) orientHeightTowardCamera(heightField, field);
  return heightField;
}

function median9(values: Float64Array, n: number) {
  for (let i = 1; i < n; i++) {
    const cur = values[i];
    let j = i - 1;
    while (j >= 0 && values[j] > cur) {
      values[j + 1] = values[j];
      j--;
    }
    values[j + 1] = cur;
  }
  return values[n >> 1];
}

export function medianFilterHeight(heightField: Float32Array, field: PackedNormalField) {
  const { mask, width, height } = field;
  const out = new Float32Array(heightField);
  const win = new Float64Array(9);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const j = yy * width + xx;
          if (!mask[j]) continue;
          win[n++] = heightField[j];
        }
      }
      if (n >= 3) out[i] = median9(win, n);
    }
  }
  heightField.set(out);
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
  downsample = 1,
): MeshScale {
  const scale = downsample > 0 ? downsample : 1;
  if (!calibration || !(calibration.pixelsPerUnit > 0)) {
    return { pixelSize: scale, unit: 'px' };
  }
  return { pixelSize: (1 / calibration.pixelsPerUnit) * scale, unit: calibration.unit };
}

export interface ReconstructedSurface {
  mesh: SurfaceMesh;
  ply: ArrayBuffer;
  scale: MeshScale;
}

export function plyCommentsForScale(scale: MeshScale) {
  return [
    'modernRtiViewer RTI normal integration (visualization only)',
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
  options?: { mask?: Uint8Array | null; maskWidth?: number; maskHeight?: number },
): ReconstructedSurface {
  const field = applyDisplayMask(
    normalsFromPackedRgba(normalPixels, width, height),
    options?.mask ?? null,
    options?.maskWidth && options?.maskHeight
      ? { width: options.maskWidth, height: options.maskHeight }
      : null,
  );
  const cropped = cropPackedField(field, colorPixels);
  const heightField = integrateNormalsToHeight(cropped.field, { orient: false });
  detrendQuadraticHeight(heightField, cropped.field);
  medianFilterHeight(heightField, cropped.field);
  recenterMasked(heightField, cropped.field);
  orientHeightTowardCamera(heightField, cropped.field);
  const mesh = heightFieldToMesh(heightField, cropped.field, cropped.colorPixels, scale);
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
  options?: { mask?: Uint8Array | null; maskWidth?: number; maskHeight?: number },
) {
  return buildSurfaceFromPackedNormals(normalPixels, colorPixels, width, height, scale, options).ply;
}
