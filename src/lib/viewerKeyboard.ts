import type { ViewerMode } from '../composables/types.js';
import {
  RENDER_MODE_LATENT,
  RENDER_MODE_LINE_DRAWING,
  supportsLineDrawing,
} from './rtiEnhancements.js';
import { DEFAULT_VIEWER_FEATURES, type ViewerFeatures } from './viewerConfig.js';

export type ViewerKeyboardCommand =
  | { type: 'interaction-mode'; mode: ViewerMode }
  | { type: 'render-mode'; mode: number }
  | { type: 'nudge-light'; dx: number; dy: number }
  | { type: 'zoom'; factor: number }
  | { type: 'fit' }
  | { type: 'reset-light' }
  | { type: 'export' }
  | { type: 'shortcuts' }
  | { type: 'enhancements' }
  | { type: 'toggle-animation' }
  | { type: 'measure' }
  | { type: 'escape' };

export interface ViewerShortcutItem {
  keys: string[];
  label: string;
}

export interface ViewerShortcutGroup {
  title: string;
  items: ViewerShortcutItem[];
}

export interface ViewerKeyboardOptions {
  annotationEnabled: boolean;
  rtiType?: number | null;
  features?: ViewerFeatures;
}

function featuresOf(options: ViewerKeyboardOptions): ViewerFeatures {
  return options.features ?? DEFAULT_VIEWER_FEATURES;
}

export function shortcutDigitToRenderMode(
  digit: number,
  rtiType?: number | null,
  features: ViewerFeatures = DEFAULT_VIEWER_FEATURES,
) {
  if (digit >= 1 && digit <= 5) {
    const mode = digit - 1;
    if (mode === 4 && !features.dualLight) return null;
    return mode;
  }
  if (digit === 6 && features.lineDrawing && supportsLineDrawing(rtiType)) return RENDER_MODE_LINE_DRAWING;
  if (digit === 7 && features.latentMap && rtiType === 5) return RENDER_MODE_LATENT;
  return null;
}

export function renderModeShortcutKeys(
  rtiType?: number | null,
  features: ViewerFeatures = DEFAULT_VIEWER_FEATURES,
) {
  if (rtiType === 5 && features.latentMap) return features.lineDrawing ? '1–7' : '1–5, 7';
  if (features.lineDrawing && supportsLineDrawing(rtiType)) return '1–6';
  return '1–5';
}

export function viewerShortcutGroups(options: ViewerKeyboardOptions): ViewerShortcutGroup[] {
  const features = featuresOf(options);
  const tools: ViewerShortcutItem[] = [
    { keys: ['H'], label: 'Pan' },
    { keys: ['L'], label: 'Light' },
  ];
  if (features.whiteBalance) tools.push({ keys: ['W'], label: 'White balance' });
  if (features.measure) tools.push({ keys: ['M'], label: 'Measure' });
  if (features.enhancements) tools.push({ keys: ['E'], label: 'Enhancements' });
  if (features.lightOrbit) tools.push({ keys: ['Space'], label: 'Light orbit' });
  if (options.annotationEnabled && features.annotations) {
    tools.push({ keys: ['A'], label: 'Annotate' });
  }

  const viewItems: ViewerShortcutItem[] = [
    { keys: ['F'], label: 'Fit' },
    { keys: ['R'], label: 'Center light' },
    { keys: ['+', '−'], label: 'Zoom' },
    { keys: [renderModeShortcutKeys(options.rtiType, features)], label: 'Render mode' },
  ];
  if (features.export) viewItems.push({ keys: ['S'], label: 'Snapshot' });

  return [
    { title: 'Tools', items: tools },
    {
      title: 'View',
      items: viewItems,
    },
    {
      title: 'Light',
      items: [
        { keys: ['←', '↑', '↓', '→'], label: 'Move light' },
        { keys: ['Shift', '←'], label: 'Bigger move' },
      ],
    },
  ];
}

export const VIEWER_ZOOM_FACTOR = 1.15;
const LIGHT_SHIFT_MULTIPLIER = 3;

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function viewerKeyboardCommand(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'>,
  options: ViewerKeyboardOptions,
): ViewerKeyboardCommand | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const nudge = event.shiftKey ? LIGHT_SHIFT_MULTIPLIER : 1;
  const features = featuresOf(options);

  if (key === 'Escape') return { type: 'escape' };
  if (key === '?' || key === '/') return { type: 'shortcuts' };
  if (key === 'h') return { type: 'interaction-mode', mode: 'pan' };
  if (key === 'l') return { type: 'interaction-mode', mode: 'light' };
  if (key === 'w' && features.whiteBalance) return { type: 'interaction-mode', mode: 'whitebalance' };
  if (key === 'm' && features.measure) return { type: 'measure' };
  if (key === 'e' && features.enhancements) return { type: 'enhancements' };
  if ((key === ' ' || key === 'Spacebar') && features.lightOrbit) return { type: 'toggle-animation' };
  if (key === 'a' && options.annotationEnabled && features.annotations) {
    return { type: 'interaction-mode', mode: 'annotate' };
  }
  if (key === 'f' || key === '0') return { type: 'fit' };
  if (key === 'r') return { type: 'reset-light' };
  if (key === 's' && features.export) return { type: 'export' };
  if (key === '+' || key === '=' || event.code === 'NumpadAdd') return { type: 'zoom', factor: VIEWER_ZOOM_FACTOR };
  if (key === '-' || key === '_' || event.code === 'NumpadSubtract') return { type: 'zoom', factor: 1 / VIEWER_ZOOM_FACTOR };

  if (key === 'ArrowLeft') return { type: 'nudge-light', dx: -nudge, dy: 0 };
  if (key === 'ArrowRight') return { type: 'nudge-light', dx: nudge, dy: 0 };
  if (key === 'ArrowUp') return { type: 'nudge-light', dx: 0, dy: nudge };
  if (key === 'ArrowDown') return { type: 'nudge-light', dx: 0, dy: -nudge };

  const digit = digitFromKey(event);
  if (digit !== null) {
    const mode = shortcutDigitToRenderMode(digit, options.rtiType, features);
    if (mode !== null) return { type: 'render-mode', mode };
  }

  return null;
}

function digitFromKey(event: Pick<KeyboardEvent, 'key' | 'code'>) {
  if (/^[0-9]$/.test(event.key)) return Number(event.key);
  const match = /^Digit([0-9])$/.exec(event.code) || /^Numpad([0-9])$/.exec(event.code);
  return match ? Number(match[1]) : null;
}
