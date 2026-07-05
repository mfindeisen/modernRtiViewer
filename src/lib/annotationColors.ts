export const ANNOTATION_COLOR_PRESETS = [
  '#f59e0b',
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#f97316',
  '#14b8a6',
];

export const DEFAULT_ANNOTATION_COLOR = '#f59e0b';

const STORAGE_KEY = 'annotationColor';

export function loadAnnotationColor() {
  if (typeof localStorage === 'undefined') return DEFAULT_ANNOTATION_COLOR;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ANNOTATION_COLOR_PRESETS.includes(stored)) return stored;
  return DEFAULT_ANNOTATION_COLOR;
}

export function saveAnnotationColor(color: string) {
  if (typeof localStorage === 'undefined') return;
  if (ANNOTATION_COLOR_PRESETS.includes(color)) {
    localStorage.setItem(STORAGE_KEY, color);
  }
}
