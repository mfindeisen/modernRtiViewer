import { describe, expect, it } from 'vitest';
import {
  fillMask,
  flipMaskY,
  guessForegroundMask,
  invertMask,
  maskCoverage,
  resizeMask,
  stampDisc,
} from '@/lib/meshMask.js';
import {
  applyDisplayMask,
  buildSurfaceFromPackedNormals,
  cropPackedField,
  normalsFromPackedRgba,
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

function setDisplayPixel(
  pixels: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  rgb: [number, number, number],
) {
  const i = ((height - 1 - y) * width + x) * 4;
  pixels[i] = rgb[0];
  pixels[i + 1] = rgb[1];
  pixels[i + 2] = rgb[2];
  pixels[i + 3] = 255;
}

describe('meshMask', () => {
  it('flips rows so display origin matches canvas space', () => {
    const mask = new Uint8Array([1, 1, 0, 0]);
    expect(Array.from(flipMaskY(mask, 2, 2))).toEqual([0, 0, 1, 1]);
  });

  it('guesses a bright object on a dark table', () => {
    const width = 64;
    const height = 64;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        setDisplayPixel(pixels, width, height, x, y, [8, 8, 8]);
      }
    }
    for (let y = 18; y <= 45; y++) {
      for (let x = 18; x <= 45; x++) {
        setDisplayPixel(pixels, width, height, x, y, [180, 120, 70]);
      }
    }
    for (let y = 8; y <= 16; y++) {
      for (let x = 48; x <= 56; x++) {
        setDisplayPixel(pixels, width, height, x, y, [240, 240, 240]);
      }
    }
    const mask = guessForegroundMask(pixels, width, height);
    expect(mask[32 * width + 32]).toBe(1);
    expect(mask[2 * width + 2]).toBe(0);
    expect(mask[12 * width + 52]).toBe(0);
    expect(maskCoverage(mask)).toBeGreaterThan(400);
    expect(maskCoverage(mask)).toBeLessThan(width * height * 0.5);
  });

  it('stamps a disc in display space', () => {
    const mask = fillMask(20, 20, 0);
    stampDisc(mask, 20, 20, 10, 10, 3, 1);
    expect(mask[10 * 20 + 10]).toBe(1);
    expect(mask[0]).toBe(0);
    expect(maskCoverage(invertMask(mask))).toBe(400 - maskCoverage(mask));
  });

  it('nearest-neighbour upsamples a mask', () => {
    const src = new Uint8Array([1, 0, 0, 1]);
    const dst = resizeMask(src, 2, 2, 4, 4);
    expect(dst[0]).toBe(1);
    expect(dst[1]).toBe(1);
    expect(dst[4]).toBe(1);
    expect(dst[2]).toBe(0);
    expect(dst[15]).toBe(1);
  });
});

describe('masked surface reconstruction', () => {
  it('drops unmasked pixels and crops to the selection', () => {
    const width = 16;
    const height = 12;
    const normalPixels = new Uint8Array(width * height * 4);
    const packed = packNormal(0, 0, 1);
    for (let i = 0; i < width * height; i++) normalPixels.set(packed, i * 4);
    const field = applyDisplayMask(
      normalsFromPackedRgba(normalPixels, width, height),
      (() => {
        const mask = fillMask(width, height, 0);
        for (let y = 3; y <= 8; y++) {
          for (let x = 4; x <= 11; x++) mask[y * width + x] = 1;
        }
        return mask;
      })(),
    );
    expect(field.mask[0]).toBe(0);
    const cropped = cropPackedField(field, null, 1);
    expect(cropped.field.width).toBeLessThan(width);
    expect(cropped.field.height).toBeLessThan(height);
    expect(cropped.field.width).toBe(8 + 2);
    expect(cropped.field.height).toBe(6 + 2);
  });

  it('builds a smaller mesh when a mask is supplied', () => {
    const width = 12;
    const height = 12;
    const normalPixels = new Uint8Array(width * height * 4);
    const packed = packNormal(-0.1, 0, 1);
    for (let i = 0; i < width * height; i++) normalPixels.set(packed, i * 4);
    const full = buildSurfaceFromPackedNormals(normalPixels, null, width, height, { pixelSize: 1, unit: 'px' });
    const mask = fillMask(width, height, 0);
    for (let y = 2; y <= 6; y++) {
      for (let x = 2; x <= 6; x++) mask[y * width + x] = 1;
    }
    const masked = buildSurfaceFromPackedNormals(
      normalPixels,
      null,
      width,
      height,
      { pixelSize: 1, unit: 'px' },
      { mask },
    );
    expect(masked.mesh.vertexCount).toBeLessThan(full.mesh.vertexCount);
    expect(masked.mesh.vertexCount).toBe(25);
  });

  it('upscales a smaller display mask onto the captured field', () => {
    const width = 8;
    const height = 8;
    const normalPixels = new Uint8Array(width * height * 4);
    const packed = packNormal(0, 0, 1);
    for (let i = 0; i < width * height; i++) normalPixels.set(packed, i * 4);
    const small = new Uint8Array(4);
    small[0] = 1;
    const surface = buildSurfaceFromPackedNormals(
      normalPixels,
      null,
      width,
      height,
      { pixelSize: 1, unit: 'px' },
      { mask: small, maskWidth: 2, maskHeight: 2 },
    );
    expect(surface.mesh.vertexCount).toBeGreaterThan(3);
    expect(surface.mesh.vertexCount).toBeLessThan(width * height);
  });
});
