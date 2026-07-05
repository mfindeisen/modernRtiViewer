import type { Ref } from 'vue';
import * as THREE from 'three';
import { WB_REFERENCE_LIGHT } from './colorCorrection.js';

interface MeshWithShaderUniforms {
  material?: THREE.Material & { uniforms?: Record<string, { value: THREE.Vector3 | number }> };
}

interface CreateMeshUniformSyncOptions {
  tileMeshes: Map<number, MeshWithShaderUniforms>;
  lightDir: Ref<THREE.Vector3>;
  renderMode: Ref<number>;
  specularExponent: Ref<number>;
  colorGainVector: THREE.Vector3;
}

interface VectorUniform {
  copy?: (v: THREE.Vector3) => void;
  set?: (x: number, y: number, z: number) => void;
}

function isVectorUniform(value: unknown): value is VectorUniform {
  return typeof value === 'object' && value !== null
    && (typeof (value as VectorUniform).copy === 'function'
      || typeof (value as VectorUniform).set === 'function');
}

export function createMeshUniformSync({
  tileMeshes,
  lightDir,
  renderMode,
  specularExponent,
  colorGainVector,
}: CreateMeshUniformSyncOptions) {
  function forEachMeshUniform(apply: (uniforms: Record<string, { value: THREE.Vector3 | number }>) => void) {
    for (const mesh of tileMeshes.values()) {
      if (mesh?.material?.uniforms) apply(mesh.material.uniforms);
    }
  }

  function syncMeshUniforms(mesh: MeshWithShaderUniforms | undefined) {
    if (!mesh?.material?.uniforms) return;
    const uniforms = mesh.material.uniforms;
    if (isVectorUniform(uniforms.uLightDir?.value) && uniforms.uLightDir.value.copy) {
      uniforms.uLightDir.value.copy(lightDir.value);
    }
    if (uniforms.uRenderMode) uniforms.uRenderMode.value = renderMode.value;
    if (uniforms.uSpecularExponent) uniforms.uSpecularExponent.value = specularExponent.value;
    if (isVectorUniform(uniforms.uColorGain?.value) && uniforms.uColorGain.value.copy) {
      uniforms.uColorGain.value.copy(colorGainVector);
    }
  }

  function setRenderModeOnMeshes(mode: number) {
    forEachMeshUniform((uniforms) => {
      if (uniforms.uRenderMode) uniforms.uRenderMode.value = mode;
    });
  }

  function updateSpecularOnMeshes() {
    forEachMeshUniform((uniforms) => {
      if (uniforms.uSpecularExponent) uniforms.uSpecularExponent.value = specularExponent.value;
    });
  }

  function updateColorGainOnMeshes() {
    forEachMeshUniform((uniforms) => {
      if (isVectorUniform(uniforms.uColorGain?.value) && uniforms.uColorGain.value.copy) {
        uniforms.uColorGain.value.copy(colorGainVector);
      }
    });
  }

  function setReferenceLightOnMeshes() {
    forEachMeshUniform((uniforms) => {
      if (isVectorUniform(uniforms.uLightDir?.value) && uniforms.uLightDir.value.set) {
        uniforms.uLightDir.value.set(
          WB_REFERENCE_LIGHT.x,
          WB_REFERENCE_LIGHT.y,
          WB_REFERENCE_LIGHT.z,
        );
      }
    });
  }

  function setNeutralColorGainOnMeshes() {
    forEachMeshUniform((uniforms) => {
      if (isVectorUniform(uniforms.uColorGain?.value) && uniforms.uColorGain.value.set) {
        uniforms.uColorGain.value.set(1, 1, 1);
      }
    });
  }

  function restoreLightOnMeshes(savedLight: THREE.Vector3) {
    forEachMeshUniform((uniforms) => {
      if (isVectorUniform(uniforms.uLightDir?.value) && uniforms.uLightDir.value.copy) {
        uniforms.uLightDir.value.copy(savedLight);
      }
    });
  }

  return {
    forEachMeshUniform,
    syncMeshUniforms,
    setRenderModeOnMeshes,
    updateSpecularOnMeshes,
    updateColorGainOnMeshes,
    setReferenceLightOnMeshes,
    setNeutralColorGainOnMeshes,
    restoreLightOnMeshes,
  };
}
