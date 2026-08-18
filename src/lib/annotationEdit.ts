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
  let x1 = Number(geometry.x1);
  let y1 = Number(geometry.y1);
  let x2 = Number(geometry.x2);
  let y2 = Number(geometry.y2);
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  let nextLeft = left;
  let nextRight = right;
  let nextTop = top;
  let nextBottom = bottom;

  if (handle.includes('w')) nextLeft = point.x;
  if (handle.includes('e')) nextRight = point.x;
  if (handle.includes('n')) nextTop = point.y;
  if (handle.includes('s')) nextBottom = point.y;

  return {
    x1: Math.min(nextLeft, nextRight),
    y1: Math.min(nextTop, nextBottom),
    x2: Math.max(nextLeft, nextRight),
    y2: Math.max(nextTop, nextBottom),
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
    return translateGeometry(type, startGeometry, current.x - start.x, current.y - start.y);
  }
  if (type === 'circle' && handle === 'radius') {
    return resizeCircleRadius(startGeometry, current, imageAspect);
  }
  if (type === 'rectangle') {
    return resizeRectGeometry(startGeometry, handle, current);
  }
  return startGeometry;
}
