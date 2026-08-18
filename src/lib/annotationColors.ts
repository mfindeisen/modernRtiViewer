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
  const trimmed = color.trim().toLowerCase();
  return ANNOTATION_COLOR_PRESETS.includes(trimmed as (typeof ANNOTATION_COLOR_PRESETS)[number])
    || /^#[0-9a-f]{6}$/.test(trimmed)
    ? trimmed
    : DEFAULT_ANNOTATION_COLOR;
}

export function isPresetAnnotationColor(color: string | null | undefined): boolean {
  if (!color) return false;
  return (ANNOTATION_COLOR_PRESETS as readonly string[]).includes(color.trim().toLowerCase());
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const normalized = normalizeAnnotationColor(hex);
  const n = parseInt(normalized.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c; g = x;
  } else if (h < 120) {
    r = x; g = c;
  } else if (h < 180) {
    g = c; b = x;
  } else if (h < 240) {
    g = x; b = c;
  } else if (h < 300) {
    r = x; b = c;
  } else {
    r = c; b = x;
  }
  const toHex = (channel: number) => Math.round((channel + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const HUE_SLIDER_GRADIENT = 'linear-gradient(to right, #ef4444 0%, #f59e0b 17%, #22c55e 33%, #14b8a6 50%, #3b82f6 67%, #8b5cf6 83%, #ec4899 91%, #ef4444 100%)';

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
