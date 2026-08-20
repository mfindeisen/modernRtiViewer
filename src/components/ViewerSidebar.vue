<template>
  <div ref="sidebarEl" class="rti-viewer-sidebar w-16 bg-slate-800 border-r border-slate-700 flex flex-col relative z-50 shrink-0 self-stretch rounded-l-xl max-lg:w-full max-lg:h-14 max-lg:flex-row max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:rounded-t-xl max-lg:rounded-b-none max-lg:border-r-0 max-lg:border-b">
    <div class="rti-viewer-sidebar-inner flex flex-col items-center py-4 w-full max-lg:flex-row max-lg:py-1 max-lg:px-2 max-lg:w-auto max-lg:min-w-max">
        <SidebarTooltip title="Pan & Zoom" description="Navigate the image (H)">
        <button aria-label="Pan & Zoom" :aria-pressed="currentMode === 'pan'" @click="emit('set-mode', 'pan')" :class="['p-3 rounded-xl transition-all mb-2', currentMode === 'pan' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <HandIcon class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <SidebarTooltip title="Light Direction" description="Move the light source (L)">
        <button aria-label="Light Direction" :aria-pressed="currentMode === 'light'" @click="emit('set-mode', 'light')" :class="['p-3 rounded-xl transition-all', currentMode === 'light' ? 'bg-yellow-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <LightbulbIcon class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <div v-if="annotationEnabled" ref="annotateWrapEl" class="relative mb-2 flex flex-col items-center">
        <SidebarTooltip title="Annotate" :description="`${activeShapeHint} (A)`">
          <button
            aria-label="Annotate"
            :aria-pressed="currentMode === 'annotate'"
            type="button"
            @click="emit('toggle-annotate')"
            :class="['relative p-3 rounded-xl transition-all', currentMode === 'annotate' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']"
          >
            <component :is="shapeIcons[annotationShape as keyof typeof shapeIcons]" class="w-5 h-5" />
            <span
              class="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-white/90 shadow-sm"
              :style="{ backgroundColor: annotationColor }"
            />
          </button>
        </SidebarTooltip>
        <Teleport to="body" :disabled="!isNarrow">
          <div
            v-if="currentMode === 'annotate' && shapeMenuOpen"
            class="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-2xl py-1.5"
            :class="isNarrow
              ? 'fixed z-[220] overflow-y-auto'
              : 'absolute left-full top-0 ml-2 z-[60] w-48'"
            :style="isNarrow ? shapeMenuStyle : undefined"
            @pointerdown.stop
          >
          <p class="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Shape</p>
          <button
            v-for="option in ANNOTATION_SHAPE_OPTIONS"
            :key="option.id"
            type="button"
            class="w-full flex items-start gap-2.5 px-3 py-2 text-left text-xs transition-colors"
            :class="annotationShape === option.id ? 'bg-amber-500/20 text-amber-200' : 'text-slate-300 hover:bg-white/10'"
            @click="emit('select-annotation-shape', option.id)"
          >
            <component :is="shapeIcons[option.id as keyof typeof shapeIcons]" class="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <span class="font-semibold block leading-tight">{{ option.label }}</span>
              <span class="text-[10px] text-slate-500 leading-snug">{{ option.hint }}</span>
            </span>
          </button>
          <p class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-t border-white/10 mt-1">Color</p>
          <div class="flex flex-wrap gap-1.5 px-3 pb-2">
            <button
              v-for="color in ANNOTATION_COLOR_PRESETS"
              :key="color"
              type="button"
              class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              :class="annotationColor === color ? 'border-white scale-110' : 'border-transparent'"
              :style="{ backgroundColor: color }"
              :title="color"
              :aria-label="`Color ${color}`"
              :aria-pressed="annotationColor === color"
              @click="selectPreset(color)"
            />
            <button
              type="button"
              class="w-6 h-6 rounded-full p-[2px] border-2 transition-transform hover:scale-110"
              :class="customColorActive ? 'border-white scale-110' : 'border-transparent'"
              :style="{ background: RAINBOW_SWATCH }"
              title="Custom color"
              aria-label="Custom color"
              :aria-pressed="customColorActive"
              @click="toggleCustomPicker"
            >
              <span
                class="block w-full h-full rounded-full border border-slate-900/40"
                :style="{ backgroundColor: customColorActive ? annotationColor : '#0f172a' }"
              />
            </button>
          </div>
          <div v-if="customPickerOpen" class="px-3 pb-2">
            <AnnotationHsvPicker :model-value="annotationColor" @update:model-value="emit('select-annotation-color', $event)" />
          </div>
          <p class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 border-t border-white/10 mt-1">Line width</p>
          <div class="px-3 pb-2 space-y-1.5">
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                :value="annotationStrokeWidth"
                class="flex-1 accent-amber-400 h-1.5"
                :aria-label="`Line width ${annotationStrokeWidth}`"
                @input="onStrokeWidthInput"
              />
              <span class="w-5 text-right text-[10px] tabular-nums text-slate-300">{{ annotationStrokeWidth }}</span>
            </div>
            <svg class="w-full h-4" viewBox="0 0 120 16" aria-hidden="true">
              <line
                x1="4"
                y1="8"
                x2="116"
                y2="8"
                :stroke="annotationColor"
                :stroke-width="annotationStrokeWidth"
                stroke-linecap="round"
              />
            </svg>
          </div>
          </div>
        </Teleport>
      </div>

      <div class="rti-viewer-divider w-8 h-px bg-slate-700 my-4"></div>

      <SidebarTooltip v-if="featureOn('whiteBalance')" title="White Balance" description="Click a white or gray patch (W)">
        <button aria-label="White Balance" :aria-pressed="currentMode === 'whitebalance'" @click="emit('toggle-white-balance')" :class="['p-3 rounded-xl transition-all mb-2', currentMode === 'whitebalance' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <PipetteIcon class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <SidebarTooltip v-if="featureOn('measure')" title="Measure" :description="scaleSet ? 'Calibrated distance; set scale from a drawn line (M)' : 'Draw a line, then set the scale from the photographed ruler (M)'">
        <button aria-label="Measure" :aria-pressed="currentMode === 'measure'" @click="emit('toggle-measure')" :class="['p-3 rounded-xl transition-all mb-2', currentMode === 'measure' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <RulerIcon class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <SidebarTooltip v-if="featureOn('enhancements')" title="Enhancements" description="Exposure, diffuse gain, unsharp, specular (E)">
        <button aria-label="Enhancements" :aria-pressed="enhancementsOpen" @click="emit('toggle-enhancements')" :class="['p-3 rounded-xl transition-all mb-2', enhancementsOpen ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <SlidersHorizontalIcon class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <div class="rti-viewer-divider w-8 h-px bg-slate-700 my-4"></div>

      <SidebarTooltip
        v-for="mode in renderModes"
        :key="mode.id"
        :title="mode.title"
        :description="mode.description"
        :experimental="mode.experimental"
      >
        <button
          :aria-label="mode.title"
          :aria-pressed="renderMode === mode.id"
          @click="emit('set-render-mode', mode.id)"
          :class="['relative p-3 rounded-xl transition-all mb-2', renderMode === mode.id ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white']"
        >
          <component :is="mode.icon" class="w-5 h-5" />
          <span
            v-if="mode.experimental"
            class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400"
            aria-hidden="true"
          />
        </button>
      </SidebarTooltip>

      <div class="rti-viewer-sidebar-tools mt-auto flex flex-col items-center w-full max-lg:flex-row max-lg:mt-0">
        <div class="rti-viewer-divider w-8 h-px bg-slate-700 my-4"></div>
        <SidebarTooltip :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'" description="Maximize workspace">
          <button :aria-label="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'" @click="emit('toggle-fullscreen')" class="p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
            <component :is="isFullscreen ? MinimizeIcon : MaximizeIcon" class="w-5 h-5" />
          </button>
        </SidebarTooltip>
        <SidebarTooltip v-if="featureOn('export')" title="Export" description="PNG, clipboard, or light orbit (S)">
          <button aria-label="Export" @click="emit('export-image')" class="p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
            <DownloadIcon class="w-5 h-5" />
          </button>
        </SidebarTooltip>
        <SidebarTooltip v-if="featureOn('share')" title="Copy Link" description="Share view with exact angles">
          <button aria-label="Copy Link" @click="emit('copy-link')" class="p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
            <LinkIcon class="w-5 h-5" />
          </button>
        </SidebarTooltip>
        <SidebarTooltip title="About" description="Project credits">
          <button aria-label="About" @click="emit('toggle-info')" :class="['p-3 rounded-xl transition-all', infoOpen ? 'bg-white/20 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
            <InfoIcon class="w-5 h-5" />
          </button>
        </SidebarTooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import {
  Hand as HandIcon,
  Lightbulb as LightbulbIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles as SparklesIcon,
  Layers as LayersIcon,
  Info as InfoIcon,
  Maximize as MaximizeIcon,
  Minimize as MinimizeIcon,
  Map as MapIcon,
  Sun as SunIcon,
  PenLine as PenLineIcon,
  Circle as CircleIcon,
  CircleDot as CircleDotIcon,
  Square as SquareIcon,
  Pipette as PipetteIcon,
  Ruler as RulerIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
} from '@lucide/vue';
import { ANNOTATION_SHAPE_OPTIONS } from '../lib/annotationShapes.js';
import { ANNOTATION_COLOR_PRESETS, isPresetAnnotationColor } from '../lib/annotationColors.js';
import { DEFAULT_EXPERIMENTAL_FEATURES, DEFAULT_VIEWER_FEATURES, type ViewerFeatureId, type ViewerFeatures } from '../lib/viewerConfig.js';
import SidebarTooltip from './SidebarTooltip.vue';
import AnnotationHsvPicker from './AnnotationHsvPicker.vue';
import { useMediaQuery } from '../composables/useMediaQuery.js';
import { NARROW_VIEWPORT_QUERY } from '../lib/viewport.js';

