import { ref } from 'vue';

interface MeshUpdaters {
  setRenderModeOnMeshes: (mode: number) => void;
  updateSpecularOnMeshes: () => void;
}

export function useRenderSettings(meshUpdaters: MeshUpdaters) {
  const renderMode = ref(0);
  const specularExponent = ref(10.0);

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

  return {
    renderMode,
    specularExponent,
    setRenderMode,
    updateSpecular,
    onSpecularExponentChange,
  };
}
