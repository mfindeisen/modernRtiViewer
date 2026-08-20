<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="open"
      class="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      @wheel.prevent="onOverlayWheel"
    >
      <div class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" @click="!busy && emit('close')"></div>
      <div class="relative flex flex-col bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl h-[min(46rem,92%)] overflow-hidden text-slate-300">
        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-white flex items-center gap-2 flex-wrap">
              Mask object
              <ExperimentalBadge />
              <span class="text-[10px] font-medium text-amber-200/85">Visualization only — not scientifically accurate</span>
            </h2>
            <p class="text-[11px] text-slate-400 truncate">{{ statusLine }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none"
              :disabled="busy || !hasSelection"
              @click="emit('generate', { mask: mask.slice(), maxDim: resolution })"
            >
              Generate 3D
            </button>
            <button type="button" class="p-1.5 text-slate-500 hover:text-white" aria-label="Close mask editor" @click="emit('close')">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-700/80 shrink-0 flex-wrap">
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-medium"
            :class="tool === 'paint' ? 'bg-amber-500/20 text-amber-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            @click="tool = 'paint'"
          >
            Paint
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-medium"
            :class="tool === 'erase' ? 'bg-amber-500/20 text-amber-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            @click="tool = 'erase'"
          >
            Erase
          </button>
          <label class="flex items-center gap-2 text-[11px] text-slate-400 ml-1">
            Size
            <input v-model.number="brushSize" type="range" min="1" max="80" step="1" class="w-24 accent-amber-400" />
            <span class="w-6 tabular-nums text-slate-300">{{ brushSize }}</span>
          </label>
          <div class="w-px h-5 bg-slate-700 mx-1"></div>
          <div class="inline-flex items-center rounded-lg overflow-hidden border border-slate-600">
            <button
              type="button"
              class="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40"
              aria-label="Zoom out"
              title="Zoom out (scroll)"
              :disabled="busy || viewZoom <= MIN_VIEW_ZOOM"
              @click="zoomByButton(1 / 1.25)"
            >
              −
            </button>
            <button
              type="button"
              class="px-2 py-1 min-w-[3.25rem] text-[11px] font-medium tabular-nums bg-slate-700 text-slate-300 hover:bg-slate-600"
              aria-label="Fit image"
              title="Fit to view"
              :disabled="busy"
              @click="resetView"
            >
              {{ zoomPercent }}%
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40"
              aria-label="Zoom in"
              title="Zoom in (scroll)"
              :disabled="busy || viewZoom >= MAX_VIEW_ZOOM"
              @click="zoomByButton(1.25)"
            >
              +
            </button>
          </div>
          <div class="w-px h-5 bg-slate-700 mx-1"></div>
          <button type="button" class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600" :disabled="busy" @click="runAuto">
            Auto
          </button>
          <button type="button" class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600" :disabled="busy" @click="keepAll">
            Full frame
          </button>
          <button type="button" class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600" :disabled="busy" @click="clearAll">
            Clear
          </button>
          <div class="w-px h-5 bg-slate-700 mx-1"></div>
          <span class="text-[11px] text-slate-400">Resolution</span>
          <div class="inline-flex rounded-lg overflow-hidden border border-slate-600">
            <button
              v-for="option in resolutionOptions"
              :key="option.value"
              type="button"
              class="px-2.5 py-1 text-xs font-medium"
              :class="resolution === option.value
                ? 'bg-amber-500/20 text-amber-200'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
              :disabled="busy"
              :title="option.hint"
              @click="resolution = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <span class="text-[10px] text-slate-500">Max = full source size</span>
        </div>

        <div
          ref="stageEl"
          class="relative flex-1 min-h-0 bg-slate-950 flex items-center justify-center overflow-hidden touch-none overscroll-none p-3 select-none"
          :class="panning || spaceDown ? (panning ? 'cursor-grabbing' : 'cursor-grab') : ''"
          @wheel.prevent="onWheel"
          @contextmenu.prevent
          @mousedown="onMouseDown"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @pointerleave="onPointerLeave"
          @lostpointercapture="onPointerUp"
        >
          <div
            v-if="source"
            class="relative shrink-0"
            :style="imageStyle"
          >
            <canvas ref="imageCanvas" class="absolute inset-0 h-full w-full" :style="{ imageRendering }"></canvas>
            <canvas ref="overlayCanvas" class="absolute inset-0 h-full w-full pointer-events-none" :style="{ imageRendering }"></canvas>
          </div>
          <div
            v-if="cursor.visible && !panning && !spaceDown"
            class="pointer-events-none absolute rounded-full border border-amber-300/80"
            :style="cursorStyle"
          ></div>
          <div v-if="busy" class="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-3 text-white px-6">
            <div class="relative w-16 h-16">
              <div class="absolute inset-0 rounded-full border-4 border-slate-600"></div>
              <div class="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
              <span class="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{{ displayPercent }}%</span>
            </div>
            <p class="text-sm text-center text-slate-200">{{ busyLabel || 'Working…' }}</p>
            <div class="w-56 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div class="h-full bg-blue-500 transition-[width] duration-200" :style="{ width: `${displayPercent}%` }"></div>
            </div>
          </div>
        </div>

        <p class="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-700 shrink-0">
          Amber = included in the mesh. Scroll to zoom, Space-drag or middle-drag to pan. Auto drops the dark table and keeps the largest object. Erase the colour chart and labels, then generate.
          Max uses the full RTI ({{ nativeDim.toLocaleString() }} px) and can take much longer.
          <span v-if="error" class="block mt-1 text-rose-300">{{ error }}</span>
        </p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import ExperimentalBadge from './ExperimentalBadge.vue';
import {
  fillMask,
  glPixelsToDisplayImageData,
  guessForegroundMask,
  maskCoverage,
  stampDisc,
} from '../lib/meshMask.js';
import { DEFAULT_MESH_RESOLUTION, meshResolutionChoices } from '../lib/surfaceFromNormals.js';

export type MeshColorCapture = {
  pixels: Uint8Array;
  width: number;
  height: number;
};

const props = defineProps<{
  open: boolean;
  source: MeshColorCapture | null;
  sourceMaxDim?: number;
  busy?: boolean;
  busyLabel?: string;
  progress?: number;
  error?: string;
  initialMask?: Uint8Array | null;
}>();

const emit = defineEmits<{
  close: [];
  generate: [payload: { mask: Uint8Array; maxDim: number }];
}>();

const resolution = ref(DEFAULT_MESH_RESOLUTION);
const nativeDim = computed(() => {
  const values = meshResolutionChoices(props.sourceMaxDim || DEFAULT_MESH_RESOLUTION);
  return values[values.length - 1];
});
const resolutionOptions = computed(() => {
  const values = meshResolutionChoices(props.sourceMaxDim || DEFAULT_MESH_RESOLUTION);
  return values.map((value, index) => {
    const isMax = index === values.length - 1;
    return {
      value,
      label: isMax ? `Max ${value}` : `${value}`,
      hint: isMax
        ? `Full source size (${value} px) — slowest`
        : value === 1024
          ? 'Faster'
          : value === 2048
            ? 'Balanced'
            : 'High detail',
    };
  });
});
const displayPercent = computed(() => Math.max(0, Math.min(100, Math.round(props.progress ?? 0))));

const MIN_VIEW_ZOOM = 1;
const MAX_VIEW_ZOOM = 16;

const tool = ref<'paint' | 'erase'>('erase');
const brushSize = ref(28);
const stageEl = ref<HTMLElement | null>(null);
const imageCanvas = ref<HTMLCanvasElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);
const mask = ref(new Uint8Array(0));
const fit = ref({ width: 320, height: 240 });
const viewZoom = ref(1);
const pan = ref({ x: 0, y: 0 });
const spaceDown = ref(false);
const panning = ref(false);
const cursor = ref({ visible: false, x: 0, y: 0 });
let resizeObserver: ResizeObserver | null = null;
let painting = false;
let overlayData: ImageData | null = null;
let panLast = { x: 0, y: 0 };

