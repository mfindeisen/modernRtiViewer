import { describe, it, expect } from 'vitest';
import { oppositeLightDir, rotateLightDir, rakingLightDir, ensureOrbitRadius, FRONT_LIGHT } from '@/lib/lightDirection.js';
import { clampLightAnimSpeed, formatLightAnimSpeed } from '@/composables/useLightAnimation.js';

describe('light animation helpers', () => {
  it('returns an opposite light with the same elevation', () => {
    const opposite = oppositeLightDir({ x: 0.5, y: 0, z: Math.sqrt(0.75) });
    expect(opposite.x).toBeCloseTo(-0.5, 5);
    expect(opposite.y).toBeCloseTo(0, 5);
    expect(opposite.z).toBeCloseTo(Math.sqrt(0.75), 5);
  });

  it('rotates a raking light around Z', () => {
    const rotated = rotateLightDir({ x: 0.7, y: 0, z: Math.sqrt(1 - 0.49) }, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 5);
    expect(rotated.y).toBeCloseTo(0.7, 5);
  });

  it('sweeps raking light along X', () => {
    const left = rakingLightDir(-Math.PI / 2, 0);
    const right = rakingLightDir(Math.PI / 2, 0);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(0);
  });

  it('bumps a frontal light out to orbit radius', () => {
    const primed = ensureOrbitRadius(FRONT_LIGHT, 0.65);
    expect(Math.hypot(primed.x, primed.y)).toBeGreaterThanOrEqual(0.65);
  });

  it('clamps animation speed', () => {
    expect(clampLightAnimSpeed(1)).toBe(1);
    expect(clampLightAnimSpeed(0)).toBe(0.25);
    expect(clampLightAnimSpeed(12)).toBe(4);
    expect(formatLightAnimSpeed(1)).toBe('1×');
    expect(formatLightAnimSpeed(0.25)).toBe('0.25×');
  });
});
