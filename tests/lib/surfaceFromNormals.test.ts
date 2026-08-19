import { describe, expect, it } from 'vitest';
import { fft2d, fftRadix2, nextPow2 } from '@/lib/fft2d.js';
import {
  buildPlyFromPackedNormals,
  buildSurfaceFromPackedNormals,
  detrendQuadraticHeight,
  encodeBinaryPly,
  heightFieldToMesh,
  integrateGradientsFrankotChellappa,
  integrateNormalsToHeight,
  meshResolutionChoices,
  normalsFromPackedRgba,
  pixelSizeFromCalibration,
} from '@/lib/surfaceFromNormals.js';

function packNormal(nx: number, ny: number, nz: number) {
  const len = Math.hypot(nx, ny, nz) || 1;
  return [
    Math.round(((nx / len) * 0.5 + 0.5) * 255),
    Math.round(((ny / len) * 0.5 + 0.5) * 255),
    Math.round(((nz / len) * 0.5 + 0.5) * 255),
    255,
  ] as const;
}

function correlation(a: number[], b: number[]) {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  return num / Math.sqrt(denA * denB);
}

describe('fft2d', () => {
  it('rounds nextPow2 up', () => {
    expect(nextPow2(1)).toBe(1);
    expect(nextPow2(3)).toBe(4);
    expect(nextPow2(1024)).toBe(1024);
  });

  it('transforms an impulse to a constant', () => {
    const re = new Float64Array([1, 0, 0, 0, 0, 0, 0, 0]);
    const im = new Float64Array(8);
    fftRadix2(re, im, false);
    for (let i = 0; i < 8; i++) {
      expect(re[i]).toBeCloseTo(1, 10);
      expect(im[i]).toBeCloseTo(0, 10);
    }
  });

  it('inverts a 2D transform', () => {
    const width = 8;
    const height = 4;
    const re = new Float64Array(width * height);
    const im = new Float64Array(width * height);
    for (let i = 0; i < re.length; i++) re[i] = (i * 17) % 13;
    const original = Float64Array.from(re);
    fft2d(re, im, width, height, false);
    fft2d(re, im, width, height, true);
    for (let i = 0; i < re.length; i++) {
      expect(re[i]).toBeCloseTo(original[i], 8);
      expect(im[i]).toBeCloseTo(0, 8);
    }
  });
});