const shapeIcons: Record<'point' | 'circle' | 'rectangle', typeof CircleIcon> = {
  point: CircleDotIcon,
  circle: CircleIcon,
  rectangle: SquareIcon,
};

const baseRenderModes = [
  { id: 0, icon: ImageIcon, title: 'Default Mode', description: 'Standard diffuse rendering' },
  { id: 1, icon: SparklesIcon, title: 'Glossy Mode', description: 'Enhance surface scratches' },
  { id: 2, icon: LayersIcon, title: 'Normals Mode', description: 'View structural geometry' },
  { id: 3, icon: MapIcon, title: 'Slope Heatmap', description: 'Visualize surface steepness' },
  { id: 4, icon: SunIcon, title: 'Dual Light', description: 'Red & Blue opposing lights' },
];

const lineDrawingMode = {
  id: 5,
  icon: PenLineIcon,
  title: 'Line Drawing',
  description: 'Relief as black lines on white',
  experimental: true,
};

const latentRenderMode = {
  id: 7,
  icon: LayersIcon,
  title: 'Latent Map',
  description: 'View raw learned latent map',
};

const props = defineProps({
  currentMode: { type: String, required: true },
  renderMode: { type: Number, required: true },
  annotationEnabled: { type: Boolean, default: false },
  annotationShape: { type: String, required: true },
  annotationColor: { type: String, required: true },
  annotationStrokeWidth: { type: Number, required: true },
  shapeMenuOpen: { type: Boolean, default: false },
  activeShapeHint: { type: String, default: '' },
  rtiType: { type: Number, default: null },
  isFullscreen: { type: Boolean, default: false },
  infoOpen: { type: Boolean, default: false },
  enhancementsOpen: { type: Boolean, default: false },
  scaleSet: { type: Boolean, default: false },
  features: { type: Object, default: () => ({ ...DEFAULT_VIEWER_FEATURES }) },
  experimental: { type: Array, default: () => [...DEFAULT_EXPERIMENTAL_FEATURES] },
});

