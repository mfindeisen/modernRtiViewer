import type { Ref } from 'vue';
import { isTypingTarget, viewerKeyboardCommand } from '../lib/viewerKeyboard.js';
import type { ViewerKeyboardCommand } from '../lib/viewerKeyboard.js';
import type { ViewerFeatures } from '../lib/viewerConfig.js';

interface UseViewerKeyboardOptions {
  root: Ref<HTMLElement | null>;
  getAnnotationEnabled: () => boolean;
  getRtiType: () => number | null | undefined;
  getFeatures?: () => ViewerFeatures;
  onCommand: (command: ViewerKeyboardCommand) => void;
}

export function useViewerKeyboard({
  root,
  getAnnotationEnabled,
  getRtiType,
  getFeatures,
  onCommand,
}: UseViewerKeyboardOptions) {
  function viewerHasFocus() {
    const el = root.value;
    if (!el) return false;
    const fullscreen = document.fullscreenElement;
    if (fullscreen && (fullscreen === el || fullscreen.contains(el) || el.contains(fullscreen))) {
      return true;
    }
    const active = document.activeElement;
    if (active && el.contains(active)) return true;
    const host = el.closest('modern-rti-viewer');
    return !!(host && (active === host || (active && host.contains(active))));
  }

  function onKeyDown(event: KeyboardEvent) {
    if (isTypingTarget(event.target)) return;
    if (!viewerHasFocus()) return;
    const command = viewerKeyboardCommand(event, {
      annotationEnabled: getAnnotationEnabled(),
      rtiType: getRtiType(),
      features: getFeatures?.(),
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
