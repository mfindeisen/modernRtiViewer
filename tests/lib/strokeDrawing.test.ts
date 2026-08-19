import { describe, it, expect } from 'vitest';
import {
  simplifyPolyline,
  smoothPolyline,
  resamplePolyline,
  widthEnvelope,
  traceRidges,
  rasterizeStrokes,
  type StrokePoint,
} from '@/lib/strokeDrawing.js';

function point(x: number, y: number, width = 1): StrokePoint {
  return { x, y, width };
}

function packPixel(thin: number, energy: number, angle: number, alpha = 255) {
  return [
    Math.round(thin * 255),
    Math.round(energy * 255),
    Math.round((angle / (Math.PI * 2) + 0.5) * 255),
    alpha,
  ];
}

/** Horizontal ridge: height changes in Y, so gradient angle is +π/2. */
function horizontalRidgeField(width: number, height: number, y: number) {
  const pixels = new Uint8Array(width * height * 4);
  const row = packPixel(1, 1, Math.PI / 2);
  for (let x = 3; x < width - 3; x++) {
    pixels.set(row, (y * width + x) * 4);
  }
  return pixels;
}

describe('stroke drawing', () => {
  it('tapers open strokes and keeps closed loops full weight', () => {
    expect(widthEnvelope(0, false)).toBeCloseTo(0.28);
    expect(widthEnvelope(0.5, false)).toBeCloseTo(1);
    expect(widthEnvelope(1, false)).toBeCloseTo(0.28);
    expect(widthEnvelope(0.2, true)).toBe(1);
  });

  it('simplifies a nearly colinear polyline', () => {
    const points = [
      point(0, 0),
      point(1, 0.05),
      point(2, -0.04),
      point(10, 0),
    ];
    const simplified = simplifyPolyline(points, 0.5);
    expect(simplified).toHaveLength(2);
    expect(simplified[0]).toMatchObject({ x: 0, y: 0 });
    expect(simplified[1]).toMatchObject({ x: 10, y: 0 });
  });

  it('resamples a short polyline so taper has enough points', () => {
    const points = [point(0, 0), point(20, 0)];
    const resampled = resamplePolyline(points, 2);
    expect(resampled.length).toBeGreaterThan(8);
    expect(resampled[0]).toMatchObject({ x: 0, y: 0 });
    expect(resampled[resampled.length - 1].x).toBeCloseTo(20);
  });

  it('smooths corners without moving endpoints', () => {
    const points = [point(0, 0), point(1, 4), point(2, 0)];
    const smoothed = smoothPolyline(points, 1);
    expect(smoothed[0]).toMatchObject({ x: 0, y: 0 });
    expect(smoothed[2]).toMatchObject({ x: 2, y: 0 });
    expect(smoothed[1].y).toBeLessThan(4);
  });

  it('traces a packed horizontal ridge into one tapered stroke', () => {
    const width = 48;
    const height = 24;
    const pixels = horizontalRidgeField(width, height, 12);
    let packed = 0;
    for (let x = 0; x < width; x++) {
      if (pixels[(12 * width + x) * 4] > 200) packed += 1;
    }
    expect(packed).toBe(42);
    const strokes = traceRidges(pixels, width, height, { lineWidth: 1.5, flipY: false, minLength: 8 });
    expect(strokes.length).toBeGreaterThanOrEqual(1);
    const longest = strokes.reduce((best, stroke) => (
      stroke.points.length > best.points.length ? stroke : best
    ));
    expect(longest.points.length).toBeGreaterThan(8);
    const xs = longest.points.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(20);
    const mid = longest.points[Math.floor(longest.points.length / 2)];
    expect(mid.width).toBeGreaterThan(longest.points[0].width);
    expect(mid.width).toBeGreaterThan(longest.points[longest.points.length - 1].width);
  });

  it('rasterizes strokes as dark ink on white paper', () => {
    const strokes = [{
      closed: false,
      points: [point(2, 8, 2), point(20, 8, 3), point(38, 8, 2)],
    }];
    const pixels = rasterizeStrokes(strokes, 40, 16);
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] < 80) dark += 1;
    }
    expect(dark).toBeGreaterThan(20);
    expect(pixels[0]).toBe(255);
  });
});
