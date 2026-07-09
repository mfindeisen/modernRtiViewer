<template>
  <div ref="rootWrapper" class="relative flex flex-row w-full h-full min-h-0 lg:min-h-[49rem] bg-slate-900 rounded-xl shadow-2xl border border-slate-700">

    <ViewerSidebar
      ref="sidebarComponentRef"
      :current-mode="currentMode"
      :render-mode="renderMode"
      :annotation-enabled="annotationEnabled"
      :annotation-shape="annotationShape"
      :annotation-color="annotationColor"
      :shape-menu-open="shapeMenuOpen"
      :active-shape-hint="activeShapeOption.hint"
      :rti-type="rtiInfo?.type"
      :is-fullscreen="isFullscreen"
      :info-open="showInfo"
      @set-mode="setMode"
      @toggle-annotate="toggleAnnotateMode"
      @select-annotation-shape="selectAnnotationShape"
      @select-annotation-color="selectAnnotationColor"
      @toggle-white-balance="toggleWhiteBalanceMode"
      @set-render-mode="setRenderMode"
      @toggle-fullscreen="toggleFullscreen"
      @export-image="exportImage"
      @copy-link="copyLink"
      @toggle-info="showInfo = !showInfo"
    />

    <ViewerInfoModal :open="showInfo" @close="showInfo = false" />
    <ViewerShareModal
      :open="showShareModal"
      :share-link="generatedShareLink"
      :copied="isCopied"
      @close="showShareModal = false"
      @copy="executeCopyLink"
    />

    <div class="flex-1 relative overflow-hidden rounded-r-xl" ref="containerWrapper">
      <div ref="container" class="absolute inset-0 z-0"></div>

      <AnnotationOverlay
        ref="overlayComponentRef"
        :visible="annotationEnabled && !loading"
        :interactive="currentMode === 'annotate'"
        :shapes="overlayShapes"
        :overlay-size="overlaySize"
        :selected-id="selectedAnnotationId"
        :interaction-class="shapeInteractionClass"
        @pointerdown="onAnnotationPointerDown"
        @pointermove="onAnnotationPointerMove"
        @pointerup="onAnnotationPointerUp"
        @wheel="onAnnotationWheel"
        @shape-click="onShapeClick"
      />

      <div v-if="loading && !error" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-white font-medium">Loading RTI Data...</p>
      </div>

      <div v-if="error" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-20 px-6 text-center">
        <p class="text-red-400 font-semibold text-lg mb-2">Failed to load RTI</p>
        <p class="text-slate-300 text-sm max-w-md">{{ error }}</p>
      </div>

      <ViewerWhiteBalancePanel
        :current-mode="currentMode"
        :loading="loading"
        :white-balance-active="whiteBalanceActive"
        :color-gain="colorGain"
        :gain-min="gainMin"
        :gain-max="gainMax"
        :pick-feedback="wbPickFeedback"
        @update:color-gain="onColorGainUpdate"
        @reset="resetWhiteBalance"
      />

      <ViewerGlossyPanel
        :visible="renderMode === 1"
        :loading="loading"
        :specular-exponent="specularExponent"
        :stack-below-white-balance="(currentMode === 'whitebalance' || whiteBalanceActive) && !loading"
        @update:specular-exponent="onSpecularExponentChange"
      />

      <LightCompass ref="compassComponentRef" :light-dir="lightDir" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import ViewerSidebar from './ViewerSidebar.vue';
import ViewerInfoModal from './ViewerInfoModal.vue';
import ViewerShareModal from './ViewerShareModal.vue';
import ViewerWhiteBalancePanel from './ViewerWhiteBalancePanel.vue';
import ViewerGlossyPanel from './ViewerGlossyPanel.vue';
import LightCompass from './LightCompass.vue';
import AnnotationOverlay from './AnnotationOverlay.vue';
import { useRtiViewer } from '../composables/useRtiViewer.js';

const props = defineProps({
  url: {
    type: String,
    required: true,
    default: '/mock',
  },
  shareUrl: {
    type: String,
    required: false,
    default: '',
  },
  debug: {
    type: String,
    required: false,
    default: 'false',
  },
  annotationEnabled: {
    type: Boolean,
    default: false,
  },
  tileFormat: {
    type: String,
    required: false,
    default: '',
  },
});

const emit = defineEmits(['annotation-create', 'rti-loaded', 'annotation-click']);

const rootWrapper = ref<HTMLElement | null>(null);
const sidebarComponentRef = ref<{ sidebarEl?: HTMLElement } | null>(null);
const compassComponentRef = ref<{ compassEl?: HTMLElement } | null>(null);
const containerWrapper = ref<HTMLElement | null>(null);
const container = ref<HTMLElement | null>(null);

const viewer = useRtiViewer({
  props,
  emit,
  rootWrapper,
  sidebarComponentRef,
  compassComponentRef,
  containerWrapper,
  container,
});

const {
  loading,
  error,
  currentMode,
  lightDir,
  rtiInfo,
  renderMode,
  specularExponent,
  setRenderMode,
  onSpecularExponentChange,
  overlayShapes,
  overlaySize,
  overlayComponentRef,
  annotationShape,
  annotationColor,
  shapeMenuOpen,
  selectedAnnotationId,
  activeShapeOption,
  shapeInteractionClass,
  onShapeClick,
  onAnnotationPointerDown,
  onAnnotationPointerMove,
  onAnnotationPointerUp,
  onAnnotationWheel,
  selectAnnotationColor,
  toggleAnnotateMode,
  selectAnnotationShape,
  toggleWhiteBalanceMode,
  colorGain,
  wbPickFeedback,
  whiteBalanceActive,
  gainMin,
  gainMax,
  onColorGainUpdate,
  resetWhiteBalance,
  showInfo,
  showShareModal,
  generatedShareLink,
  isCopied,
  isFullscreen,
  exportImage,
  copyLink,
  executeCopyLink,
  toggleFullscreen,
  setMode,
  mount,
  unmount,
  onAnnotationEnabledChange,
  onUrlChange,
} = viewer;

onMounted(mount);
onBeforeUnmount(unmount);
watch(() => props.annotationEnabled, onAnnotationEnabledChange);
watch(() => props.url, onUrlChange);
</script>
