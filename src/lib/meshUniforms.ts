import type { Ref } from 'vue';
import * as THREE from 'three';
import { WB_REFERENCE_LIGHT } from './colorCorrection.js';

interface MeshWithShaderUniforms {
  material?: THREE.Material & { uniforms?: Record<string, { value: THREE.Vector3 | number }> };
}

export interface EnhancementUniformState {
  diffuseGain: Ref<number>;
  unsharpAmount: Ref<number>;
  exposure: Ref<number>;
  specularIntensity: Ref<number>;
  lightDir2: Ref<THREE.Vector3>;
  dualLinked: Ref<boolean>;
}

interface CreateMeshUniformSyncOptions {
  tileMeshes: Map<number, MeshWithShaderUniforms>;
  lightDir: Ref<THREE.Vector3>;
  renderMode: Ref<number>;
  specularExponent: Ref<number>;
  colorGainVector: THREE.Vector3;
  enhancements?: EnhancementUniformState;
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

function syncEnhancements(
  uniforms: Record<string, { value: THREE.Vector3 | number }>,
  enhancements: EnhancementUniformState | undefined,
) {
  if (!enhancements) return;
  if (uniforms.uDiffuseGain) uniforms.uDiffuseGain.value = enhancements.diffuseGain.value;
  if (uniforms.uUnsharpAmount) uniforms.uUnsharpAmount.value = enhancements.unsharpAmount.value;
  if (uniforms.uExposure) uniforms.uExposure.value = enhancements.exposure.value;
  if (uniforms.uSpecularIntensity) uniforms.uSpecularIntensity.value = enhancements.specularIntensity.value;
  if (uniforms.uDualLinked) uniforms.uDualLinked.value = enhancements.dualLinked.value ? 1.0 : 0.0;
  if (isVectorUniform(uniforms.uLightDir2?.value) && uniforms.uLightDir2.value.copy) {
    uniforms.uLightDir2.value.copy(enhancements.lightDir2.value);
  }
}

export function createMeshUniformSync({
  tileMeshes,
  lightDir,
  renderMode,
  specularExponent,
  colorGainVector,
  enhancements,
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
    syncEnhancements(uniforms, enhancements);
  }

  function setRenderModeOnMeshes(mode: number) {
    forEachMeshUniform((uniforms) => {
      if (uniforms.uRenderMode) uniforms.uRenderMode.value = mode;
    });
  }

  function updateSpecularOnMeshes() {
    forEachMeshUniform((uniforms) => {
      if (uniforms.uSpecularExponent) uniforms.uSpecularExponent.value = specularExponent.value;
      if (enhancements && uniforms.uSpecularIntensity) {
        uniforms.uSpecularIntensity.value = enhancements.specularIntensity.value;
      }
    });
  }

  function updateEnhancementsOnMeshes() {
    forEachMeshUniform((uniforms) => syncEnhancements(uniforms, enhancements));
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
    updateEnhancementsOnMeshes,
    updateColorGainOnMeshes,
    setReferenceLightOnMeshes,
    setNeutralColorGainOnMeshes,
    restoreLightOnMeshes,
  };
}
