import type { Annotation } from './rti.js';

export interface OverlayShapeBase {
  key: string | number;
  color: string;
  draft: boolean;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelWidth?: number;
  annotationId?: string;
  ann?: Annotation;
}

export interface PointOverlayShape extends OverlayShapeBase {
  kind: 'point';
  cx: number;
  cy: number;
  r: number;
}

export interface CircleOverlayShape extends OverlayShapeBase {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface RectOverlayShape extends OverlayShapeBase {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
}

export type OverlayShape = PointOverlayShape | CircleOverlayShape | RectOverlayShape;

export interface OverlayProjectors {
  normToScreen: (nx: number, ny: number) => { x: number; y: number } | null;
  circleToScreen: (center: number[], radius: number) => { cx: number; cy: number; r: number } | null;
}

interface ShapeMeta {
  color?: string;
  draft?: boolean;
  key?: string | number;
  label?: string;
  annotationId?: string;
  ann?: Annotation;
}

export function truncateLabel(text: string, max = 72) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function estimateLabelWidth(text: string) {
  return Math.min(Math.max(text.length * 6.2, 40), 280);
}

export function labelAnchorForShape(shape: OverlayShape) {
  if (shape.kind === 'rect') {
    return { x: shape.x + 4, y: shape.y - 8 };
  }
  return { x: shape.cx + shape.r + 10, y: shape.cy + 4 };
}

export function geometryToOverlayShape(
  type: string,
  geometry: Record<string, unknown>,
  meta: ShapeMeta,
  project: OverlayProjectors,
): OverlayShape | null {
  const color = meta.color || '#f59e0b';
  const draft = meta.draft || false;
  const key = meta.key ?? Math.random();
  const label = draft ? '' : truncateLabel(meta.label || '');
  let shape: OverlayShape | null = null;

  if (type === 'point') {
    const position = geometry.position as number[];
    const screen = project.normToScreen(position[0], position[1]);
    if (!screen) return null;
    shape = { kind: 'point', key, cx: screen.x, cy: screen.y, r: 6, color, draft };
  } else if (type === 'circle') {
    if (!geometry?.center) return null;
    const center = geometry.center as number[];
    const screen = project.circleToScreen(center, (geometry.radius as number) || 0);
    if (!screen) return null;
    shape = {
      kind: 'circle',
      key,
      cx: screen.cx,
      cy: screen.cy,
      r: Math.max(screen.r, 2),
      color,
      draft,
    };
  } else if (type === 'rectangle') {
    const s1 = project.normToScreen(geometry.x1 as number, geometry.y1 as number);
    const s2 = project.normToScreen(geometry.x2 as number, geometry.y2 as number);
    if (!s1 || !s2) return null;
    shape = {
      kind: 'rect',
      key,
      x: Math.min(s1.x, s2.x),
      y: Math.min(s1.y, s2.y),
      w: Math.max(Math.abs(s2.x - s1.x), 2),
      h: Math.max(Math.abs(s2.y - s1.y), 2),
      color,
      draft,
    };
  }

  if (!shape) return null;

  if (!draft && meta.annotationId) {
    shape.annotationId = meta.annotationId;
    shape.ann = meta.ann;
  }
  if (label) {
    const anchor = labelAnchorForShape(shape);
    shape.label = label;
    shape.labelX = anchor.x;
    shape.labelY = anchor.y;
    shape.labelWidth = estimateLabelWidth(label);
  }

  return shape;
}

export function buildOverlayShapes(
  annotations: Annotation[],
  draft: { type: string; geometry: Record<string, unknown> } | null,
  draftColor: string,
  project: OverlayProjectors,
): OverlayShape[] {
  const shapes: OverlayShape[] = [];

  for (const ann of annotations) {
    const shape = geometryToOverlayShape(
      ann.type || 'circle',
      ann.geometry,
      {
        key: ann.id,
        annotationId: ann.id,
        ann,
        color: ann.color,
        label: ann.label as string | undefined,
      },
      project,
    );
    if (shape) shapes.push(shape);
  }

  if (draft) {
    const draftShape = geometryToOverlayShape(
      draft.type,
      draft.geometry,
      { key: 'draft', color: draftColor, draft: true },
      project,
    );
    if (draftShape) shapes.push(draftShape);
  }

  return shapes;
}
