import { describe, it, expect } from 'vitest';
import type { Annotation } from '@/types/rti.js';
import type { CircleOverlayShape, OverlayProjectors, RectOverlayShape } from '@/types/annotations.js';
import {
  truncateLabel,
  labelAnchorForShape,
  buildOverlayShapes,
} from '@/lib/annotationOverlay.js';

describe('truncateLabel', () => {
  it('truncates long labels with ellipsis', () => {
    const long = 'a'.repeat(80);
    expect(truncateLabel(long)).toHaveLength(72);
    expect(truncateLabel(long).endsWith('…')).toBe(true);
    expect(truncateLabel('short')).toBe('short');
  });
});

describe('labelAnchorForShape', () => {
  it('anchors labels beside circles and above rectangles', () => {
    expect(labelAnchorForShape({
      kind: 'circle',
      key: 1,
      cx: 10,
      cy: 20,
      r: 5,
      color: '#fff',
      draft: false,
    } as CircleOverlayShape)).toEqual({
      x: 25,
      y: 24,
    });
    expect(labelAnchorForShape({
      kind: 'rect',
      key: 2,
      x: 30,
      y: 40,
      w: 10,
      h: 10,
      color: '#fff',
      draft: false,
    } as RectOverlayShape)).toEqual({
      x: 34,
      y: 32,
    });
  });
});

describe('buildOverlayShapes', () => {
  const project: OverlayProjectors = {
    normToScreen: (nx: number, ny: number) => ({ x: nx * 100, y: ny * 100 }),
    circleToScreen: (center: number[], radius: number) => ({
      cx: center[0] * 100,
      cy: center[1] * 100,
      r: radius * 100,
    }),
  };

  it('builds point, circle, and rectangle overlay shapes', () => {
    const shapes = buildOverlayShapes(
      [
        { id: '1', type: 'point', geometry: { position: [0.5, 0.5] }, color: '#fff', label: 'A' },
        { id: '2', type: 'circle', geometry: { center: [0.2, 0.3], radius: 0.1 }, color: '#f00' },
        { id: '3', type: 'rectangle', geometry: { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.5 }, color: '#0f0' },
      ] as Annotation[],
      null,
      '#f59e0b',
      project,
    );

    expect(shapes).toHaveLength(3);
    expect(shapes[0]).toMatchObject({ kind: 'point', annotationId: '1', label: 'A' });
    expect(shapes[1]).toMatchObject({ kind: 'circle', r: 10 });
    expect(shapes[2]).toMatchObject({ kind: 'rect', w: 30, h: 30 });
  });

  it('includes draft shape when drawing', () => {
    const shapes = buildOverlayShapes(
      [],
      { type: 'circle', geometry: { center: [0.5, 0.5], radius: 0.05 } },
      '#f59e0b',
      project,
    );
    expect(shapes).toHaveLength(1);
    expect(shapes[0].draft).toBe(true);
    expect(shapes[0].key).toBe('draft');
  });
});