describe('surfaceFromNormals', () => {
  it('decodes packed normals and skips transparent pixels', () => {
    const pixels = new Uint8Array([
      ...packNormal(0, 0, 1),
      0, 0, 0, 0,
    ]);
    const field = normalsFromPackedRgba(pixels, 2, 1);
    expect(field.mask[0]).toBe(1);
    expect(field.mask[1]).toBe(0);
    expect(field.nx[0]).toBeCloseTo(0, 1);
    expect(field.nz[0]).toBeCloseTo(1, 1);
  });

  it('recovers a periodic sine surface from its gradients', () => {
    const width = 32;
    const height = 32;
    const p = new Float64Array(width * height);
    const q = new Float64Array(width * height);
    const expected: number[] = [];
    const recovered: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const wx = (2 * Math.PI * x) / width;
        const wy = (2 * Math.PI * y) / height;
        p[i] = (2 * Math.PI / width) * Math.cos(wx) * Math.sin(wy);
        q[i] = (2 * Math.PI / height) * Math.sin(wx) * Math.cos(wy);
        expected.push(Math.sin(wx) * Math.sin(wy));
      }
    }
    const z = integrateGradientsFrankotChellappa(p, q, width, height);
    for (let i = 0; i < z.length; i++) recovered.push(z[i]);
    expect(correlation(expected, recovered)).toBeGreaterThan(0.98);
    const peak = Math.max(...recovered.map(Math.abs));
    expect(peak).toBeGreaterThan(0.5);
  });

  it('reconstructs a sphere cap as a bump toward the camera', () => {
    const width = 48;
    const height = 48;
    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;
    const radius = 18;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const r2 = dx * dx + dy * dy;
        const i = (y * width + x) * 4;
        if (r2 >= radius * radius) {
          pixels.set(packNormal(0, 0, 1), i);
          continue;
        }
        const z = Math.sqrt(radius * radius - r2);
        pixels.set(packNormal(dx / radius, dy / radius, z / radius), i);
      }
    }
    const field = normalsFromPackedRgba(pixels, width, height);
    const z = integrateNormalsToHeight(field);
    const center = z[Math.round(cy) * width + Math.round(cx)];
    const rim = z[Math.round(cy) * width + Math.round(cx + radius - 1)];
    expect(center).toBeGreaterThan(rim);
  });

  it('flips an inverted sphere cap so the interior still bulges toward the camera', () => {
    const width = 48;
    const height = 48;
    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;
    const radius = 18;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const r2 = dx * dx + dy * dy;
        const i = (y * width + x) * 4;
        if (r2 >= radius * radius) {
          pixels.set(packNormal(0, 0, 1), i);
          continue;
        }
        const z = Math.sqrt(radius * radius - r2);
        pixels.set(packNormal(-dx / radius, -dy / radius, z / radius), i);
      }
    }
    const field = normalsFromPackedRgba(pixels, width, height);
    const z = integrateNormalsToHeight(field);
    const center = z[Math.round(cy) * width + Math.round(cx)];
    const rim = z[Math.round(cy) * width + Math.round(cx + radius - 1)];
    expect(center).toBeGreaterThan(rim);
  });

  it('keeps height bounded when a packed normal is nearly grazing', () => {
    const width = 24;
    const height = 24;
    const pixels = new Uint8Array(width * height * 4);
    const flat = packNormal(0, 0, 1);
    const spike = packNormal(0.98, 0, 0.04);
    for (let i = 0; i < width * height; i++) pixels.set(flat, i * 4);
    pixels.set(spike, (12 * width + 12) * 4);
    const field = normalsFromPackedRgba(pixels, width, height);
    const z = integrateNormalsToHeight(field);
    let min = Infinity;
    let max = -Infinity;
    for (const value of z) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    expect(max - min).toBeLessThan(12);
  });

  it('builds a colored PLY from packed normals', () => {
    const width = 8;
    const height = 8;
    const normalPixels = new Uint8Array(width * height * 4);
    const colorPixels = new Uint8Array(width * height * 4);
    const packed = packNormal(-0.2, 0, 1);
    for (let i = 0; i < width * height; i++) {
      normalPixels.set(packed, i * 4);
      colorPixels.set([200, 40, 10, 255], i * 4);
    }
    const buffer = buildPlyFromPackedNormals(
      normalPixels,
      colorPixels,
      width,
      height,
      { pixelSize: 0.1, unit: 'mm' },
    );
    const text = new TextDecoder().decode(buffer.slice(0, 600));
    expect(text.startsWith('ply\n')).toBe(true);
    expect(text).toContain('format binary_little_endian 1.0');
    expect(text).toContain('comment unit mm');
    expect(text).toContain('element vertex');
    expect(text).toContain('element face');
    expect(text).toContain('end_header');
  });

  it('subtracts a bowl-shaped trend but keeps a local bump', () => {
    const width = 48;
    const height = 48;
    const field = normalsFromPackedRgba(new Uint8Array(width * height * 4).fill(255), width, height);
    const z = new Float32Array(width * height);
    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = (x - cx) / width;
        const ny = (y - cy) / height;
        const bowl = 8 * nx * nx + 6 * ny * ny + 3 * nx + 2 * ny;
        const bump = Math.exp(-((x - cx) ** 2 + (y - 16) ** 2) / 18);
        z[y * width + x] = bowl + bump;
      }
    }
    detrendQuadraticHeight(z, field);
    const center = z[16 * width + Math.round(cx)];
    const corner = z[2 * width + 2];
    expect(center).toBeGreaterThan(0.4);
    expect(Math.abs(corner)).toBeLessThan(0.25);
  });

  it('flattens a globally tilted photometric plane', () => {
    const width = 32;
    const height = 32;
    const normalPixels = new Uint8Array(width * height * 4);
    const packed = packNormal(0.35, -0.2, 0.9);
    for (let i = 0; i < width * height; i++) normalPixels.set(packed, i * 4);
    const surface = buildSurfaceFromPackedNormals(
      normalPixels,
      null,
      width,
      height,
      { pixelSize: 1, unit: 'px' },
    );
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < surface.mesh.vertexCount; i++) {
      const z = surface.mesh.positions[i * 3 + 2];
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    expect(maxZ - minZ).toBeLessThan(1.5);
  });

  it('uses pixel units when no calibration is set', () => {
    expect(pixelSizeFromCalibration(null)).toEqual({ pixelSize: 1, unit: 'px' });
    expect(pixelSizeFromCalibration({ pixelsPerUnit: 20, unit: 'mm' })).toEqual({
      pixelSize: 0.05,
      unit: 'mm',
    });
    expect(pixelSizeFromCalibration({ pixelsPerUnit: 20, unit: 'mm' }, 2)).toEqual({
      pixelSize: 0.1,
      unit: 'mm',
    });
  });

  it('rejects empty masks', () => {
    const field = normalsFromPackedRgba(new Uint8Array(16), 2, 2);
    expect(() => heightFieldToMesh(new Float32Array(4), field, null, { pixelSize: 1, unit: 'px' }))
      .toThrow(/enough surface/);
  });

  it('roundtrips vertex count into the PLY header', () => {
    const mesh = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      colors: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      indices: new Uint32Array([0, 1, 2]),
      vertexCount: 3,
      faceCount: 1,
    };
    const buffer = encodeBinaryPly(mesh, ['test']);
    const header = new TextDecoder().decode(buffer).split('end_header')[0];
    expect(header).toContain('element vertex 3');
    expect(header).toContain('element face 1');
    expect(header).toContain('comment test');
  });

  it('offers native max resolution without presets above the source', () => {
    expect(meshResolutionChoices(1800)).toEqual([1024, 1800]);
    expect(meshResolutionChoices(4096)).toEqual([1024, 2048, 4096]);
    expect(meshResolutionChoices(6120)).toEqual([1024, 2048, 4096, 6120]);
    expect(meshResolutionChoices(800)).toEqual([800]);
    expect(meshResolutionChoices(20000)).toEqual([1024, 2048, 4096, 8192]);
  });
});

describe('surfacePreview helpers', () => {
  it('converts byte colors to 0–1 floats', async () => {
    const { vertexColorsToFloats, surfaceMeshRadius } = await import('@/lib/surfacePreview.js');
    const rgb = vertexColorsToFloats(new Uint8Array([0, 128, 255]));
    expect(rgb[0]).toBe(0);
    expect(rgb[1]).toBeCloseTo(128 / 255, 5);
    expect(rgb[2]).toBe(1);
    expect(surfaceMeshRadius({
      positions: new Float32Array([3, 0, 4, 0, 0, 0]),
      colors: new Uint8Array(6),
      indices: new Uint32Array(),
      vertexCount: 2,
      faceCount: 0,
    })).toBe(5);
  });
});
