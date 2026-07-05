/** Capture and restore RTI viewer camera/light/render state. */

import type { Ref } from 'vue';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ColorGain, RtiViewState } from '../types/rti.js';

interface CaptureRtiViewInput {
  lightDir: THREE.Vector3;
  renderMode: number;
  specularExponent: number;
  colorGain: ColorGain;
  camera: THREE.OrthographicCamera | null;
  controls: OrbitControls | null;
}

interface ApplyRtiViewOptions {
  lightDir: Ref<THREE.Vector3>;
  renderMode: Ref<number>;
  specularExponent: Ref<number>;
  colorGain: Ref<ColorGain>;
  camera: Ref<THREE.OrthographicCamera | null>;
  controls: Ref<OrbitControls | null>;
  setRenderMode: (mode: number) => void;
  updateSpecular: () => void;
  updateColorGain: () => void;
  onApplied?: () => void;
}

export function captureRtiView({
  lightDir,
  renderMode,
  specularExponent,
  colorGain,
  camera,
  controls,
}: CaptureRtiViewInput): RtiViewState {
  return {
    lightDir: {
      x: lightDir.x,
      y: lightDir.y,
      z: lightDir.z,
    },
    renderMode,
    specularExponent,
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
  renderMode,
  specularExponent,
  colorGain,
  camera,
  controls,
  setRenderMode,
  updateSpecular,
  updateColorGain,
  onApplied,
}: ApplyRtiViewOptions) {
  if (!view || !camera.value || !controls.value) return;

  if (view.lightDir) {
    lightDir.value.set(view.lightDir.x, view.lightDir.y, view.lightDir.z).normalize();
  }
  if (view.renderMode !== undefined) {
    renderMode.value = view.renderMode;
    setRenderMode(view.renderMode);
  }
  if (view.specularExponent !== undefined) {
    specularExponent.value = view.specularExponent;
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
