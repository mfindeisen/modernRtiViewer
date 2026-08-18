import { describe, it, expect } from 'vitest';
import {
  isTypingTarget,
  viewerKeyboardCommand,
  viewerShortcutGroups,
  shortcutDigitToRenderMode,
  VIEWER_ZOOM_FACTOR,
} from '@/lib/viewerKeyboard.js';
import { RENDER_MODE_LATENT, RENDER_MODE_LINE_DRAWING } from '@/lib/rtiEnhancements.js';
import { DEFAULT_VIEWER_FEATURES } from '@/lib/viewerConfig.js';

describe('viewerKeyboardCommand', () => {
  const opts = { annotationEnabled: true, rtiType: 1 };

  it('maps interaction, render, fit, zoom, and export keys', () => {
    expect(viewerKeyboardCommand({ key: 'h' } as KeyboardEvent, opts)).toEqual({
      type: 'interaction-mode', mode: 'pan',
    });
    expect(viewerKeyboardCommand({ key: 'L' } as KeyboardEvent, opts)).toEqual({
      type: 'interaction-mode', mode: 'light',
    });
    expect(viewerKeyboardCommand({ key: 'a' } as KeyboardEvent, opts)).toEqual({
      type: 'interaction-mode', mode: 'annotate',
    });
    expect(viewerKeyboardCommand({ key: '1' } as KeyboardEvent, opts)).toEqual({
      type: 'render-mode', mode: 0,
    });
    expect(viewerKeyboardCommand({ key: 'f' } as KeyboardEvent, opts)).toEqual({ type: 'fit' });
    expect(viewerKeyboardCommand({ key: 'r' } as KeyboardEvent, opts)).toEqual({ type: 'reset-light' });
    expect(viewerKeyboardCommand({ key: '?' } as KeyboardEvent, opts)).toEqual({ type: 'shortcuts' });
    expect(viewerKeyboardCommand({ key: '/' } as KeyboardEvent, opts)).toEqual({ type: 'shortcuts' });
    expect(viewerKeyboardCommand({ key: 's' } as KeyboardEvent, opts)).toEqual({ type: 'export' });
    expect(viewerKeyboardCommand({ key: 'e' } as KeyboardEvent, opts)).toEqual({ type: 'enhancements' });
    expect(viewerKeyboardCommand({ key: 'm' } as KeyboardEvent, opts)).toEqual({ type: 'measure' });
    expect(viewerKeyboardCommand({ key: ' ' } as KeyboardEvent, opts)).toEqual({ type: 'toggle-animation' });
    expect(viewerKeyboardCommand({ key: '+' } as KeyboardEvent, opts)).toEqual({
      type: 'zoom', factor: VIEWER_ZOOM_FACTOR,
    });
    expect(viewerKeyboardCommand({ key: 'Escape' } as KeyboardEvent, opts)).toEqual({ type: 'escape' });
  });

  it('nudges light with arrow keys and a larger step with shift', () => {
    expect(viewerKeyboardCommand({ key: 'ArrowLeft' } as KeyboardEvent, opts)).toEqual({
      type: 'nudge-light', dx: -1, dy: 0,
    });
    expect(viewerKeyboardCommand({ key: 'ArrowUp', shiftKey: true } as KeyboardEvent, opts)).toEqual({
      type: 'nudge-light', dx: 0, dy: 3,
    });
  });

  it('ignores annotate when disabled and skips modifier chords', () => {
    expect(viewerKeyboardCommand({ key: 'a' } as KeyboardEvent, {
      annotationEnabled: false,
      rtiType: 1,
    })).toBeNull();
    expect(viewerKeyboardCommand({ key: 's', ctrlKey: true } as KeyboardEvent, opts)).toBeNull();
    expect(viewerKeyboardCommand({ key: '6' } as KeyboardEvent, {
      annotationEnabled: false,
      rtiType: 4,
    })).toBeNull();
    expect(viewerKeyboardCommand({ key: '6' } as KeyboardEvent, opts)).toEqual({
      type: 'render-mode', mode: RENDER_MODE_LINE_DRAWING,
    });
    expect(viewerKeyboardCommand({ key: '7' } as KeyboardEvent, {
      annotationEnabled: false,
      rtiType: 5,
    })).toEqual({ type: 'render-mode', mode: RENDER_MODE_LATENT });
  });
});

describe('shortcutDigitToRenderMode', () => {
  it('skips the internal packed-normal buffer', () => {
    expect(shortcutDigitToRenderMode(6, 1)).toBe(RENDER_MODE_LINE_DRAWING);
    expect(shortcutDigitToRenderMode(6, 5)).toBe(RENDER_MODE_LINE_DRAWING);
    expect(shortcutDigitToRenderMode(7, 5)).toBe(RENDER_MODE_LATENT);
    expect(shortcutDigitToRenderMode(7, 1)).toBeNull();
    expect(shortcutDigitToRenderMode(6, 4)).toBeNull();
    expect(shortcutDigitToRenderMode(6, 1, { ...DEFAULT_VIEWER_FEATURES, lineDrawing: false })).toBeNull();
  });
});

describe('isTypingTarget', () => {
  it('detects inputs and contenteditable elements', () => {
    const input = document.createElement('input');
    const div = document.createElement('div');
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(div)).toBe(false);
  });
});

describe('viewerShortcutGroups', () => {
  it('hides annotate unless enabled and lists extra keys for line drawing', () => {
    const withoutAnnotate = viewerShortcutGroups({ annotationEnabled: false, rtiType: 4 });
    expect(withoutAnnotate[0].items.map((item) => item.label)).toEqual([
      'Pan', 'Light', 'White balance', 'Measure', 'Enhancements', 'Light orbit',
    ]);
    expect(withoutAnnotate[1].items.some((item) => item.keys.includes('1–5'))).toBe(true);

    const hsh = viewerShortcutGroups({ annotationEnabled: false, rtiType: 1 });
    expect(hsh[1].items.some((item) => item.keys.includes('1–6'))).toBe(true);

    const neural = viewerShortcutGroups({ annotationEnabled: true, rtiType: 5 });
    expect(neural[0].items.map((item) => item.label)).toContain('Annotate');
    expect(neural[1].items.some((item) => item.keys.includes('1–7'))).toBe(true);

    const drawingOff = viewerShortcutGroups({
      annotationEnabled: false,
      rtiType: 1,
      features: { ...DEFAULT_VIEWER_FEATURES, lineDrawing: false },
    });
    expect(drawingOff[1].items.some((item) => item.keys.includes('1–5'))).toBe(true);
  });
});
