import { describe, it, expect } from 'vitest';
import { computeFitToViewZoom, computeZoomLimits, formatZoomPercent, viewportHasLayout } from '@/lib/cameraFit.js';

describe('viewportHasLayout', () => {
  it('rejects empty or non-finite boxes', () => {
    expect(viewportHasLayout(0, 800)).toBe(false);
    expect(viewportHasLayout(800, 0)).toBe(false);
    expect(viewportHasLayout(Number.NaN, 800)).toBe(false);
    expect(viewportHasLayout(800, 600)).toBe(true);
  });
});

describe('computeFitToViewZoom', () => {
  it('returns 1 for a square image in a square viewport', () => {
    expect(computeFitToViewZoom(800, 800, 1000, 1000)).toBe(1);
  });

  it('fits a wide image to the viewport width when width is limiting', () => {
    expect(computeFitToViewZoom(1200, 900, 3000, 2000)).toBeCloseTo(4 / 3, 5);
  });

  it('fits a tall image to the viewport height when height is limiting', () => {
    expect(computeFitToViewZoom(800, 600, 1000, 2000)).toBe(1);
  });

  it('fits a portrait image to the viewport width in a narrow viewport', () => {
    expect(computeFitToViewZoom(400, 1200, 2000, 3000)).toBeCloseTo(0.5, 5);
  });

  it('falls back to 1 for invalid dimensions', () => {
    expect(computeFitToViewZoom(0, 800, 1000, 1000)).toBe(1);
    expect(computeFitToViewZoom(800, 800, 0, 1000)).toBe(1);
  });

  it('clamps orbit zoom around fit and pixel-perfect scale', () => {
    const square = computeZoomLimits(800, 800, 1000, 1000);
    expect(square.fit).toBe(1);
    expect(square.minZoom).toBeCloseTo(0.5);
    expect(square.maxZoom).toBeGreaterThanOrEqual(8);

    const huge = computeZoomLimits(800, 800, 16384, 16384);
    expect(huge.maxZoom).toBeGreaterThan(huge.fit * 8);
  });

  it('formats zoom as percent of fit', () => {
    expect(formatZoomPercent(1, 1)).toBe(100);
    expect(formatZoomPercent(2, 1)).toBe(200);
    expect(formatZoomPercent(1, 0)).toBe(100);
  });
});
