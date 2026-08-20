/** Matches Tailwind `lg` / existing mobile sidebar breakpoint. */
export const NARROW_VIEWPORT_QUERY = '(max-width: 1023px)';

/**
 * Height of the mobile chrome dock (compass row), excluding safe-area.
 * Keep in sync with the dock padding + 4.5rem compass in RtiViewer.
 */
export const MOBILE_CHROME_DOCK = '5.5rem';

export const TAP_MAX_MOVE_PX = 10;
export const TAP_MAX_DURATION_MS = 400;

export type TapTracker = {
  pointerId: number;
  x: number;
  y: number;
  at: number;
};

export function startTap(event: PointerEvent): TapTracker {
  return {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    at: event.timeStamp,
  };
}

export function isTap(
  start: TapTracker | null,
  event: PointerEvent,
  maxMove = TAP_MAX_MOVE_PX,
  maxDuration = TAP_MAX_DURATION_MS,
): boolean {
  if (!start || start.pointerId !== event.pointerId) return false;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  const dt = event.timeStamp - start.at;
  return Math.hypot(dx, dy) <= maxMove && dt <= maxDuration;
}
