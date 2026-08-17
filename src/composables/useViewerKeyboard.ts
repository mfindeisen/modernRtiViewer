import type { Ref } from 'vue';
import { isTypingTarget, viewerKeyboardCommand } from '../lib/viewerKeyboard.js';
import type { ViewerKeyboardCommand } from '../lib/viewerKeyboard.js';

interface UseViewerKeyboardOptions {
  root: Ref<HTMLElement | null>;
  getAnnotationEnabled: () => boolean;
  getMaxRenderMode: () => number;
  onCommand: (command: ViewerKeyboardCommand) => void;
}

export function useViewerKeyboard({
  root,
  getAnnotationEnabled,
  getMaxRenderMode,
  onCommand,
}: UseViewerKeyboardOptions) {
  function viewerHasFocus() {
    const el = root.value;
    if (!el) return false;
    if (document.fullscreenElement === el) return true;
    const active = document.activeElement;
    return !!(active && el.contains(active));
  }

  function onKeyDown(event: KeyboardEvent) {
    if (isTypingTarget(event.target)) return;
    if (!viewerHasFocus()) return;
    const command = viewerKeyboardCommand(event, {
      annotationEnabled: getAnnotationEnabled(),
      maxRenderMode: getMaxRenderMode(),
    });
    if (!command) return;
    event.preventDefault();
    onCommand(command);
  }

  function onPointerDown() {
    root.value?.focus({ preventScroll: true });
  }

  function setup() {
    window.addEventListener('keydown', onKeyDown);
    root.value?.addEventListener('pointerdown', onPointerDown);
  }

  function dispose() {
    window.removeEventListener('keydown', onKeyDown);
    root.value?.removeEventListener('pointerdown', onPointerDown);
  }

  return { setup, dispose, onKeyDown, onPointerDown };
}
