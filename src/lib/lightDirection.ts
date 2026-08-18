/** Convert UI coordinates to RTI light direction vectors. */

export const MAX_LIGHT_RADIUS = 0.95;

/** Frontal light: HUD shows 0.00 0.00, vector (0, 0, 1). */
export const FRONT_LIGHT = { x: 0, y: 0, z: 1 } as const;

/**
 * Map normalized UV coordinates (0–1) to a unit light direction.
 */
export function normalizedUvToLightDir(x: number, y: number) {
  let nx = (x * 2.0) - 1.0;
  let ny = -((y * 2.0) - 1.0);

  let r2 = nx * nx + ny * ny;
  const maxR2 = MAX_LIGHT_RADIUS * MAX_LIGHT_RADIUS;

  if (r2 > maxR2) {
    const len = Math.sqrt(r2);
    nx = (nx / len) * MAX_LIGHT_RADIUS;
    ny = (ny / len) * MAX_LIGHT_RADIUS;
    r2 = maxR2;
  }

  const nz = Math.sqrt(1.0 - r2);
  return { x: nx, y: ny, z: nz };
}

const DEFAULT_LIGHT_NUDGE = 0.06;

/** Move the light on the hemisphere by dx/dy in the XY plane, then renormalize. */
export function nudgeLightDir(
  light: { x: number; y: number; z: number },
  dx: number,
  dy: number,
  step = DEFAULT_LIGHT_NUDGE,
) {
  return clampLightXy(light.x + dx * step, light.y + dy * step);
}

function clampLightXy(nx: number, ny: number) {
  let r2 = nx * nx + ny * ny;
  const maxR2 = MAX_LIGHT_RADIUS * MAX_LIGHT_RADIUS;
  if (r2 > maxR2) {
    const len = Math.sqrt(r2);
    nx = (nx / len) * MAX_LIGHT_RADIUS;
    ny = (ny / len) * MAX_LIGHT_RADIUS;
    r2 = maxR2;
  }
  return { x: nx, y: ny, z: Math.sqrt(Math.max(0, 1.0 - r2)) };
}

/** Map a canvas pointer position to normalized UV inside the inscribed square. */
export function canvasPointerToNormalizedUv(clientX: number, clientY: number, rect: DOMRect) {
  const size = Math.min(rect.width, rect.height);
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  return {
    x: ((clientX - rect.left - centerX) / size) + 0.5,
    y: ((clientY - rect.top - centerY) / size) + 0.5,
  };
}

/** Map a compass pointer position to clamped normalized UV. */
export function compassPointerToNormalizedUv(clientX: number, clientY: number, rect: DOMRect) {
  let x = (clientX - rect.left) / rect.width;
  let y = (clientY - rect.top) / rect.height;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}
