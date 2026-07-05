import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ref, type Ref } from 'vue';
import type * as THREE from 'three';
import { useWhiteBalance } from '@/composables/useWhiteBalance.js';
import type { ViewerMode } from '@/composables/types.js';
import { mockPointerEvent, mockVector3 } from '../testUtils.js';

describe('useWhiteBalance', () => {
  let currentMode: Ref<ViewerMode>;
  let colorGainVector: THREE.Vector3;
  let updateColorGainOnMeshes: () => void;
  let pointerToImageNorm: Mock<(e: PointerEvent) => { x: number; y: number } | null>;
  let sampleColorAtScreen: (clientX: number, clientY: number) => { r: number; g: number; b: number } | null;

  beforeEach(() => {
    currentMode = ref<ViewerMode>('whitebalance');
    colorGainVector = mockVector3();
    updateColorGainOnMeshes = vi.fn();
    pointerToImageNorm = vi.fn(() => ({ x: 0.5, y: 0.5 }));
    sampleColorAtScreen = vi.fn(() => ({ r: 0.8, g: 0.4, b: 0.4 }));
  });

  it('resets color gain to neutral and updates meshes', () => {
    const { colorGain, reset } = useWhiteBalance({
      currentMode,
      colorGainVector,
      updateColorGainOnMeshes,
      pointerToImageNorm,
      sampleColorAtScreen,
    });

    colorGain.value = { r: 1.2, g: 0.9, b: 1.1 };
    reset();

    expect(colorGain.value).toEqual({ r: 1, g: 1, b: 1 });
    expect(colorGainVector.x).toBe(1);
    expect(updateColorGainOnMeshes).toHaveBeenCalled();
  });

  it('applies restored color gain from URL state', () => {
    const { colorGain, applyColorGain } = useWhiteBalance({
      currentMode,
      colorGainVector,
      updateColorGainOnMeshes,
      pointerToImageNorm,
      sampleColorAtScreen,
    });

    applyColorGain({ r: 1.1, g: 0.95, b: 1.05 });

    expect(colorGain.value).toEqual({ r: 1.1, g: 0.95, b: 1.05 });
    expect(colorGainVector.x).toBeCloseTo(1.1);
    expect(updateColorGainOnMeshes).toHaveBeenCalled();
  });

  it('shows feedback when pick is outside the image', () => {
    pointerToImageNorm.mockReturnValue(null);
    const { pick, wbPickFeedback } = useWhiteBalance({
      currentMode,
      colorGainVector,
      updateColorGainOnMeshes,
      pointerToImageNorm,
      sampleColorAtScreen,
    });

    pick(mockPointerEvent());

    expect(wbPickFeedback.value).toBe('Click inside the image');
    expect(sampleColorAtScreen).not.toHaveBeenCalled();
  });

  it('samples color and applies white balance on pick', () => {
    const { pick, colorGain, wbPickFeedback } = useWhiteBalance({
      currentMode,
      colorGainVector,
      updateColorGainOnMeshes,
      pointerToImageNorm,
      sampleColorAtScreen,
    });

    pick(mockPointerEvent({ clientX: 100, clientY: 100 }));

    expect(sampleColorAtScreen).toHaveBeenCalledWith(100, 100);
    expect(colorGain.value.r).not.toBe(1);
    expect(colorGain.value.g).not.toBe(1);
    expect(wbPickFeedback.value).toBe('White balance applied');
    expect(updateColorGainOnMeshes).toHaveBeenCalled();
  });
});
