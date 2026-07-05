import {
  normalizedUvToLightDir,
  canvasPointerToNormalizedUv,
  compassPointerToNormalizedUv,
} from '../lib/lightDirection.js';

function addListener(
  target: EventTarget,
  type: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

import type { UseRtiInteractionOptions } from './types.js';

export function useRtiInteraction({
  currentMode,
  lightDir,
  container,
  getRenderer,
  getCompassEl,
  setControlsEnabled,
  onLeaveAnnotate,
  onLeaveWhiteBalance,
  onWhiteBalancePick,
}: UseRtiInteractionOptions) {
  let teardown: (() => void) | null = null;

  function updateLightFromNormalized(x: number, y: number) {
    const dir = normalizedUvToLightDir(x, y);
    lightDir.value.set(dir.x, dir.y, dir.z).normalize();
  }

  function applyPointerStyles(mode = currentMode.value) {
    if (!container.value) return;

    const interactiveModes = mode === 'light' || mode === 'annotate' || mode === 'whitebalance';
    container.value.style.touchAction = interactiveModes ? 'none' : 'auto';
    container.value.style.cursor = mode === 'whitebalance' ? 'crosshair' : '';

    const canvas = getRenderer()?.domElement;
    if (canvas) {
      canvas.style.pointerEvents = mode === 'annotate' ? 'none' : 'auto';
      canvas.style.cursor = mode === 'whitebalance' ? 'crosshair' : '';
    }
  }

  function setMode(mode: typeof currentMode.value) {
    currentMode.value = mode;
    setControlsEnabled(mode === 'pan');

    if (mode !== 'annotate') {
      onLeaveAnnotate?.();
    }
    if (mode !== 'whitebalance') {
      onLeaveWhiteBalance?.();
    }

    applyPointerStyles(mode);
  }

  function toggleWhiteBalanceMode() {
    if (currentMode.value === 'whitebalance') {
      setMode('pan');
      return;
    }
    setMode('whitebalance');
  }

  function setup() {
    teardown?.();
    const cleanups: Array<() => void> = [];

    if (!container.value) return;

    const containerEl = container.value;

    let isDraggingLight = false;
    let isDraggingCompass = false;

    const handleCanvasPointerMove = (e: PointerEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const uv = canvasPointerToNormalizedUv(e.clientX, e.clientY, rect);
      updateLightFromNormalized(uv.x, uv.y);
    };

    cleanups.push(addListener(containerEl, 'pointerdown', (e: Event) => {
      const event = e as PointerEvent;
      if (currentMode.value === 'light') {
        isDraggingLight = true;
        containerEl.setPointerCapture(event.pointerId);
        handleCanvasPointerMove(event);
      } else if (currentMode.value === 'whitebalance') {
        onWhiteBalancePick?.(event);
      }
    }));

    cleanups.push(addListener(containerEl, 'pointermove', (e: Event) => {
      if (currentMode.value === 'light' && isDraggingLight) {
        handleCanvasPointerMove(e as PointerEvent);
      }
    }));

    const releaseLightDrag = (e: Event) => {
      if (!isDraggingLight) return;
      containerEl.releasePointerCapture((e as PointerEvent).pointerId);
      isDraggingLight = false;
    };

    cleanups.push(addListener(containerEl, 'pointerup', releaseLightDrag));
    cleanups.push(addListener(containerEl, 'pointercancel', releaseLightDrag));

    const compassEl = getCompassEl?.();
    if (compassEl) {
      const handleCompassPointerMove = (e: PointerEvent) => {
        const rect = compassEl.getBoundingClientRect();
        const uv = compassPointerToNormalizedUv(e.clientX, e.clientY, rect);
        updateLightFromNormalized(uv.x, uv.y);
      };

      cleanups.push(addListener(compassEl, 'pointerdown', (e: Event) => {
        const event = e as PointerEvent;
        isDraggingCompass = true;
        compassEl.setPointerCapture(event.pointerId);
        handleCompassPointerMove(event);
      }));

      cleanups.push(addListener(compassEl, 'pointermove', (e: Event) => {
        if (isDraggingCompass) handleCompassPointerMove(e as PointerEvent);
      }));

      const releaseCompassDrag = (e: Event) => {
        if (!isDraggingCompass) return;
        compassEl.releasePointerCapture((e as PointerEvent).pointerId);
        isDraggingCompass = false;
      };

      cleanups.push(addListener(compassEl, 'pointerup', releaseCompassDrag));
      cleanups.push(addListener(compassEl, 'pointercancel', releaseCompassDrag));
    }

    applyPointerStyles();
    teardown = () => cleanups.forEach((cleanup) => cleanup());
  }

  function dispose() {
    teardown?.();
    teardown = null;
  }

  return {
    setMode,
    toggleWhiteBalanceMode,
    updateLightFromNormalized,
    applyPointerStyles,
    setup,
    dispose,
  };
}
