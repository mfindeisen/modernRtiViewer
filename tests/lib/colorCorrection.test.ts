import { describe, it, expect } from 'vitest';
import { computeColorGainsFromSample, clampGain } from '@/lib/colorCorrection.js';

describe('computeColorGainsFromSample', () => {
  it('neutralizes a warm patch toward gray', () => {
    const gains = computeColorGainsFromSample(0.8, 0.6, 0.6);
    expect(gains.r).toBeLessThan(1);
    expect(gains.g).toBeGreaterThan(1);
    expect(gains.b).toBeGreaterThan(1);
  });

  it('returns unit gains for neutral gray', () => {
    const gains = computeColorGainsFromSample(0.5, 0.5, 0.5);
    expect(gains.r).toBeCloseTo(1, 2);
    expect(gains.g).toBeCloseTo(1, 2);
    expect(gains.b).toBeCloseTo(1, 2);
  });
});

describe('clampGain', () => {
  it('clamps extreme values', () => {
    expect(clampGain(0.01)).toBe(0.25);
    expect(clampGain(10)).toBe(3);
    expect(clampGain(1.5)).toBe(1.5);
  });
});