function screenBrushRadius() {
  const layout = canvasLayout();
  if (!layout) return brushSize.value;
  return Math.max(2, brushSize.value * layout.scale);
}

const hasSelection = computed(() => maskCoverage(mask.value) > 0);
const selectedPx = computed(() => maskCoverage(mask.value));
const statusLine = computed(() => {
  if (!props.source) return 'Capturing image…';
  if (!hasSelection.value) return 'Nothing selected — paint the object or run Auto';
  const pct = Math.round((1000 * selectedPx.value) / (props.source.width * props.source.height)) / 10;
  return `${selectedPx.value.toLocaleString()} px · ${pct}% of frame`;
});

const cursorStyle = computed(() => {
  const radius = screenBrushRadius();
  return {
    left: `${cursor.value.x - radius}px`,
    top: `${cursor.value.y - radius}px`,
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
  };
});

const zoomPercent = computed(() => {
  const source = props.source;
  if (!source || fit.value.width < 1) return 100;
  return Math.max(1, Math.round((fit.value.width / source.width) * viewZoom.value * 100));
});

const imageRendering = computed(() => {
  const source = props.source;
  if (!source || fit.value.width < 1) return 'auto';
  return (fit.value.width / source.width) * viewZoom.value >= 1.5 ? 'pixelated' : 'auto';
});

