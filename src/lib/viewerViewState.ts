/** Capture and restore RTI viewer camera/light/render state. */

import type { Ref } from 'vue';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ColorGain, RtiViewState, Vec3 } from '../types/rti.js';

interface CaptureRtiViewInput {
  lightDir: THREE.Vector3;
  lightDir2?: THREE.Vector3;
  renderMode: number;
  specularExponent: number;
  specularIntensity?: number;
  diffuseGain?: number;
  unsharpAmount?: number;
  dualLinked?: boolean;
  colorGain: ColorGain;
  camera: THREE.OrthographicCamera | null;
  controls: OrbitControls | null;
}

interface ApplyRtiViewOptions {
  lightDir: Ref<THREE.Vector3>;
  lightDir2?: Ref<THREE.Vector3>;
  renderMode: Ref<number>;
  specularExponent: Ref<number>;
  specularIntensity?: Ref<number>;
  diffuseGain?: Ref<number>;
  unsharpAmount?: Ref<number>;
  dualLinked?: Ref<boolean>;
  colorGain: Ref<ColorGain>;
  camera: Ref<THREE.OrthographicCamera | null>;
  controls: Ref<OrbitControls | null>;
  setRenderMode: (mode: number) => void;
  updateSpecular: () => void;
  updateEnhancements?: () => void;
  updateColorGain: () => void;
  onApplied?: () => void;
}

function vec3Of(v: THREE.Vector3 | Vec3) {
  return { x: v.x, y: v.y, z: v.z };
}

export function captureRtiView({
  lightDir,
  lightDir2,
  renderMode,
  specularExponent,
  specularIntensity,
  diffuseGain,
  unsharpAmount,
  dualLinked,
  colorGain,
  camera,
  controls,
}: CaptureRtiViewInput): RtiViewState {
  return {
    lightDir: vec3Of(lightDir),
    lightDir2: lightDir2 ? vec3Of(lightDir2) : undefined,
    renderMode,
    specularExponent,
    specularIntensity,
    diffuseGain,
    unsharpAmount,
    dualLinked,
    colorGain: { ...colorGain },
    camera: {
      cx: camera?.position.x ?? 0,
      cy: camera?.position.y ?? 0,
      zoom: camera?.zoom ?? 1,
      targetX: controls?.target.x ?? 0,
      targetY: controls?.target.y ?? 0,
    },
  };
}

export function applyRtiView(view: RtiViewState | null | undefined, {
  lightDir,
  lightDir2,
  renderMode,
  specularExponent,
  specularIntensity,
  diffuseGain,
  unsharpAmount,
  dualLinked,
  colorGain,
  camera,
  controls,
  setRenderMode,
  updateSpecular,
  updateEnhancements,
  updateColorGain,
  onApplied,
}: ApplyRtiViewOptions) {
  if (!view || !camera.value || !controls.value) return;

  if (view.lightDir) {
    lightDir.value.set(view.lightDir.x, view.lightDir.y, view.lightDir.z).normalize();
  }
  if (view.lightDir2 && lightDir2) {
    lightDir2.value.set(view.lightDir2.x, view.lightDir2.y, view.lightDir2.z).normalize();
  }
  if (view.renderMode !== undefined) {
    renderMode.value = view.renderMode;
    setRenderMode(view.renderMode);
  }
  if (view.specularExponent !== undefined) {
    specularExponent.value = view.specularExponent;
    updateSpecular();
  }
  if (view.specularIntensity !== undefined && specularIntensity) {
    specularIntensity.value = view.specularIntensity;
  }
  if (view.diffuseGain !== undefined && diffuseGain) {
    diffuseGain.value = view.diffuseGain;
  }
  if (view.unsharpAmount !== undefined && unsharpAmount) {
    unsharpAmount.value = view.unsharpAmount;
  }
  if (view.dualLinked !== undefined && dualLinked) {
    dualLinked.value = view.dualLinked;
  }
  if (view.specularIntensity !== undefined || view.diffuseGain !== undefined
    || view.unsharpAmount !== undefined || view.dualLinked !== undefined) {
    updateEnhancements?.();
    updateSpecular();
  }
  if (view.colorGain) {
    colorGain.value = {
      r: view.colorGain.r ?? 1,
      g: view.colorGain.g ?? 1,
      b: view.colorGain.b ?? 1,
    };
    updateColorGain();
  }

  const cx = view.camera?.cx ?? 0;
  const cy = view.camera?.cy ?? 0;
  camera.value.position.set(cx, cy, 10);
  if (view.camera?.zoom) {
    camera.value.zoom = view.camera.zoom;
    camera.value.updateProjectionMatrix();
  }
  controls.value.target.set(view.camera?.targetX ?? cx, view.camera?.targetY ?? cy, 0);
  controls.value.update();
  onApplied?.();
}
