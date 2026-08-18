import { ref } from 'vue';
import {
  DEFAULT_DIFFUSE_GAIN,
  DEFAULT_UNSHARP_AMOUNT,
  DEFAULT_SPECULAR_INTENSITY,
  DEFAULT_DUAL_LINKED,
  DEFAULT_RIDGE_THRESHOLD,
  DEFAULT_VALLEY_THRESHOLD,
  DEFAULT_LINE_WIDTH,
} from '../lib/rtiEnhancements.js';

export const DEFAULT_RENDER_MODE = 0;
export const DEFAULT_SPECULAR_EXPONENT = 10.0;

interface MeshUpdaters {
  setRenderModeOnMeshes: (mode: number) => void;
  updateSpecularOnMeshes: () => void;
  updateEnhancementsOnMeshes?: () => void;
}

export function useRenderSettings(meshUpdaters: MeshUpdaters) {
  const renderMode = ref(DEFAULT_RENDER_MODE);
  const specularExponent = ref(DEFAULT_SPECULAR_EXPONENT);
  const specularIntensity = ref(DEFAULT_SPECULAR_INTENSITY);
  const diffuseGain = ref(DEFAULT_DIFFUSE_GAIN);
  const unsharpAmount = ref(DEFAULT_UNSHARP_AMOUNT);
  const dualLinked = ref(DEFAULT_DUAL_LINKED);
  const ridgeThreshold = ref(DEFAULT_RIDGE_THRESHOLD);
  const valleyThreshold = ref(DEFAULT_VALLEY_THRESHOLD);
  const lineWidth = ref(DEFAULT_LINE_WIDTH);

  function setRenderMode(mode: number) {
    renderMode.value = mode;
    meshUpdaters.setRenderModeOnMeshes(mode);
  }

  function updateSpecular() {
    meshUpdaters.updateSpecularOnMeshes();
  }

  function updateEnhancements() {
    meshUpdaters.updateEnhancementsOnMeshes?.();
  }

  function onSpecularExponentChange(value: number) {
    specularExponent.value = value;
    updateSpecular();
  }

  function onSpecularIntensityChange(value: number) {
    specularIntensity.value = value;
    updateSpecular();
  }

  function onDiffuseGainChange(value: number) {
    diffuseGain.value = value;
    updateEnhancements();
  }

  function onUnsharpAmountChange(value: number) {
    unsharpAmount.value = value;
    updateEnhancements();
  }

  function onRidgeThresholdChange(value: number) {
    ridgeThreshold.value = value;
    updateEnhancements();
  }

  function onValleyThresholdChange(value: number) {
    valleyThreshold.value = value;
    updateEnhancements();
  }

  function onLineWidthChange(value: number) {
    lineWidth.value = value;
    updateEnhancements();
  }

  function setDualLinked(linked: boolean) {
    dualLinked.value = linked;
    updateEnhancements();
  }

  function resetShading() {
    setRenderMode(DEFAULT_RENDER_MODE);
    onSpecularExponentChange(DEFAULT_SPECULAR_EXPONENT);
    onSpecularIntensityChange(DEFAULT_SPECULAR_INTENSITY);
    onDiffuseGainChange(DEFAULT_DIFFUSE_GAIN);
    onUnsharpAmountChange(DEFAULT_UNSHARP_AMOUNT);
    onRidgeThresholdChange(DEFAULT_RIDGE_THRESHOLD);
    onValleyThresholdChange(DEFAULT_VALLEY_THRESHOLD);
    onLineWidthChange(DEFAULT_LINE_WIDTH);
    setDualLinked(DEFAULT_DUAL_LINKED);
  }

  return {
    renderMode,
    specularExponent,
    specularIntensity,
    diffuseGain,
    unsharpAmount,
    dualLinked,
    ridgeThreshold,
    valleyThreshold,
    lineWidth,
    setRenderMode,
    updateSpecular,
    updateEnhancements,
    onSpecularExponentChange,
    onSpecularIntensityChange,
    onDiffuseGainChange,
    onUnsharpAmountChange,
    onRidgeThresholdChange,
    onValleyThresholdChange,
    onLineWidthChange,
    setDualLinked,
    resetShading,
  };
}
