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
import type * as THREE from 'three';

type LightTarget = 'primary' | 'secondary';

export function useRtiInteraction({
  currentMode,
  lightDir,
  container,
  getRenderer,
  getCompassEl,
  setControlMode,
  onLeaveAnnotate,
  onLeaveWhiteBalance,
  onLeaveMeasure,
  onWhiteBalancePick,
  onLightChange,
  getDualMode,
  lightDir2,
  dualLinked,
  onDualUnlink,
}: UseRtiInteractionOptions) {
  let teardown: (() => void) | null = null;

  function setLightVector(target: THREE.Vector3, x: number, y: number) {
    const dir = normalizedUvToLightDir(x, y);
    target.set(dir.x, dir.y, dir.z).normalize();
  }

  function updateLightFromNormalized(x: number, y: number, target: LightTarget = 'primary') {
    if (target === 'secondary' && lightDir2) {
      if (dualLinked?.value) onDualUnlink?.();
      setLightVector(lightDir2.value, x, y);
    } else {
      setLightVector(lightDir.value, x, y);
    }
    onLightChange?.();
  }

  function applyPointerStyles(mode = currentMode.value) {
    if (!container.value) return;

    const lengthTool = isLengthTool(mode);
    const interactiveModes = mode === 'light' || mode === 'annotate' || mode === 'whitebalance' || lengthTool;
    if (mode === 'whitebalance' || lengthTool) {
      container.value.style.touchAction = 'manipulation';
    } else {
      container.value.style.touchAction = interactiveModes ? 'none' : 'auto';
    }
    container.value.style.cursor = (mode === 'whitebalance' || lengthTool) ? 'crosshair' : '';

    const canvas = getRenderer()?.domElement;
    if (canvas) {
      canvas.style.pointerEvents = (mode === 'annotate' || lengthTool) ? 'none' : 'auto';
      canvas.style.cursor = (mode === 'whitebalance' || lengthTool) ? 'crosshair' : '';
    }
  }

  function setMode(mode: typeof currentMode.value) {
    currentMode.value = mode;
    setControlMode(mode);

    if (mode !== 'annotate') {
      onLeaveAnnotate?.();
    }
    if (mode !== 'whitebalance') {
      onLeaveWhiteBalance?.();
    }
    if (!isLengthTool(mode)) {
      onLeaveMeasure?.();
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

  function pickCompassTarget(event: PointerEvent, compassEl: HTMLElement): LightTarget {
    if (!getDualMode?.() || !lightDir2) return 'primary';
    const rect = compassEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const scale = (rect.width / 2 - 8) / 0.95;
    const primary = {
      x: cx + lightDir.value.x * scale,
      y: cy - lightDir.value.y * scale,
    };
    const secondary = {
      x: cx + lightDir2.value.x * scale,
      y: cy - lightDir2.value.y * scale,
    };
    const d1 = Math.hypot(event.clientX - primary.x, event.clientY - primary.y);
    const d2 = Math.hypot(event.clientX - secondary.x, event.clientY - secondary.y);
    return d2 + 4 < d1 ? 'secondary' : 'primary';
  }

  function setup() {
    teardown?.();
    const cleanups: Array<() => void> = [];

    if (!container.value) return;

    const containerEl = container.value;

    let isDraggingLight = false;
    let isDraggingCompass = false;
    let lightTarget: LightTarget = 'primary';

    const handleCanvasPointerMove = (e: PointerEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const uv = canvasPointerToNormalizedUv(e.clientX, e.clientY, rect);
      const target: LightTarget = (e.shiftKey && getDualMode?.()) ? 'secondary' : lightTarget;
      updateLightFromNormalized(uv.x, uv.y, target);
    };

    cleanups.push(addListener(containerEl, 'pointerdown', (e: Event) => {
      const event = e as PointerEvent;
      if (currentMode.value === 'light') {
        isDraggingLight = true;
        lightTarget = (event.shiftKey && getDualMode?.()) ? 'secondary' : 'primary';
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
      lightTarget = 'primary';
    };

    cleanups.push(addListener(containerEl, 'pointerup', releaseLightDrag));
    cleanups.push(addListener(containerEl, 'pointercancel', releaseLightDrag));

    const compassEl = getCompassEl?.();
    if (compassEl) {
      const handleCompassPointerMove = (e: PointerEvent) => {
        const rect = compassEl.getBoundingClientRect();
        const uv = compassPointerToNormalizedUv(e.clientX, e.clientY, rect);
        updateLightFromNormalized(uv.x, uv.y, lightTarget);
      };

      cleanups.push(addListener(compassEl, 'pointerdown', (e: Event) => {
        const event = e as PointerEvent;
        isDraggingCompass = true;
        lightTarget = pickCompassTarget(event, compassEl);
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
        lightTarget = 'primary';
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

function isLengthTool(mode: string) {
  return mode === 'measure';
}
