import { describe, it, expect } from 'vitest';
import {
  MAX_LIGHT_RADIUS,
  normalizedUvToLightDir,
  canvasPointerToNormalizedUv,
  compassPointerToNormalizedUv,
} from '@/lib/lightDirection.js';

describe('normalizedUvToLightDir', () => {
  it('maps center UV to straight-down light', () => {
    const dir = normalizedUvToLightDir(0.5, 0.5);
    expect(dir.x).toBeCloseTo(0, 5);
    expect(dir.y).toBeCloseTo(0, 5);
    expect(dir.z).toBeCloseTo(1, 5);
  });

  it('clamps grazing angles to max radius', () => {
    const dir = normalizedUvToLightDir(1, 0);
    const r2 = dir.x * dir.x + dir.y * dir.y;
    expect(r2).toBeLessThanOrEqual(MAX_LIGHT_RADIUS * MAX_LIGHT_RADIUS + 1e-6);
    expect(dir.z).toBeGreaterThan(0);
  });
});

describe('canvasPointerToNormalizedUv', () => {
  it('maps canvas center to 0.5/0.5', () => {
    const uv = canvasPointerToNormalizedUv(150, 100, {
      left: 0,
      top: 0,
      width: 300,
      height: 200,
    } as DOMRect);
    expect(uv.x).toBeCloseTo(0.5, 5);
    expect(uv.y).toBeCloseTo(0.5, 5);
  });
});

describe('compassPointerToNormalizedUv', () => {
  it('clamps compass coordinates to 0–1', () => {
    expect(compassPointerToNormalizedUv(-10, 120, {
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    } as DOMRect)).toEqual({ x: 0, y: 1 });

    expect(compassPointerToNormalizedUv(50, 50, {
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    } as DOMRect)).toEqual({ x: 0.5, y: 0.5 });
  });
});
