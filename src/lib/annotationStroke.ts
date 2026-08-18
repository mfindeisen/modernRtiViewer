/** Keep in sync with @rtidb/shared/annotationStroke.ts */
export const DEFAULT_ANNOTATION_STROKE_WIDTH = 2;
export const MIN_ANNOTATION_STROKE_WIDTH = 1;
export const MAX_ANNOTATION_STROKE_WIDTH = 12;

const STORAGE_KEY = 'rtiAnnotationStrokeWidth';

export function normalizeAnnotationStrokeWidth(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_ANNOTATION_STROKE_WIDTH;
  return Math.min(
    MAX_ANNOTATION_STROKE_WIDTH,
    Math.max(MIN_ANNOTATION_STROKE_WIDTH, Math.round(n)),
  );
}

export function loadAnnotationStrokeWidth(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_ANNOTATION_STROKE_WIDTH;
  try {
    return normalizeAnnotationStrokeWidth(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_ANNOTATION_STROKE_WIDTH;
  }
}

export function saveAnnotationStrokeWidth(value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(normalizeAnnotationStrokeWidth(value)));
  } catch {
    // ignore storage errors
  }
}
