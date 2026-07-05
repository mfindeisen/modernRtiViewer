import { ref, computed } from 'vue';
import {
  computeColorGainsFromSample,
  COLOR_GAIN_LIMITS,
} from '../lib/colorCorrection.js';
import { isWhiteBalanceActive } from '../lib/viewerUrl.js';
import type { ColorGain } from '../types/rti.js';
import type { UseWhiteBalanceOptions } from './types.js';

export function useWhiteBalance({
  currentMode,
  colorGainVector,
  updateColorGainOnMeshes,
  pointerToImageNorm,
  sampleColorAtScreen,
}: UseWhiteBalanceOptions) {
  const colorGain = ref<ColorGain>({ r: 1, g: 1, b: 1 });
  const wbPickFeedback = ref('');
  let wbFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  const whiteBalanceActive = computed(() => isWhiteBalanceActive(colorGain.value));

  function syncColorGainVector() {
    colorGainVector.set(colorGain.value.r, colorGain.value.g, colorGain.value.b);
  }

  function updateColorGain() {
    syncColorGainVector();
    updateColorGainOnMeshes();
  }

  function showFeedback(message: string) {
    wbPickFeedback.value = message;
    if (wbFeedbackTimer) clearTimeout(wbFeedbackTimer);
    wbFeedbackTimer = setTimeout(() => {
      if (currentMode.value === 'whitebalance') {
        wbPickFeedback.value = '';
      }
    }, 2200);
  }

  function clearFeedback() {
    wbPickFeedback.value = '';
  }

  function pick(e: PointerEvent) {
    if (!pointerToImageNorm(e)) {
      showFeedback('Click inside the image');
      return;
    }
    const sampled = sampleColorAtScreen(e.clientX, e.clientY);
    if (!sampled) {
      showFeedback('No color at this location');
      return;
    }
    colorGain.value = computeColorGainsFromSample(sampled.r, sampled.g, sampled.b);
    updateColorGain();
    showFeedback('White balance applied');
  }

  function reset() {
    colorGain.value = { r: 1, g: 1, b: 1 };
    updateColorGain();
    showFeedback('White balance reset');
  }

  function onColorGainUpdate(gain: ColorGain) {
    colorGain.value = gain;
    updateColorGain();
  }

  function applyColorGain(gain: ColorGain | null) {
    if (!gain) return;
    colorGain.value = { ...gain };
    updateColorGain();
  }

  return {
    colorGain,
    wbPickFeedback,
    whiteBalanceActive,
    gainMin: COLOR_GAIN_LIMITS.min,
    gainMax: COLOR_GAIN_LIMITS.max,
    updateColorGain,
    syncColorGainVector,
    pick,
    reset,
    onColorGainUpdate,
    showFeedback,
    clearFeedback,
    applyColorGain,
  };
}
