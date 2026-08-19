import { describe, expect, it } from 'vitest';
import { paddedNodePixelWindow } from '@/lib/tiffNodeWindow.js';

describe('paddedNodePixelWindow', () => {
  it('uses the full image for a square power-of-two root node', () => {
    const window = paddedNodePixelWindow(
      { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      1024,
      1024,
      1024,
      1024,
      1024,
    );
    expect(window).toMatchObject({
      nx0: 0, ny0: 0, nx1: 1024, ny1: 1024,
      x0: 0, y0: 0, x1: 1024, y1: 1024,
      texW: 1024, texH: 1024, tileW: 1024, tileH: 1024,
    });
  });

  it('keeps padded cell size larger than the clipped image window', () => {
    const window = paddedNodePixelWindow(
      { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      1024,
      800,
      400,
      800,
      400,
    );
    expect(window.texW).toBe(1024);
    expect(window.texH).toBe(1024);
    expect(window.tileW).toBe(800);
    expect(window.tileH).toBe(400);
    expect(window.x0 - window.nx0).toBeGreaterThan(0);
    expect(window.y0 - window.ny0).toBeGreaterThan(0);
  });

  it('maps a 256 leaf onto one TIFF tile when the canvas is already the padded grid', () => {
    const window = paddedNodePixelWindow(
      { minX: 0, maxX: 0.25, minY: 0.75, maxY: 1 },
      1024,
      1024,
      1024,
      1024,
      1024,
    );
    expect(window).toMatchObject({
      x0: 0, y0: 0, x1: 256, y1: 256,
      tileW: 256, tileH: 256,
    });
  });
});
