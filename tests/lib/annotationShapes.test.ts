import { describe, it, expect } from 'vitest';
import {
  isValidDraft,
  isPointClick,
  normalizeAnnotationList,
} from '@/lib/annotationShapes.js';

describe('normalizeAnnotationList', () => {
  it('normalizes supported annotation entries', () => {
    const list = normalizeAnnotationList([
      { id: '1', type: 'circle', geometry: { center: [0.5, 0.5], radius: 0.1 } },
      { id: '2', type: 'invalid', geometry: {} },
    ]);

    expect(list).toHaveLength(1);
    expect((list[0].geometry as { center: number[] }).center).toEqual([0.5, 0.5]);
  });
});

describe('isValidDraft', () => {
  it('rejects tiny shapes', () => {
    expect(isValidDraft('circle', { center: [0, 0], radius: 0.001 })).toBe(false);
    expect(isValidDraft('circle', { center: [0, 0], radius: 0.05 })).toBe(true);
    expect(isValidDraft('rectangle', { x1: 0, y1: 0, x2: 0.001, y2: 0.001 })).toBe(false);
  });
});

describe('isPointClick', () => {
  it('detects click vs drag', () => {
    expect(isPointClick({ x: 0.5, y: 0.5 }, { x: 0.501, y: 0.501 })).toBe(true);
    expect(isPointClick({ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.6 })).toBe(false);
  });
});