const imageStyle = computed(() => ({
  width: `${fit.value.width}px`,
  height: `${fit.value.height}px`,
  transform: `translate(${pan.value.x}px, ${pan.value.y}px) scale(${viewZoom.value})`,
  transformOrigin: 'center center',
}));

function clampViewZoom(zoom: number) {
  return Math.min(MAX_VIEW_ZOOM, Math.max(MIN_VIEW_ZOOM, zoom));
}

function clampPan(x: number, y: number, zoom: number) {
  const stage = stageEl.value;
  if (!stage || zoom <= 1.001) return { x: 0, y: 0 };
  const maxX = Math.max(0, (fit.value.width * zoom - stage.clientWidth) / 2);
  const maxY = Math.max(0, (fit.value.height * zoom - stage.clientHeight) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

function resetView() {
  viewZoom.value = 1;
  pan.value = { x: 0, y: 0 };
}

function zoomAt(clientX: number, clientY: number, factor: number) {
  const stage = stageEl.value;
  if (!stage || !props.source) return;
  const next = clampViewZoom(viewZoom.value * factor);
  if (Math.abs(next - viewZoom.value) < 0.0001) return;
  const rect = stage.getBoundingClientRect();
  const cursorX = clientX - rect.left - rect.width / 2;
  const cursorY = clientY - rect.top - rect.height / 2;
  const ratio = next / viewZoom.value;
  viewZoom.value = next;
  pan.value = clampPan(
    cursorX * (1 - ratio) + pan.value.x * ratio,
    cursorY * (1 - ratio) + pan.value.y * ratio,
    next,
  );
}

function zoomByButton(factor: number) {
  const stage = stageEl.value;
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
}

function updateFit() {
  const stage = stageEl.value;
  const source = props.source;
  if (!stage || !source) return;
  const availW = Math.max(40, stage.clientWidth - 24);
  const availH = Math.max(40, stage.clientHeight - 24);
  const scale = Math.min(availW / source.width, availH / source.height, 1);
  fit.value = {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
  pan.value = clampPan(pan.value.x, pan.value.y, viewZoom.value);
}

function observeStage() {
  resizeObserver?.disconnect();
  if (!stageEl.value) return;
  resizeObserver = new ResizeObserver(() => updateFit());
  resizeObserver.observe(stageEl.value);
  updateFit();
}

function canvasLayout() {
  const canvas = overlayCanvas.value || imageCanvas.value;
  const source = props.source;
  if (!canvas || !source) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  const scale = Math.min(rect.width / source.width, rect.height / source.height);
  const drawW = source.width * scale;
  const drawH = source.height * scale;
  return {
    scale,
    ox: rect.left + (rect.width - drawW) / 2,
    oy: rect.top + (rect.height - drawH) / 2,
    rect,
  };
}

function imagePoint(event: PointerEvent) {
  const source = props.source;
  const layout = canvasLayout();
  if (!source || !layout) return null;
  const x = (event.clientX - layout.ox) / layout.scale;
  const y = (event.clientY - layout.oy) / layout.scale;
  return { x, y, inside: x >= 0 && y >= 0 && x < source.width && y < source.height };
}

function paintOverlay() {
  const canvas = overlayCanvas.value;
  const source = props.source;
  if (!canvas || !source || !overlayData) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const data = overlayData.data;
  const bits = mask.value;
  for (let i = 0; i < bits.length; i++) {
    const o = i * 4;
    if (bits[i]) {
      data[o] = 251;
      data[o + 1] = 191;
      data[o + 2] = 36;
      data[o + 3] = 92;
    } else {
      data[o + 3] = 0;
    }
  }
  ctx.putImageData(overlayData, 0, 0);
}

function drawImage() {
  const canvas = imageCanvas.value;
  const source = props.source;
  if (!canvas || !source) return;
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(glPixelsToDisplayImageData(source.pixels, source.width, source.height), 0, 0);
  const overlay = overlayCanvas.value;
  if (overlay) {
    overlay.width = source.width;
    overlay.height = source.height;
    overlayData = ctx.createImageData(source.width, source.height);
    const overlayCtx = overlay.getContext('2d');
    overlayCtx?.clearRect(0, 0, source.width, source.height);
  }
  paintOverlay();
}

function runAuto() {
  const source = props.source;
  if (!source) return;
  mask.value = guessForegroundMask(source.pixels, source.width, source.height);
  paintOverlay();
}

function keepAll() {
  const source = props.source;
  if (!source) return;
  mask.value = fillMask(source.width, source.height, 1);
  paintOverlay();
}

function clearAll() {
  const source = props.source;
  if (!source) return;
  mask.value = fillMask(source.width, source.height, 0);
  paintOverlay();
}

function stamp(event: PointerEvent) {
  const source = props.source;
  const pt = imagePoint(event);
  if (!source || !pt?.inside) return;
  stampDisc(
    mask.value,
    source.width,
    source.height,
    pt.x,
    pt.y,
    brushSize.value,
    tool.value === 'paint' ? 1 : 0,
  );
  paintOverlay();
}

function wantsPan(event: PointerEvent) {
  return event.button === 1 || (event.button === 0 && spaceDown.value);
}

function onMouseDown(event: MouseEvent) {
  if (event.button === 1) event.preventDefault();
}

function onWheel(event: WheelEvent) {
  if (props.busy || !props.source) return;
  const dy = event.deltaY;
  if (dy === 0) return;
  const raw = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
    ? Math.exp(-dy * 0.003)
    : (dy < 0 ? 1.12 : 1 / 1.12);
  const factor = Math.min(1.25, Math.max(1 / 1.25, raw));
  zoomAt(event.clientX, event.clientY, factor);
}

function onOverlayWheel() {
  // Swallow wheel events on the chrome so the RTI viewer behind the modal does not zoom.
}

function onPointerDown(event: PointerEvent) {
  if (props.busy) return;
  const stage = stageEl.value;
  if (wantsPan(event)) {
    event.preventDefault();
    painting = false;
    panning.value = true;
    panLast = { x: event.clientX, y: event.clientY };
    stage?.setPointerCapture(event.pointerId);
    return;
  }
  if (event.button !== 0) return;
  stage?.setPointerCapture(event.pointerId);
  painting = true;
  stamp(event);
}

function onPointerMove(event: PointerEvent) {
  const stage = stageEl.value;
  if (stage) {
    const rect = stage.getBoundingClientRect();
    cursor.value = {
      visible: !panning.value && !spaceDown.value,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
  if (panning.value) {
    pan.value = clampPan(
      pan.value.x + event.clientX - panLast.x,
      pan.value.y + event.clientY - panLast.y,
      viewZoom.value,
    );
    panLast = { x: event.clientX, y: event.clientY };
    return;
  }
  if (painting) stamp(event);
}

function onPointerUp() {
  painting = false;
  panning.value = false;
}

function onPointerLeave() {
  if (!painting && !panning.value) cursor.value.visible = false;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.code !== 'Space' || event.repeat) return;
  const tag = (event.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  event.preventDefault();
  spaceDown.value = true;
}

function onKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') spaceDown.value = false;
}

function onWindowBlur() {
  spaceDown.value = false;
  panning.value = false;
}

let viewKeysBound = false;

function bindViewKeys() {
  if (viewKeysBound) return;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onWindowBlur);
  viewKeysBound = true;
}

function unbindViewKeys() {
  if (!viewKeysBound) return;
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', onWindowBlur);
  viewKeysBound = false;
  spaceDown.value = false;
  panning.value = false;
}

function resetFromSource() {
  const source = props.source;
  if (!source) {
    mask.value = new Uint8Array(0);
    return;
  }
  const prior = props.initialMask;
  if (prior && prior.length === source.width * source.height) {
    mask.value = prior.slice();
    return;
  }
  mask.value = guessForegroundMask(source.pixels, source.width, source.height);
}

onBeforeUnmount(() => {
  painting = false;
  panning.value = false;
  unbindViewKeys();
  resizeObserver?.disconnect();
});

watch(
  () => [props.open, props.source] as const,
  ([open]) => {
    painting = false;
    panning.value = false;
    if (!open) {
      resizeObserver?.disconnect();
      resizeObserver = null;
      unbindViewKeys();
      resetView();
      return;
    }
    resetView();
    resetFromSource();
    bindViewKeys();
    nextTick(() => {
      observeStage();
      drawImage();
    });
  },
  { flush: 'post' },
);

watch(() => props.open, (open) => {
  if (!open) cursor.value.visible = false;
});

watch(
  () => props.sourceMaxDim,
  () => {
    const values = meshResolutionChoices(props.sourceMaxDim || DEFAULT_MESH_RESOLUTION);
    if (values.includes(resolution.value)) return;
    const target = Math.min(DEFAULT_MESH_RESOLUTION, values[values.length - 1]);
    resolution.value = values.reduce((best, value) => (
      Math.abs(value - target) < Math.abs(best - target) ? value : best
    ));
  },
  { immediate: true },
);
</script>
