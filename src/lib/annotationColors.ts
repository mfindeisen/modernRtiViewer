export const DEFAULT_ANNOTATION_COLOR = '#f59e0b';

/** Keep in sync with @rtidb/shared/annotationColors.ts */
export const ANNOTATION_COLOR_PRESETS = [
  '#f59e0b',
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#64748b',
] as const;

const STORAGE_KEY = 'rtiAnnotationColor';
const LEGACY_STORAGE_KEY = 'annotationColor';

export function normalizeAnnotationColor(color: string | null | undefined): string {
  if (!color) return DEFAULT_ANNOTATION_COLOR;
  const trimmed = color.trim();
  return ANNOTATION_COLOR_PRESETS.includes(trimmed as (typeof ANNOTATION_COLOR_PRESETS)[number])
    || /^#[0-9a-fA-F]{6}$/.test(trimmed)
    ? trimmed
    : DEFAULT_ANNOTATION_COLOR;
}

export function loadAnnotationColor(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_ANNOTATION_COLOR;
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    const normalized = normalizeAnnotationColor(stored);
    if (stored && !localStorage.getItem(STORAGE_KEY)) {
      saveAnnotationColor(normalized);
    }
    return normalized;
  } catch {
    return DEFAULT_ANNOTATION_COLOR;
  }
}

export function saveAnnotationColor(color: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, normalizeAnnotationColor(color));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
