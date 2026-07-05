/** Reference light direction for neutral color sampling (straight from above). */
export const WB_REFERENCE_LIGHT = Object.freeze({ x: 0, y: 0, z: 1 });

const MIN_GAIN = 0.25;
const MAX_GAIN = 3.0;

/**
 * Compute per-channel gains so a sampled neutral patch becomes gray
 * while preserving its luminance.
 */
export function computeColorGainsFromSample(r: number, g: number, b: number) {
  const eps = 0.02;
  const sr = Math.max(r, eps);
  const sg = Math.max(g, eps);
  const sb = Math.max(b, eps);
  const lum = 0.299 * sr + 0.587 * sg + 0.114 * sb;
  return {
    r: clampGain(lum / sr),
    g: clampGain(lum / sg),
    b: clampGain(lum / sb),
  };
}

export function clampGain(value: number) {
  return Math.min(MAX_GAIN, Math.max(MIN_GAIN, value));
}

export const COLOR_GAIN_LIMITS = { min: MIN_GAIN, max: MAX_GAIN };

export const COLOR_CORRECTION_GLSL = `
uniform vec3 uColorGain;

vec3 applyColorGain(vec3 color) {
  return clamp(color * uColorGain, 0.0, 1.0);
}
`;
