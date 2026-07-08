import { describe, it, expect } from 'vitest';
import { computeFitToViewZoom } from '@/lib/cameraFit.js';

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
});
