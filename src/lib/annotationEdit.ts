import type { OverlayShape } from '../types/annotations.js';

export type AnnotationEditHandle =
  | 'move'
  | 'radius'
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

const HANDLE_HIT = 10;

function near(ax: number, ay: number, bx: number, by: number, r = HANDLE_HIT) {
  return Math.hypot(ax - bx, ay - by) <= r;
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function clampImageNorm(point: { x: number; y: number }) {
  return { x: clamp01(point.x), y: clamp01(point.y) };
}

function safeAspect(imageAspect: number) {
  return imageAspect > 0 ? imageAspect : 1;
}

export function maxCircleRadiusAt(center: number[], imageAspect = 1) {
  const aspect = safeAspect(imageAspect);
  const cx = clamp01(center[0]);
  const cy = clamp01(center[1]);
  return Math.max(0, Math.min(cx, 1 - cx, cy * aspect, (1 - cy) * aspect));
}

function shiftDeltaToFit(min: number, max: number) {
  const span = max - min;
  if (span >= 1) return 0.5 - (min + max) / 2;
  if (min < 0) return -min;
  if (max > 1) return 1 - max;
  return 0;
}

export function clampAnnotationGeometry(
  type: string,
  geometry: Record<string, unknown>,
  imageAspect = 1,
): Record<string, unknown> {
  if (type === 'point') {
    const pos = geometry.position as number[];
    return { position: [clamp01(pos[0]), clamp01(pos[1])] };
  }

  if (type === 'circle') {
    const aspect = safeAspect(imageAspect);
    const center = geometry.center as number[];
    let radius = Math.max(0, Number(geometry.radius) || 0);
    let cx = center[0];
    let cy = center[1];
    const ry = radius / aspect;
    cx += shiftDeltaToFit(cx - radius, cx + radius);
    cy += shiftDeltaToFit(cy - ry, cy + ry);
    radius = Math.min(radius, maxCircleRadiusAt([cx, cy], aspect));
    return { center: [clamp01(cx), clamp01(cy)], radius };
  }

  const x1 = Number(geometry.x1);
  const y1 = Number(geometry.y1);
  const x2 = Number(geometry.x2);
  const y2 = Number(geometry.y2);
  const dx = shiftDeltaToFit(Math.min(x1, x2), Math.max(x1, x2));
  const dy = shiftDeltaToFit(Math.min(y1, y2), Math.max(y1, y2));
  return {
    x1: clamp01(x1 + dx),
    y1: clamp01(y1 + dy),
    x2: clamp01(x2 + dx),
    y2: clamp01(y2 + dy),
  };
}

export function rectHandlePositions(shape: Extract<OverlayShape, { kind: 'rect' }>) {
  const x1 = shape.x;
  const y1 = shape.y;
  const x2 = shape.x + shape.w;
  const y2 = shape.y + shape.h;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return {
    nw: { x: x1, y: y1 },
    n: { x: mx, y: y1 },
    ne: { x: x2, y: y1 },
    e: { x: x2, y: my },
    se: { x: x2, y: y2 },
    s: { x: mx, y: y2 },
    sw: { x: x1, y: y2 },
    w: { x: x1, y: my },
  };
}

export function hitTestOverlayShape(shape: OverlayShape, x: number, y: number): AnnotationEditHandle | null {
  if (shape.kind === 'point') {
    return near(x, y, shape.cx, shape.cy, Math.max(shape.r + 4, HANDLE_HIT)) ? 'move' : null;
  }

  if (shape.kind === 'circle') {
    const dist = Math.hypot(x - shape.cx, y - shape.cy);
    if (Math.abs(dist - shape.r) <= HANDLE_HIT) return 'radius';
    if (dist <= Math.max(shape.r, HANDLE_HIT)) return 'move';
    return null;
  }

  const handles = rectHandlePositions(shape);
  const order: AnnotationEditHandle[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'];
  for (const id of order) {
    const pos = handles[id as keyof typeof handles];
    if (near(x, y, pos.x, pos.y)) return id;
  }
  if (x >= shape.x - 4 && x <= shape.x + shape.w + 4 && y >= shape.y - 4 && y <= shape.y + shape.h + 4) {
    return 'move';
  }
  return null;
}

export function translateGeometry(
  type: string,
  geometry: Record<string, unknown>,
  dx: number,
  dy: number,
): Record<string, unknown> {
  if (type === 'point') {
    const pos = geometry.position as number[];
    return { position: [pos[0] + dx, pos[1] + dy] };
  }
  if (type === 'circle') {
    const center = geometry.center as number[];
    return { center: [center[0] + dx, center[1] + dy], radius: geometry.radius };
  }
  return {
    x1: Number(geometry.x1) + dx,
    y1: Number(geometry.y1) + dy,
    x2: Number(geometry.x2) + dx,
    y2: Number(geometry.y2) + dy,
  };
}

export function resizeCircleRadius(
  geometry: Record<string, unknown>,
  point: { x: number; y: number },
  imageAspect: number,
) {
  const center = geometry.center as number[];
  const dx = point.x - center[0];
  const dy = (point.y - center[1]) * imageAspect;
  return {
    center: geometry.center,
    radius: Math.max(0.005, Math.hypot(dx, dy)),
  };
}

export function resizeRectGeometry(
  geometry: Record<string, unknown>,
  handle: AnnotationEditHandle,
  point: { x: number; y: number },
) {
  const x1 = Number(geometry.x1);
  const y1 = Number(geometry.y1);
  const x2 = Number(geometry.x2);
  const y2 = Number(geometry.y2);
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  // Image-norm Y increases upward (world space), opposite of screen Y.
  // Visual north is max(y); visual south is min(y).
  const south = Math.min(y1, y2);
  const north = Math.max(y1, y2);
  let nextLeft = left;
  let nextRight = right;
  let nextSouth = south;
  let nextNorth = north;

  if (handle.includes('w')) nextLeft = clamp01(point.x);
  if (handle.includes('e')) nextRight = clamp01(point.x);
  if (handle.includes('n')) nextNorth = clamp01(point.y);
  if (handle.includes('s')) nextSouth = clamp01(point.y);

  return {
    x1: Math.min(nextLeft, nextRight),
    y1: Math.min(nextSouth, nextNorth),
    x2: Math.max(nextLeft, nextRight),
    y2: Math.max(nextSouth, nextNorth),
  };
}

export function applyAnnotationEdit(
  type: string,
  startGeometry: Record<string, unknown>,
  handle: AnnotationEditHandle,
  start: { x: number; y: number },
  current: { x: number; y: number },
  imageAspect = 1,
): Record<string, unknown> {
  if (handle === 'move') {
    return clampAnnotationGeometry(
      type,
      translateGeometry(type, startGeometry, current.x - start.x, current.y - start.y),
      imageAspect,
    );
  }
  if (type === 'circle' && handle === 'radius') {
    const resized = resizeCircleRadius(startGeometry, current, imageAspect);
    const maxR = maxCircleRadiusAt(resized.center as number[], imageAspect);
    return { center: resized.center, radius: Math.min(Number(resized.radius) || 0, maxR) };
  }
  if (type === 'rectangle') {
    return resizeRectGeometry(startGeometry, handle, clampImageNorm(current));
  }
  return startGeometry;
}
