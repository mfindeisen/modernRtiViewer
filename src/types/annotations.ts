import type { Annotation } from './rti.js';
import { normalizeAnnotationStrokeWidth } from '../lib/annotationStroke.js';

export interface OverlayShapeBase {
  key: string | number;
  color: string;
  strokeWidth: number;
  draft: boolean;
  label?: string;
  labelLines?: string[];
  labelX?: number;
  labelY?: number;
  labelWidth?: number;
  labelHeight?: number;
  annotationId?: string | number;
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
  strokeWidth?: number;
  draft?: boolean;
  key?: string | number;
  label?: string;
  annotationId?: string | number;
  ann?: Annotation;
}

export const ANNOTATION_LABEL_FONT_SIZE = 11;
export const ANNOTATION_LABEL_LINE_HEIGHT = 14;
export const ANNOTATION_LABEL_PAD_X = 6;
export const ANNOTATION_LABEL_PAD_Y = 4;
/** Offset from labelY to the top of the chip (keeps a single line visually centered on the shape). */
export const ANNOTATION_LABEL_BOX_OFFSET_Y = 16;
export const ANNOTATION_LABEL_MAX_WIDTH = 200;
export const ANNOTATION_LABEL_MAX_LINES = 5;
const ANNOTATION_LABEL_FALLBACK_CHAR_WIDTH = 6;

let measureContext: CanvasRenderingContext2D | null = null;
let measureContextFailed = false;

function getMeasureContext() {
  if (measureContextFailed) return null;
  if (measureContext) return measureContext;
  if (typeof document === 'undefined') {
    measureContextFailed = true;
    return null;
  }
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      measureContextFailed = true;
      return null;
    }
    ctx.font = `500 ${ANNOTATION_LABEL_FONT_SIZE}px system-ui, sans-serif`;
    measureContext = ctx;
    return ctx;
  } catch {
    measureContextFailed = true;
    return null;
  }
}

export function measureAnnotationLabel(text: string) {
  if (!text) return 0;
  const measured = getMeasureContext()?.measureText(text).width ?? 0;
  if (measured > 0) return measured;
  return text.length * ANNOTATION_LABEL_FALLBACK_CHAR_WIDTH;
}

export function truncateLabel(text: string, max = 72) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function hardBreakWord(word: string, maxWidth: number) {
  const lines: string[] = [];
  let current = '';
  for (const char of word) {
    const next = current + char;
    if (current && measureAnnotationLabel(next) > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function wrapLabelLine(line: string, maxWidth: number) {
  if (measureAnnotationLabel(line) <= maxWidth) return [line];
  const words = line.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (measureAnnotationLabel(next) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (measureAnnotationLabel(word) <= maxWidth) {
      current = word;
    } else {
      const broken = hardBreakWord(word, maxWidth);
      lines.push(...broken.slice(0, -1));
      current = broken[broken.length - 1] || '';
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface AnnotationLabelLayout {
  lines: string[];
  width: number;
  height: number;
}

export function layoutAnnotationLabel(raw: string): AnnotationLabelLayout | null {
  const text = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!text) return null;

  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    lines.push(...wrapLabelLine(paragraph, ANNOTATION_LABEL_MAX_WIDTH));
  }

  let display = lines;
  if (display.length > ANNOTATION_LABEL_MAX_LINES) {
    display = display.slice(0, ANNOTATION_LABEL_MAX_LINES);
    const last = display[display.length - 1] ?? '';
    display[display.length - 1] = last.endsWith('…') ? last : `${last}…`;
  }

  const width = Math.ceil(Math.max(0, ...display.map((line) => measureAnnotationLabel(line || ' '))));
  const height = ANNOTATION_LABEL_PAD_Y * 2 + display.length * ANNOTATION_LABEL_LINE_HEIGHT;
  return { lines: display, width, height };
}

export function estimateLabelWidth(text: string) {
  return layoutAnnotationLabel(text)?.width ?? 0;
}

export function annotationLabelLines(shape: OverlayShape) {
  if (shape.labelLines?.length) return shape.labelLines;
  if (shape.label) return shape.label.split('\n');
  return [];
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
  const strokeWidth = normalizeAnnotationStrokeWidth(meta.strokeWidth);
  const draft = meta.draft || false;
  const key = meta.key ?? Math.random();
  const labelLayout = draft ? null : layoutAnnotationLabel(meta.label || '');
  let shape: OverlayShape | null = null;

  if (type === 'point') {
    const position = geometry.position as number[];
    const screen = project.normToScreen(position[0], position[1]);
    if (!screen) return null;
    shape = { kind: 'point', key, cx: screen.x, cy: screen.y, r: 6, color, strokeWidth, draft };
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
      strokeWidth,
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
      strokeWidth,
      draft,
    };
  }

  if (!shape) return null;

  if (!draft && meta.annotationId != null && meta.annotationId !== '') {
    shape.annotationId = String(meta.annotationId);
    shape.ann = meta.ann;
  }
  if (labelLayout) {
    const anchor = labelAnchorForShape(shape);
    shape.label = labelLayout.lines.join('\n');
    shape.labelLines = labelLayout.lines;
    shape.labelX = anchor.x;
    shape.labelY = anchor.y;
    shape.labelWidth = labelLayout.width;
    shape.labelHeight = labelLayout.height;
  }

  return shape;
}

export function buildOverlayShapes(
  annotations: Annotation[],
  draft: { type: string; geometry: Record<string, unknown> } | null,
  draftColor: string,
  project: OverlayProjectors,
  draftStrokeWidth?: number,
): OverlayShape[] {
  const shapes: OverlayShape[] = [];

  for (const ann of annotations) {
    const shape = geometryToOverlayShape(
      ann.type || 'circle',
      ann.geometry,
      {
        key: ann.id,
        annotationId: ann.id == null ? undefined : String(ann.id),
        ann,
        color: ann.color,
        strokeWidth: typeof ann.strokeWidth === 'number' ? ann.strokeWidth : undefined,
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
      { key: 'draft', color: draftColor, strokeWidth: draftStrokeWidth, draft: true },
      project,
    );
    if (draftShape) shapes.push(draftShape);
  }

  return shapes;
}
