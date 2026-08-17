import { describe, it, expect } from 'vitest';
import {
  isTypingTarget,
  viewerKeyboardCommand,
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
