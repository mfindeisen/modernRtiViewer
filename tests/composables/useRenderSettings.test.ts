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
});
