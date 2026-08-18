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

  it('resets shading to default mode and specular', () => {
    const meshUpdaters = {
      setRenderModeOnMeshes: vi.fn(),
      updateSpecularOnMeshes: vi.fn(),
    };
    const { renderMode, specularExponent, setRenderMode, onSpecularExponentChange, resetShading } = useRenderSettings(meshUpdaters);

    setRenderMode(5);
    onSpecularExponentChange(25);
    resetShading();

    expect(renderMode.value).toBe(0);
    expect(specularExponent.value).toBe(10);
    expect(meshUpdaters.setRenderModeOnMeshes).toHaveBeenLastCalledWith(0);
    expect(meshUpdaters.updateSpecularOnMeshes).toHaveBeenCalled();
  });

  it('resets line drawing thresholds with shading', () => {
    const meshUpdaters = {
      setRenderModeOnMeshes: vi.fn(),
      updateSpecularOnMeshes: vi.fn(),
      updateEnhancementsOnMeshes: vi.fn(),
    };
    const { ridgeThreshold, onRidgeThresholdChange, resetShading } = useRenderSettings(meshUpdaters);
    onRidgeThresholdChange(0.4);
    resetShading();
    expect(ridgeThreshold.value).toBe(0.14);
  });
});
