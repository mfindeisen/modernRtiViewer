import type { ViewerMode } from '../composables/types.js';

export type ViewerKeyboardCommand =
  | { type: 'interaction-mode'; mode: ViewerMode }
  | { type: 'render-mode'; mode: number }
  | { type: 'nudge-light'; dx: number; dy: number }
  | { type: 'zoom'; factor: number }
  | { type: 'fit' }
  | { type: 'export' }
  | { type: 'escape' };

export const VIEWER_ZOOM_FACTOR = 1.15;
const LIGHT_SHIFT_MULTIPLIER = 3;

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function viewerKeyboardCommand(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'>,
  options: { annotationEnabled: boolean; maxRenderMode: number },
): ViewerKeyboardCommand | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const nudge = event.shiftKey ? LIGHT_SHIFT_MULTIPLIER : 1;

  if (key === 'Escape') return { type: 'escape' };
  if (key === 'h') return { type: 'interaction-mode', mode: 'pan' };
  if (key === 'l') return { type: 'interaction-mode', mode: 'light' };
  if (key === 'w') return { type: 'interaction-mode', mode: 'whitebalance' };
  if (key === 'a' && options.annotationEnabled) return { type: 'interaction-mode', mode: 'annotate' };
  if (key === 'f' || key === '0') return { type: 'fit' };
  if (key === 's') return { type: 'export' };
  if (key === '+' || key === '=' || event.code === 'NumpadAdd') return { type: 'zoom', factor: VIEWER_ZOOM_FACTOR };
  if (key === '-' || key === '_' || event.code === 'NumpadSubtract') return { type: 'zoom', factor: 1 / VIEWER_ZOOM_FACTOR };

  if (key === 'ArrowLeft') return { type: 'nudge-light', dx: -nudge, dy: 0 };
  if (key === 'ArrowRight') return { type: 'nudge-light', dx: nudge, dy: 0 };
  if (key === 'ArrowUp') return { type: 'nudge-light', dx: 0, dy: nudge };
  if (key === 'ArrowDown') return { type: 'nudge-light', dx: 0, dy: -nudge };

  const digit = digitFromKey(event);
  if (digit !== null && digit >= 1 && digit <= options.maxRenderMode + 1) {
    return { type: 'render-mode', mode: digit - 1 };
  }

  return null;
}

function digitFromKey(event: Pick<KeyboardEvent, 'key' | 'code'>) {
  if (/^[0-9]$/.test(event.key)) return Number(event.key);
  const match = /^Digit([0-9])$/.exec(event.code) || /^Numpad([0-9])$/.exec(event.code);
  return match ? Number(match[1]) : null;
}
