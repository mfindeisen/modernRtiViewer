import { describe, it, expect } from 'vitest';
import {
  buildShareUrl,
  isWhiteBalanceActive,
  parseViewHash,
} from '@/lib/viewerUrl.js';

describe('parseViewHash', () => {
  it('returns empty object for empty hash', () => {
    expect(parseViewHash('')).toEqual({});
    expect(parseViewHash('#')).toEqual({});
  });

  it('parses light direction, render mode, camera, and white balance', () => {
    const hash = 'lx=0.5000&ly=0.2500&mode=2&cx=10.5&cy=-3.2&z=1.5&wbR=1.1&wbG=0.9&wbB=1.0';
    const parsed = parseViewHash(hash);

    expect(parsed.lightDir).toEqual({
      x: 0.5,
      y: 0.25,
      z: expect.closeTo(Math.sqrt(1 - 0.5 ** 2 - 0.25 ** 2)),
    });
    expect(parsed.renderMode).toBe(2);
    expect(parsed.camera).toEqual({ cx: 10.5, cy: -3.2, z: 1.5 });
    expect(parsed.colorGain).toEqual({ r: 1.1, g: 0.9, b: 1 });
  });
});

describe('buildShareUrl', () => {
  it('encodes camera, light, and render mode', () => {
    const url = buildShareUrl('https://example.com/view', {
      camera: { cx: 1.23456, cy: 2.34567, zoom: 3.45678 },
      lightDir: { x: 0.1, y: 0.2, z: 0.97 },
      renderMode: 1,
      colorGain: { r: 1, g: 1, b: 1 },
    });

    expect(url).toMatch(/^https:\/\/example\.com\/view#/);
    const parsed = parseViewHash(url.split('#')[1]);
    expect(parsed.camera?.cx).toBeCloseTo(1.2346, 3);
    expect(parsed.camera?.cy).toBeCloseTo(2.3457, 3);
    expect(parsed.camera?.z).toBeCloseTo(3.4568, 3);
    expect(parsed.lightDir?.x).toBeCloseTo(0.1, 3);
    expect(parsed.renderMode).toBe(1);
    expect(parsed.colorGain).toBeUndefined();
  });

  it('includes white balance params when active', () => {
    const url = buildShareUrl('https://example.com', {
      camera: { cx: 0, cy: 0, zoom: 1 },
      lightDir: { x: 0, y: 0, z: 1 },
      renderMode: 0,
      colorGain: { r: 1.2, g: 0.8, b: 1 },
    });

    const parsed = parseViewHash(url.split('#')[1]);
    expect(parsed.colorGain).toEqual({ r: 1.2, g: 0.8, b: 1 });
  });
});

describe('isWhiteBalanceActive', () => {
  it('detects neutral and adjusted gains', () => {
    expect(isWhiteBalanceActive({ r: 1, g: 1, b: 1 })).toBe(false);
    expect(isWhiteBalanceActive({ r: 1.05, g: 1, b: 1 })).toBe(true);
    expect(isWhiteBalanceActive(null)).toBe(false);
  });
});
