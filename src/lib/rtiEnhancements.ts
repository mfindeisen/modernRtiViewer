/** Defaults and limits for CHI-style RTI enhancements. */

export const DEFAULT_DIFFUSE_GAIN = 1;
export const DEFAULT_UNSHARP_AMOUNT = 0;
export const DEFAULT_SPECULAR_INTENSITY = 0.8;
export const DEFAULT_DUAL_LINKED = true;

export const DIFFUSE_GAIN_LIMITS = { min: 1, max: 8, step: 0.1 };
export const UNSHARP_LIMITS = { min: 0, max: 4, step: 0.05 };
export const SPECULAR_INTENSITY_LIMITS = { min: 0, max: 2, step: 0.05 };
export const SPECULAR_EXPONENT_LIMITS = { min: 2, max: 50, step: 1 };

export const RENDER_MODE_LINE_DRAWING = 5;
export const RENDER_MODE_NORMAL_BUFFER = 6;
export const RENDER_MODE_LATENT = 7;
/** Hidden shader mode: RGB = packed world-space normals (n * 0.5 + 0.5). */
export const PACKED_NORMAL_RENDER_MODE = RENDER_MODE_NORMAL_BUFFER;

export const DEFAULT_RIDGE_THRESHOLD = 0.14;
export const DEFAULT_VALLEY_THRESHOLD = 0.1;
export const DEFAULT_LINE_WIDTH = 1.5;

export const RIDGE_THRESHOLD_LIMITS = { min: 0.02, max: 0.6, step: 0.01 };
export const VALLEY_THRESHOLD_LIMITS = { min: 0.02, max: 0.6, step: 0.01 };
export const LINE_WIDTH_LIMITS = { min: 1, max: 4, step: 0.1 };

export const RTI_TYPE_LABELS: Record<number, string> = {
  1: 'HSH',
  2: 'LRGB PTM',
  3: 'RGB PTM',
  4: 'Image',
  5: 'Neural RTI',
};

export function rtiTypeLabel(type: number | null | undefined) {
  if (type == null) return 'Unknown';
  return RTI_TYPE_LABELS[type] ?? `Type ${type}`;
}

/** Plain images have no photometric normals, so line drawing is hidden. */
export function supportsLineDrawing(type: number | null | undefined) {
  return type !== 4;
}

export function maxRenderModeForRtiType(type: number | null | undefined) {
  if (type === 4) return 4;
  if (type === 5) return RENDER_MODE_LATENT;
  return RENDER_MODE_LINE_DRAWING;
}

export function supportsMeshExport(type: number | null | undefined) {
  return type === 1 || type === 2 || type === 3 || type === 5;
}
