import { describe, it, expect, vi } from 'vitest';
import { useRenderSettings } from '@/composables/useRenderSettings.js';

describe('useRenderSettings', () => {
  it('updates render mode and mesh uniforms', () => {
    const meshUpdaters = {
      setRenderModeOnMeshes: vi.fn(),
      updateSpecularOnMeshes: vi.fn(),
    };
    const { renderMode, setRenderMode } = useRenderSettings(meshUpdaters);

    setRenderMode(2);

    expect(renderMode.value).toBe(2);
    expect(meshUpdaters.setRenderModeOnMeshes).toHaveBeenCalledWith(2);
  });

  it('updates specular exponent and mesh uniforms', () => {
    const meshUpdaters = {
      setRenderModeOnMeshes: vi.fn(),
      updateSpecularOnMeshes: vi.fn(),
    };
    const { specularExponent, onSpecularExponentChange } = useRenderSettings(meshUpdaters);

    onSpecularExponentChange(25);

    expect(specularExponent.value).toBe(25);
    expect(meshUpdaters.updateSpecularOnMeshes).toHaveBeenCalled();
  });

  it('resets shading to default mode, specular, and exposure', () => {
    const meshUpdaters = {
      setRenderModeOnMeshes: vi.fn(),
      updateSpecularOnMeshes: vi.fn(),
      updateEnhancementsOnMeshes: vi.fn(),
    };
    const { renderMode, specularExponent, exposure, setRenderMode, onSpecularExponentChange, onExposureChange, resetShading } = useRenderSettings(meshUpdaters);

    setRenderMode(5);
    onSpecularExponentChange(25);
    onExposureChange(2);
    resetShading();

    expect(renderMode.value).toBe(0);
    expect(specularExponent.value).toBe(10);
    expect(exposure.value).toBe(1);
    expect(meshUpdaters.setRenderModeOnMeshes).toHaveBeenLastCalledWith(0);
    expect(meshUpdaters.updateSpecularOnMeshes).toHaveBeenCalled();
  });

  it('keeps line drawing mode when resetting the enhancements panel', () => {
    const meshUpdaters = {
      setRenderModeOnMeshes: vi.fn(),
      updateSpecularOnMeshes: vi.fn(),
      updateEnhancementsOnMeshes: vi.fn(),
    };
    const {
      renderMode,
      ridgeThreshold,
      setRenderMode,
      onRidgeThresholdChange,
      resetEnhancementPanel,
    } = useRenderSettings(meshUpdaters);

    setRenderMode(5);
    onRidgeThresholdChange(0.4);
    resetEnhancementPanel();

    expect(renderMode.value).toBe(5);
    expect(ridgeThreshold.value).toBe(0.14);
    expect(meshUpdaters.setRenderModeOnMeshes).toHaveBeenLastCalledWith(5);
  });

  it('keeps glossy mode when resetting photometric sliders', () => {
    const meshUpdaters = {
      setRenderModeOnMeshes: vi.fn(),
      updateSpecularOnMeshes: vi.fn(),
      updateEnhancementsOnMeshes: vi.fn(),
    };
    const { renderMode, exposure, setRenderMode, onExposureChange, resetEnhancementPanel } = useRenderSettings(meshUpdaters);

    setRenderMode(1);
    onExposureChange(2);
    resetEnhancementPanel();

    expect(renderMode.value).toBe(1);
    expect(exposure.value).toBe(1);
  });

  it('resets line drawing thresholds with shading', () => {
    const meshUpdaters = {
      setRenderModeOnMeshes: vi.fn(),
      updateSpecularOnMeshes: vi.fn(),
      updateEnhancementsOnMeshes: vi.fn(),
    };
    const {
      ridgeThreshold,
      lineDrawingStyle,
      lineOutline,
      onRidgeThresholdChange,
      onLineDrawingStyleChange,
      resetShading,
    } = useRenderSettings(meshUpdaters);
    onRidgeThresholdChange(0.4);
    onLineDrawingStyleChange('sketch');
    resetShading();
    expect(ridgeThreshold.value).toBe(0.14);
    expect(lineDrawingStyle.value).toBe('contour');
    expect(lineOutline.value).toBe(0.65);
  });
});
