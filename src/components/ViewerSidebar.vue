<template>
  <div ref="sidebarEl" class="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 relative z-50 shrink-0 self-stretch">
    <button @click="emit('set-mode', 'pan')" :class="['group relative p-3 rounded-xl transition-all mb-2', currentMode === 'pan' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
      <HandIcon class="w-5 h-5" />
      <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
        <span class="text-white font-bold mb-0.5">Pan & Zoom</span>
        <span class="text-white/60">Navigate the image</span>
      </div>
    </button>
    <button @click="emit('set-mode', 'light')" :class="['group relative p-3 rounded-xl transition-all', currentMode === 'light' ? 'bg-yellow-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
      <LightbulbIcon class="w-5 h-5" />
      <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
        <span class="text-white font-bold mb-0.5">Light Direction</span>
        <span class="text-white/60">Move the light source</span>
      </div>
    </button>

    <div v-if="annotationEnabled" class="relative mb-2 flex flex-col items-center">
      <button
        type="button"
        @click="emit('toggle-annotate')"
        :class="['group relative p-3 rounded-xl transition-all', currentMode === 'annotate' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']"
      >
        <component :is="shapeIcons[annotationShape as keyof typeof shapeIcons]" class="w-5 h-5" />
        <span
          class="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-white/90 shadow-sm"
          :style="{ backgroundColor: annotationColor }"
        />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Annotate</span>
          <span class="text-white/60">{{ activeShapeHint }}</span>
        </div>
      </button>
      <div
        v-if="currentMode === 'annotate' && shapeMenuOpen"
        class="absolute left-full top-0 ml-2 z-[60] w-44 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-2xl py-1.5"
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
            @click="emit('select-annotation-color', color)"
          />
        </div>
      </div>
    </div>

    <div class="w-8 h-px bg-slate-700 my-4"></div>

    <button @click="emit('toggle-white-balance')" :class="['group relative p-3 rounded-xl transition-all mb-2', currentMode === 'whitebalance' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
      <PipetteIcon class="w-5 h-5" />
      <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
        <span class="text-white font-bold mb-0.5">White Balance</span>
        <span class="text-white/60">Click a white or gray patch</span>
      </div>
    </button>

    <div class="w-8 h-px bg-slate-700 my-4"></div>

    <button
      v-for="mode in renderModes"
      :key="mode.id"
      @click="emit('set-render-mode', mode.id)"
      :class="['group relative p-3 rounded-xl transition-all mb-2', renderMode === mode.id ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white']"
    >
      <component :is="mode.icon" class="w-5 h-5" />
      <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
        <span class="text-white font-bold mb-0.5">{{ mode.title }}</span>
        <span class="text-white/60">{{ mode.description }}</span>
      </div>
    </button>

    <div v-if="renderMode === 1" class="group relative mt-4 flex flex-col items-center w-full px-2">
      <input
        type="range"
        min="2"
        max="50"
        :value="specularExponent"
        class="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        style="writing-mode: bt-lr; transform: rotate(270deg); width: 60px; margin-top: 30px; margin-bottom: 30px;"
        @input="onSpecularInput"
      >
      <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
        <span class="text-white font-bold mb-0.5">Specular Intensity</span>
        <span class="text-white/60">Adjust surface wetness</span>
      </div>
    </div>

    <div class="mt-auto flex flex-col items-center w-full">
      <div class="w-8 h-px bg-slate-700 my-4"></div>
      <button @click="emit('toggle-fullscreen')" class="group relative p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
        <component :is="isFullscreen ? MinimizeIcon : MaximizeIcon" class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">{{ isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen' }}</span>
          <span class="text-white/60">Maximize workspace</span>
        </div>
      </button>
      <button @click="emit('export-image')" class="group relative p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
        <DownloadIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Download Render</span>
          <span class="text-white/60">Save current view as PNG</span>
        </div>
      </button>
      <button @click="emit('copy-link')" class="group relative p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
        <LinkIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Copy Link</span>
          <span class="text-white/60">Share view with exact angles</span>
        </div>
      </button>
      <button @click="emit('toggle-info')" :class="['group relative p-3 rounded-xl transition-all', infoOpen ? 'bg-white/20 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
        <InfoIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">About</span>
          <span class="text-white/60">Project credits</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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
  Circle as CircleIcon,
  CircleDot as CircleDotIcon,
  Square as SquareIcon,
  Pipette as PipetteIcon,
} from '@lucide/vue';
import { ANNOTATION_SHAPE_OPTIONS } from '../lib/annotationShapes.js';
import { ANNOTATION_COLOR_PRESETS } from '../lib/annotationColors.js';

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

const latentRenderMode = {
  id: 5,
  icon: LayersIcon,
  title: 'Latent Map',
  description: 'View raw learned latent map',
};

const props = defineProps({
  currentMode: { type: String, required: true },
  renderMode: { type: Number, required: true },
  specularExponent: { type: Number, required: true },
  annotationEnabled: { type: Boolean, default: false },
  annotationShape: { type: String, required: true },
  annotationColor: { type: String, required: true },
  shapeMenuOpen: { type: Boolean, default: false },
  activeShapeHint: { type: String, default: '' },
  rtiType: { type: Number, default: null },
  isFullscreen: { type: Boolean, default: false },
  infoOpen: { type: Boolean, default: false },
});

const emit = defineEmits([
  'set-mode',
  'toggle-annotate',
  'select-annotation-shape',
  'select-annotation-color',
  'toggle-white-balance',
  'set-render-mode',
  'update:specularExponent',
  'toggle-fullscreen',
  'export-image',
  'copy-link',
  'toggle-info',
]);

const sidebarEl = ref(null);
defineExpose({ sidebarEl });

const renderModes = computed(() => (
  props.rtiType === 5
    ? [...baseRenderModes, latentRenderMode]
    : baseRenderModes
));

function onSpecularInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:specularExponent', parseFloat(target.value));
}
</script>
