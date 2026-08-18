import { describe, it, expect } from 'vitest';
import type { Annotation } from '@/types/rti.js';
import type { CircleOverlayShape, OverlayProjectors, RectOverlayShape } from '@/types/annotations.js';
import {
  truncateLabel,
  layoutAnnotationLabel,
  ANNOTATION_LABEL_MAX_LINES,
  ANNOTATION_LABEL_MAX_WIDTH,
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

describe('layoutAnnotationLabel', () => {
  it('sizes the chip to the longest line, not the full character count', () => {
    const oneLine = layoutAnnotationLabel('scratch');
    const wrapped = layoutAnnotationLabel('scratch\nnear lower edge');
    expect(oneLine).not.toBeNull();
    expect(wrapped).not.toBeNull();
    expect(wrapped!.lines).toEqual(['scratch', 'near lower edge']);
    expect(wrapped!.width).toBe(layoutAnnotationLabel('near lower edge')!.width);
    expect(wrapped!.width).toBeLessThan(layoutAnnotationLabel('scratch near lower edge extra extra')!.width);
    expect(wrapped!.height).toBeGreaterThan(oneLine!.height);
    expect(oneLine!.width).toBeLessThan('scratch'.length * 10);
  });

  it('wraps a long single line and keeps explicit line breaks', () => {
    const longWord = 'cuneiform '.repeat(20).trim();
    const layout = layoutAnnotationLabel(`Top line\n${longWord}`);
    expect(layout).not.toBeNull();
    expect(layout!.lines[0]).toBe('Top line');
    expect(layout!.lines.length).toBeGreaterThan(2);
    expect(layout!.lines.length).toBeLessThanOrEqual(ANNOTATION_LABEL_MAX_LINES);
    expect(layout!.width).toBeLessThanOrEqual(ANNOTATION_LABEL_MAX_WIDTH + 1);
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
    expect(shapes[1]).toMatchObject({ kind: 'circle', r: 10, strokeWidth: 2 });
    expect(shapes[2]).toMatchObject({ kind: 'rect', w: 30, h: 30, strokeWidth: 2 });
  });

  it('stringifies numeric annotation ids for overlay matching', () => {
    const shapes = buildOverlayShapes(
      [{ id: 42, type: 'point', geometry: { position: [0.5, 0.5] } }] as Annotation[],
      null,
      '#f59e0b',
      project,
    );
    expect(shapes[0].annotationId).toBe('42');
  });

  it('uses a custom stroke width for saved and draft shapes', () => {
    const shapes = buildOverlayShapes(
      [{ id: '1', type: 'circle', geometry: { center: [0.2, 0.3], radius: 0.1 }, strokeWidth: 8 }] as Annotation[],
      { type: 'rectangle', geometry: { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.5 } },
      '#f59e0b',
      project,
      5,
    );
    expect(shapes[0].strokeWidth).toBe(8);
    expect(shapes[1].strokeWidth).toBe(5);
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
