<template>
  <div ref="sidebarEl" class="w-16 bg-slate-800 border-r border-slate-700 flex flex-col relative z-50 shrink-0 self-stretch rounded-l-xl">
    <div class="flex flex-col items-center py-4 w-full">
      <SidebarTooltip title="Pan & Zoom" description="Navigate the image">
        <button aria-label="Pan & Zoom" @click="emit('set-mode', 'pan')" :class="['p-3 rounded-xl transition-all mb-2', currentMode === 'pan' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <HandIcon class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <SidebarTooltip title="Light Direction" description="Move the light source">
        <button aria-label="Light Direction" @click="emit('set-mode', 'light')" :class="['p-3 rounded-xl transition-all', currentMode === 'light' ? 'bg-yellow-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <LightbulbIcon class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <div v-if="annotationEnabled" class="relative mb-2 flex flex-col items-center">
        <SidebarTooltip title="Annotate" :description="activeShapeHint">
          <button
            aria-label="Annotate"
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

      <SidebarTooltip title="White Balance" description="Click a white or gray patch">
        <button aria-label="White Balance" @click="emit('toggle-white-balance')" :class="['p-3 rounded-xl transition-all mb-2', currentMode === 'whitebalance' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <PipetteIcon class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <div class="w-8 h-px bg-slate-700 my-4"></div>

      <SidebarTooltip
        v-for="mode in renderModes"
        :key="mode.id"
        :title="mode.title"
        :description="mode.description"
      >
        <button
          :aria-label="mode.title"
          @click="emit('set-render-mode', mode.id)"
          :class="['p-3 rounded-xl transition-all mb-2', renderMode === mode.id ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white']"
        >
          <component :is="mode.icon" class="w-5 h-5" />
        </button>
      </SidebarTooltip>

      <div class="mt-auto flex flex-col items-center w-full">
        <div class="w-8 h-px bg-slate-700 my-4"></div>
        <SidebarTooltip :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'" description="Maximize workspace">
          <button :aria-label="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'" @click="emit('toggle-fullscreen')" class="p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
            <component :is="isFullscreen ? MinimizeIcon : MaximizeIcon" class="w-5 h-5" />
          </button>
        </SidebarTooltip>
        <SidebarTooltip title="Download Render" description="Save current view as PNG">
          <button aria-label="Download Render" @click="emit('export-image')" class="p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
            <DownloadIcon class="w-5 h-5" />
          </button>
        </SidebarTooltip>
        <SidebarTooltip title="Copy Link" description="Share view with exact angles">
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
import SidebarTooltip from './SidebarTooltip.vue';

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
</script>
