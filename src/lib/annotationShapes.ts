/** Supported annotation geometry types and normalization. */

import type { Annotation } from '../types/rti.js';

export const ANNOTATION_TYPES = ['point', 'circle', 'rectangle'] as const;
export type AnnotationShapeId = typeof ANNOTATION_TYPES[number];

export const ANNOTATION_SHAPE_OPTIONS = [
  { id: 'point', label: 'Point', hint: 'Click to mark a spot' },
  { id: 'circle', label: 'Circle', hint: 'Drag to draw a circle' },
  { id: 'rectangle', label: 'Rectangle', hint: 'Drag to draw a box' },
] as const;

export const ANNOTATION_TYPE_LABELS = {
  point: 'Point',
  circle: 'Circle',
  rectangle: 'Rectangle',
};

const MIN_CIRCLE_RADIUS = 0.005;
const MIN_RECT_SIZE = 0.005;
const MIN_POINT_MOVE = 0.012;

export function parseGeometryRaw(geometry: unknown) {
  if (!geometry) return null;
  if (typeof geometry === 'string') {
    try {
      return JSON.parse(geometry) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return geometry as Record<string, unknown>;
}

export function normalizeAnnotationGeometry(type: string, geometry: unknown) {
  const g = parseGeometryRaw(geometry);
  if (!g) return null;

  if (type === 'point') {
    const pos = (g.position ?? g.center) as number[] | { x: number; y: number } | undefined;
    if (!pos) return null;
    const arr = Array.isArray(pos) ? pos : [pos.x, pos.y];
    return { position: [Number(arr[0]), Number(arr[1])] };
  }

  if (type === 'circle') {
    if (!g.center) return null;
    const center = Array.isArray(g.center) ? g.center : [(g.center as { x: number }).x, (g.center as { y: number }).y];
    return {
      center: [Number(center[0]), Number(center[1])],
      radius: Number(g.radius) || 0,
    };
  }

  if (type === 'rectangle') {
    if (g.x1 != null && g.y1 != null && g.x2 != null && g.y2 != null) {
      return {
        x1: Number(g.x1),
        y1: Number(g.y1),
        x2: Number(g.x2),
        y2: Number(g.y2),
      };
    }
    if (g.origin && g.size) {
      const o = Array.isArray(g.origin) ? g.origin : [(g.origin as { x: number }).x, (g.origin as { y: number }).y];
      const s = Array.isArray(g.size) ? g.size : [(g.size as { x: number }).x, (g.size as { y: number }).y];
      return {
        x1: Number(o[0]),
        y1: Number(o[1]),
        x2: Number(o[0]) + Number(s[0]),
        y2: Number(o[1]) + Number(s[1]),
      };
    }
    return null;
  }

  return null;
}

export function normalizeAnnotationEntry(ann: Annotation) {
  const type = ANNOTATION_TYPES.includes(ann.type as AnnotationShapeId) ? ann.type : 'circle';
  const geometry = normalizeAnnotationGeometry(type, ann.geometry);
  if (!geometry) return null;
  return { ...ann, type, geometry };
}

export function normalizeAnnotationList(annotations: Annotation[]): Annotation[] {
  if (!Array.isArray(annotations)) return [];
  return annotations
    .map(normalizeAnnotationEntry)
    .filter((ann): ann is NonNullable<ReturnType<typeof normalizeAnnotationEntry>> => ann !== null);
}

export function isValidDraft(type: string, geometry: Record<string, unknown>) {
  if (!geometry) return false;
  if (type === 'point') return true;
  if (type === 'circle') return (Number(geometry.radius) || 0) >= MIN_CIRCLE_RADIUS;
  if (type === 'rectangle') {
    const w = Math.abs(Number(geometry.x2) - Number(geometry.x1));
    const h = Math.abs(Number(geometry.y2) - Number(geometry.y1));
    return w >= MIN_RECT_SIZE && h >= MIN_RECT_SIZE;
  }
  return false;
}

export function isPointClick(start: { x: number; y: number }, end: { x: number; y: number }) {
  if (!start || !end) return false;
  return Math.hypot(end.x - start.x, end.y - start.y) < MIN_POINT_MOVE;
}

export { MIN_CIRCLE_RADIUS, MIN_RECT_SIZE };