const emit = defineEmits([
  'set-mode',
  'toggle-annotate',
  'select-annotation-shape',
  'select-annotation-color',
  'select-annotation-stroke-width',
  'toggle-white-balance',
  'toggle-measure',
  'toggle-enhancements',
  'set-render-mode',
  'toggle-fullscreen',
  'export-image',
  'copy-link',
  'toggle-info',
]);

const sidebarEl = ref<HTMLElement | null>(null);
const annotateWrapEl = ref<HTMLElement | null>(null);
const isNarrow = useMediaQuery(NARROW_VIEWPORT_QUERY);
const shapeMenuStyle = ref<Record<string, string>>({});
defineExpose({ sidebarEl });

const SHAPE_MENU_MARGIN = 16;
const SHAPE_MENU_WIDTH = 20 * 16;

function updateShapeMenuPosition() {
  const el = annotateWrapEl.value;
  if (!el || !isNarrow.value) return;
  const rect = el.getBoundingClientRect();
  const width = Math.min(SHAPE_MENU_WIDTH, window.innerWidth - SHAPE_MENU_MARGIN * 2);
  const top = Math.min(rect.bottom + 8, window.innerHeight - SHAPE_MENU_MARGIN - 160);
  shapeMenuStyle.value = {
    top: `${Math.max(SHAPE_MENU_MARGIN, top)}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    width: `${width}px`,
    maxHeight: `${Math.max(160, window.innerHeight - Math.max(SHAPE_MENU_MARGIN, top) - SHAPE_MENU_MARGIN)}px`,
  };
}

function stopShapeMenuTracking() {
  window.removeEventListener('resize', updateShapeMenuPosition);
  window.removeEventListener('scroll', updateShapeMenuPosition, true);
}

watch(
  () => [props.shapeMenuOpen, props.currentMode, isNarrow.value],
  async ([open, mode, narrow]) => {
    if (!open || mode !== 'annotate' || !narrow) {
      stopShapeMenuTracking();
      return;
    }
    await nextTick();
    updateShapeMenuPosition();
    window.addEventListener('resize', updateShapeMenuPosition);
    window.addEventListener('scroll', updateShapeMenuPosition, true);
  },
);

onUnmounted(stopShapeMenuTracking);

const RAINBOW_SWATCH = 'conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #14b8a6, #3b82f6, #8b5cf6, #ec4899, #ef4444)';
const customPickerOpen = ref(false);
const customColorActive = computed(() => customPickerOpen.value || !isPresetAnnotationColor(props.annotationColor));

function selectPreset(color: string) {
  customPickerOpen.value = false;
  emit('select-annotation-color', color);
}

function toggleCustomPicker() {
  customPickerOpen.value = !customPickerOpen.value;
}

function onStrokeWidthInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  emit('select-annotation-stroke-width', Number(target.value));
}

const renderModes = computed(() => {
  const features = (props.features ?? DEFAULT_VIEWER_FEATURES) as ViewerFeatures;
  const experimental = new Set((props.experimental ?? DEFAULT_EXPERIMENTAL_FEATURES) as ViewerFeatureId[]);
  const modes = baseRenderModes
    .filter((mode) => mode.id !== 4 || features.dualLight !== false)
    .map((mode) => ({ ...mode, experimental: false }));
  if (features.lineDrawing !== false && props.rtiType !== 4) {
    modes.push({
      ...lineDrawingMode,
      experimental: experimental.has('lineDrawing'),
    });
  }
  if (features.latentMap !== false && props.rtiType === 5) {
    modes.push({ ...latentRenderMode, experimental: experimental.has('latentMap') });
  }
  return modes;
});

function featureOn(id: ViewerFeatureId) {
  const features = (props.features ?? DEFAULT_VIEWER_FEATURES) as ViewerFeatures;
  return features[id] !== false;
}
</script>
