import { ref } from 'vue';

export const DEFAULT_RENDER_MODE = 0;
export const DEFAULT_SPECULAR_EXPONENT = 10.0;

interface MeshUpdaters {
  setRenderModeOnMeshes: (mode: number) => void;
  updateSpecularOnMeshes: () => void;
}

export function useRenderSettings(meshUpdaters: MeshUpdaters) {
  const renderMode = ref(DEFAULT_RENDER_MODE);
  const specularExponent = ref(DEFAULT_SPECULAR_EXPONENT);

  function setRenderMode(mode: number) {
    renderMode.value = mode;
    meshUpdaters.setRenderModeOnMeshes(mode);
  }

  function updateSpecular() {
    meshUpdaters.updateSpecularOnMeshes();
  }

  function onSpecularExponentChange(value: number) {
    specularExponent.value = value;
    updateSpecular();
  }

  function resetShading() {
    setRenderMode(DEFAULT_RENDER_MODE);
    onSpecularExponentChange(DEFAULT_SPECULAR_EXPONENT);
  }

  return {
    renderMode,
    specularExponent,
    setRenderMode,
    updateSpecular,
    onSpecularExponentChange,
    resetShading,
  };
}
