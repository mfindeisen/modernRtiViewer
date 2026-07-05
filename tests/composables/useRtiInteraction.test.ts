import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';
import type * as THREE from 'three';
import { useRtiInteraction } from '@/composables/useRtiInteraction.js';
import type { ViewerMode } from '@/composables/types.js';
import { mockVector3 } from '../testUtils.js';

describe('useRtiInteraction', () => {
  let currentMode: Ref<ViewerMode>;
  let lightDir: Ref<THREE.Vector3>;
  let container: Ref<HTMLElement>;
  let setControlsEnabled: ReturnType<typeof vi.fn>;
  let onLeaveAnnotate: ReturnType<typeof vi.fn>;
  let onLeaveWhiteBalance: ReturnType<typeof vi.fn>;
  let onWhiteBalancePick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    currentMode = ref<ViewerMode>('pan');
    lightDir = ref(mockVector3(0, 0, 1));
    container = ref(document.createElement('div'));
    document.body.appendChild(container.value);
    setControlsEnabled = vi.fn();
    onLeaveAnnotate = vi.fn();
    onLeaveWhiteBalance = vi.fn();
    onWhiteBalancePick = vi.fn();
  });

  function createInteraction() {
    const canvas = document.createElement('canvas');
    return useRtiInteraction({
      currentMode,
      lightDir,
      container,
      getRenderer: () => ({ domElement: canvas } as unknown as THREE.WebGLRenderer),
      getCompassEl: () => undefined,
      setControlsEnabled: setControlsEnabled as (enabled: boolean) => void,
      onLeaveAnnotate: onLeaveAnnotate as () => void,
      onLeaveWhiteBalance: onLeaveWhiteBalance as () => void,
      onWhiteBalancePick: onWhiteBalancePick as (e: PointerEvent) => void,
    });
  }

  it('enables pan controls only in pan mode', () => {
    const { setMode } = createInteraction();

    setMode('light');
    expect(setControlsEnabled).toHaveBeenCalledWith(false);

    setMode('pan');
    expect(setControlsEnabled).toHaveBeenCalledWith(true);
  });

  it('clears annotate and white balance state when leaving those modes', () => {
    const { setMode } = createInteraction();

    setMode('annotate');
    setMode('pan');
    expect(onLeaveAnnotate).toHaveBeenCalled();

    setMode('whitebalance');
    setMode('pan');
    expect(onLeaveWhiteBalance).toHaveBeenCalled();
  });

  it('updates light direction from normalized UV', () => {
    const { updateLightFromNormalized } = createInteraction();

    updateLightFromNormalized(0.5, 0.5);

    expect(lightDir.value.z).toBeGreaterThan(0);
  });

  it('applies pointer styles for interactive modes', () => {
    const { applyPointerStyles } = createInteraction();

    applyPointerStyles('light');
    expect(container.value.style.touchAction).toBe('none');

    applyPointerStyles('pan');
    expect(container.value.style.touchAction).toBe('auto');
  });

  it('forwards white balance picks in whitebalance mode', () => {
    currentMode.value = 'whitebalance';
    const { setup } = createInteraction();
    setup();

    const event = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, bubbles: true });
    container.value.dispatchEvent(event);

    expect(onWhiteBalancePick).toHaveBeenCalled();
  });
});
