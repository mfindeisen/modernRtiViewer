import { describe, it, expect } from 'vitest';
import {
  isTypingTarget,
  viewerKeyboardCommand,
  viewerShortcutGroups,
  VIEWER_ZOOM_FACTOR,
} from '@/lib/viewerKeyboard.js';

describe('viewerKeyboardCommand', () => {
  const opts = { annotationEnabled: true, maxRenderMode: 4 };

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
      maxRenderMode: 4,
    })).toBeNull();
    expect(viewerKeyboardCommand({ key: 's', ctrlKey: true } as KeyboardEvent, opts)).toBeNull();
    expect(viewerKeyboardCommand({ key: '6' } as KeyboardEvent, opts)).toBeNull();
    expect(viewerKeyboardCommand({ key: '6' } as KeyboardEvent, {
      annotationEnabled: false,
      maxRenderMode: 5,
    })).toEqual({ type: 'render-mode', mode: 5 });
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
  it('hides annotate unless enabled and uses 1–6 for neural modes', () => {
    const withoutAnnotate = viewerShortcutGroups({ annotationEnabled: false, maxRenderMode: 4 });
    expect(withoutAnnotate[0].items.map((item) => item.label)).toEqual([
      'Pan', 'Light', 'White balance',
    ]);
    expect(withoutAnnotate[1].items.some((item) => item.keys.includes('1–5'))).toBe(true);

    const neural = viewerShortcutGroups({ annotationEnabled: true, maxRenderMode: 5 });
    expect(neural[0].items.map((item) => item.label)).toContain('Annotate');
    expect(neural[1].items.some((item) => item.keys.includes('1–6'))).toBe(true);
  });
});
