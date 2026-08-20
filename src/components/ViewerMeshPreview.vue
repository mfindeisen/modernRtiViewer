<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="open" class="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" @click="emit('close')"></div>
      <div class="relative flex flex-col bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl h-[min(46rem,92%)] overflow-hidden text-slate-300">
        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-white flex items-center gap-2 flex-wrap">
              3D surface
              <ExperimentalBadge />
              <span class="text-[10px] font-medium text-amber-200/85">Visualization only — not scientifically accurate</span>
            </h2>
            <p class="text-[11px] text-slate-400 truncate">{{ subtitle }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="canRemask"
              type="button"
              class="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600"
              @click="emit('remask')"
            >
              Edit mask
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
              @click="emit('download')"
            >
              Download PLY
            </button>
            <button type="button" class="p-1.5 text-slate-500 hover:text-white" aria-label="Close 3D view" @click="emit('close')">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div ref="viewport" class="relative flex-1 min-h-0 bg-slate-950 touch-none">
          <div class="absolute z-10 bottom-3 left-3 flex items-end gap-2 pointer-events-none">
            <LightCompass
              ref="compassComponentRef"
              class="pointer-events-auto"
              :light-dir="lightDir"
              @pointerdown.stop
            />
            <button
              type="button"
              class="pointer-events-auto w-8 h-8 rounded-lg bg-slate-950/75 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center"
              aria-label="Reset light to front"
              title="Front light"
              @click="resetLight"
            >
              <LocateFixedIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
        <p class="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-700 shrink-0">
          Experimental · visualization only · not a measured 3D scan · drag the compass to move light · drag to orbit · scroll to zoom
        </p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LocateFixed as LocateFixedIcon } from '@lucide/vue';
import type { ReconstructedSurface } from '../lib/surfaceFromNormals.js';
import { createSurfaceGeometry, frameSurfaceCamera, rtiLightToPreviewWorld, surfaceMeshRadius } from '../lib/surfacePreview.js';
import {
  FRONT_LIGHT,
  compassPointerToNormalizedUv,
  normalizedUvToLightDir,
} from '../lib/lightDirection.js';
import ExperimentalBadge from './ExperimentalBadge.vue';
import LightCompass from './LightCompass.vue';

const props = defineProps<{
  open: boolean;
  surface: ReconstructedSurface | null;
  canRemask?: boolean;
}>();

const emit = defineEmits(['close', 'download', 'remask']);
const viewport = ref<HTMLElement | null>(null);
const compassComponentRef = ref<{ compassEl?: HTMLElement | null } | null>(null);
const lightDir = ref(new THREE.Vector3(FRONT_LIGHT.x, FRONT_LIGHT.y, FRONT_LIGHT.z));

const subtitle = computed(() => {
  const surface = props.surface;
  if (!surface) return '';
  const { mesh, scale } = surface;
  const faces = mesh.faceCount.toLocaleString();
  return `${faces} faces · ${scale.unit}`;
});

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let meshObject: THREE.Mesh | null = null;
let keyLight: THREE.DirectionalLight | null = null;
let lightDistance = 4;
let resizeObserver: ResizeObserver | null = null;
let frameId = 0;
let unbindCompass: (() => void) | null = null;

function resetLight() {
  lightDir.value.set(FRONT_LIGHT.x, FRONT_LIGHT.y, FRONT_LIGHT.z);
  applyLight();
}

function applyLight() {
  if (!keyLight) return;
  const pos = rtiLightToPreviewWorld(lightDir.value, lightDistance);
  keyLight.position.set(pos.x, pos.y, pos.z);
}

function setLightFromPointer(event: PointerEvent, compassEl: HTMLElement) {
  const uv = compassPointerToNormalizedUv(event.clientX, event.clientY, compassEl.getBoundingClientRect());
  const dir = normalizedUvToLightDir(uv.x, uv.y);
  lightDir.value.set(dir.x, dir.y, dir.z);
  applyLight();
}

function compassElement() {
  const exposed = compassComponentRef.value?.compassEl as unknown;
  if (exposed instanceof HTMLElement) return exposed;
  if (exposed && typeof exposed === 'object' && 'value' in (exposed as object)) {
    const inner = (exposed as { value: unknown }).value;
    if (inner instanceof HTMLElement) return inner;
  }
  return null;
}

function bindCompass() {
  unbindCompass?.();
  const compassEl = compassElement();
  if (!compassEl) {
    unbindCompass = null;
    return;
  }
  let dragging = false;
  const onDown = (event: PointerEvent) => {
    dragging = true;
    compassEl.setPointerCapture(event.pointerId);
    setLightFromPointer(event, compassEl);
  };
  const onMove = (event: PointerEvent) => {
    if (dragging) setLightFromPointer(event, compassEl);
  };
  const onUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    compassEl.releasePointerCapture(event.pointerId);
  };
  compassEl.addEventListener('pointerdown', onDown);
  compassEl.addEventListener('pointermove', onMove);
  compassEl.addEventListener('pointerup', onUp);
  compassEl.addEventListener('pointercancel', onUp);
  unbindCompass = () => {
    compassEl.removeEventListener('pointerdown', onDown);
    compassEl.removeEventListener('pointermove', onMove);
    compassEl.removeEventListener('pointerup', onUp);
    compassEl.removeEventListener('pointercancel', onUp);
  };
}

function disposePreview() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  resizeObserver?.disconnect();
  resizeObserver = null;
  controls?.dispose();
  controls = null;
  keyLight = null;
  if (meshObject) {
    meshObject.geometry.dispose();
    const material = meshObject.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material.dispose();
    scene?.remove(meshObject);
    meshObject = null;
  }
  renderer?.dispose();
  renderer?.domElement.remove();
  renderer = null;
  scene = null;
  camera = null;
}

function resize() {
  const el = viewport.value;
  if (!el || !renderer || !camera) return;
  const width = Math.max(1, el.clientWidth);
  const height = Math.max(1, el.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function tick() {
  if (!renderer || !scene || !camera) return;
  controls?.update();
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(tick);
}

function mountPreview() {
  const el = viewport.value;
  const surface = props.surface;
  if (!el || !surface) return;
  disposePreview();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020617);

  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  renderer.domElement.className = 'absolute inset-0 h-full w-full';

  const geometry = createSurfaceGeometry(surface.mesh);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  meshObject = new THREE.Mesh(geometry, material);
  meshObject.rotation.x = -Math.PI / 2;
  scene.add(meshObject);

  const radius = surfaceMeshRadius(surface.mesh);
  lightDistance = Math.max(radius * 4, 2);
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.32));
  keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
  applyLight();
  scene.add(keyLight);

  const target = new THREE.Vector3();
  frameSurfaceCamera(camera, target, radius);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(target);
  controls.update();

  resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(el);
  resize();
  tick();
}

watch(
  () => [props.open, props.surface] as const,
  async ([open, surface]) => {
    if (!open || !surface) {
      unbindCompass?.();
      unbindCompass = null;
      disposePreview();
      return;
    }
    resetLight();
    mountPreview();
    await nextTick();
    bindCompass();
  },
  { flush: 'post' },
);

onBeforeUnmount(() => {
  unbindCompass?.();
  unbindCompass = null;
  disposePreview();
});
</script>
