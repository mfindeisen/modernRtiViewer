<template>
  <div
    ref="rootWrapper"
    class="relative flex flex-row max-lg:flex-col w-full h-full min-h-0 lg:min-h-[49rem] bg-slate-900 rounded-xl shadow-2xl border border-slate-700 outline-none"
    tabindex="0"
  >

    <ViewerSidebar
      ref="sidebarComponentRef"
      :current-mode="currentMode"
      :render-mode="renderMode"
      :annotation-enabled="annotationUiEnabled"
      :annotation-shape="annotationShape"
      :annotation-color="annotationColor"
      :annotation-stroke-width="annotationStrokeWidth"
      :shape-menu-open="shapeMenuOpen"
      :active-shape-hint="activeShapeOption.hint"
      :rti-type="rtiInfo?.type"
      :is-fullscreen="isFullscreen"
      :info-open="showInfo"
      :enhancements-open="showEnhancements"
      :scale-set="!!scaleCalibration"
      :features="viewerConfig.features"
      :experimental="viewerConfig.experimental"
      @set-mode="setMode"
      @toggle-annotate="toggleAnnotateMode"
      @select-annotation-shape="selectAnnotationShape"
      @select-annotation-color="selectAnnotationColor"
      @select-annotation-stroke-width="selectAnnotationStrokeWidth"
      @toggle-white-balance="toggleWhiteBalanceMode"
      @toggle-measure="toggleMeasureMode"
      @toggle-enhancements="showEnhancements = !showEnhancements"
      @set-render-mode="setRenderMode"
      @toggle-fullscreen="toggleFullscreen"
      @export-image="showExportModal = true"
      @copy-link="copyLink"
      @toggle-info="showInfo = !showInfo"
    />

    <ViewerInfoModal :open="showInfo" :dataset="datasetInfo() ?? undefined" @close="showInfo = false" />
    <ViewerExportModal
      :open="showExportModal"
      :include-annotations="exportIncludeAnnotations"
      :busy="exportBusy"
      :status="exportStatus"
      :mesh-available="meshExportAvailable"
      :drawing-available="drawingExportAvailable"
      :light-orbit-available="viewerConfig.features.lightOrbit"
      :drawing-experimental="viewerConfig.experimental.includes('lineDrawing')"
      :mesh-experimental="viewerConfig.experimental.includes('meshPreview')"
      @close="showExportModal = false"
      @update:include-annotations="exportIncludeAnnotations = $event"
      @snapshot="runExport('snapshot')"
      @full-res="runExport('full-res')"
      @clipboard="runExport('clipboard')"
      @video="runExport('video')"
      @mesh="runExport('mesh')"
      @drawing="runExport('drawing')"
    />
    <ViewerShareModal
      :open="showShareModal"
      :share-link="generatedShareLink"
      :copied="isCopied"
      @close="showShareModal = false"
      @copy="executeCopyLink"
    />
    <ViewerMeshPreview
      :open="showMeshPreview"
      :surface="meshPreview"
      @close="closeMeshPreview"
      @download="downloadMeshPly"
    />

    <div class="flex-1 relative overflow-hidden rounded-b-xl lg:rounded-r-xl lg:rounded-bl-none" ref="containerWrapper" @pointermove="onProbeMove">
      <div ref="container" class="absolute inset-0 z-0"></div>

      <div
        v-if="!loading && pendingTileCount > 0"
        class="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-black/50 text-white/80 text-[11px] backdrop-blur-sm pointer-events-none"
      >
        Loading {{ pendingTileCount }} tile{{ pendingTileCount === 1 ? '' : 's' }}…
      </div>

      <div
        v-if="currentMode === 'measure'"
        class="absolute inset-0 z-[19] touch-none cursor-crosshair"
        @pointerdown="onMeasurePointerDown"
        @pointermove="onMeasurePointerMove"
        @pointerup="onMeasurePointerUp"
        @pointercancel="onMeasurePointerUp"
      />

      <ViewerMeasureOverlay
        :visible="measureOverlayVisible"
        :overlay-size="overlaySize"
        :start="measureStartScreen"
        :end="measureEndScreen"
        :label="measureLabel"
      />

      <AnnotationOverlay
        ref="overlayComponentRef"
        :visible="annotationUiEnabled && !loading"
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
        @handle-down="onHandlePointerDown"
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

      <ViewerEnhancementsPanel
        :open="showEnhancements"
        :loading="loading"
        :diffuse-gain="diffuseGain"
        :unsharp-amount="unsharpAmount"
        :specular-exponent="specularExponent"
        :specular-intensity="specularIntensity"
        :dual-mode="renderMode === 4"
        :dual-linked="dualLinked"
        :line-drawing-mode="renderMode === 5"
        :ridge-threshold="ridgeThreshold"
        :valley-threshold="valleyThreshold"
        :line-width="lineWidth"
        :stack-below-white-balance="(currentMode === 'whitebalance' || whiteBalanceActive) && !loading"
        @update:diffuse-gain="onDiffuseGainChange"
        @update:unsharp-amount="onUnsharpAmountChange"
        @update:specular-exponent="onSpecularExponentChange"
        @update:specular-intensity="onSpecularIntensityChange"
        @update:ridge-threshold="onRidgeThresholdChange"
        @update:valley-threshold="onValleyThresholdChange"
        @update:line-width="onLineWidthChange"
        @update:dual-linked="setDualLinked"
        @reset="resetShading"
      />

      <ViewerScalePanel
        :open="currentMode === 'measure'"
        :ready="scalePanelReady"
        :distance-label="measureLabel"
        :pixel-label="measurePixelLabel"
        :default-unit="scaleCalibration?.unit || 'mm'"
        :has-scale="!!scaleCalibration"
        :scale-editable="scaleEditable"
        @save="confirmScale"
      />

      <div
        v-if="!loading && !error"
        class="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] left-[max(1.5rem,env(safe-area-inset-left,0px))] z-20 flex items-end gap-2.5"
      >
        <LightCompass ref="compassComponentRef" :light-dir="lightDir" :light-dir2="lightDir2" :dual-mode="renderMode === 4" />
        <ViewerLightAnimControls
          v-if="viewerConfig.features.lightOrbit"
          :playing="lightPlaying"
          :mode="lightAnimMode"
          :speed="lightAnimSpeed"
          @toggle="lightAnimation.toggle()"
          @update:mode="lightAnimation.setMode($event)"
          @update:speed="lightAnimation.setSpeed($event)"
        />
      </div>
      <ViewerShortcutsPanel
        :open="showShortcuts"
        :annotation-enabled="annotationUiEnabled"
        :rti-type="rtiInfo?.type"
        :features="viewerConfig.features"
        @close="showShortcuts = false"
      />
      <ViewerHud
        :visible="!loading && !error"
        :zoom-percent="hudZoomPercent"
        :light-x="hudLightX"
        :light-y="hudLightY"
        :probe-rgb="hudProbeRgb"
        :shortcuts-open="showShortcuts"
        @fit="fitToView"
        @reset-light="resetLight"
        @toggle-shortcuts="showShortcuts = !showShortcuts"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import ViewerSidebar from './ViewerSidebar.vue';
import ViewerInfoModal from './ViewerInfoModal.vue';
import ViewerShareModal from './ViewerShareModal.vue';
import ViewerMeshPreview from './ViewerMeshPreview.vue';
import ViewerWhiteBalancePanel from './ViewerWhiteBalancePanel.vue';
import ViewerEnhancementsPanel from './ViewerEnhancementsPanel.vue';
import ViewerExportModal from './ViewerExportModal.vue';
import ViewerMeasureOverlay from './ViewerMeasureOverlay.vue';
import ViewerLightAnimControls from './ViewerLightAnimControls.vue';
import ViewerScalePanel from './ViewerScalePanel.vue';
import LightCompass from './LightCompass.vue';
import ViewerHud from './ViewerHud.vue';
import ViewerShortcutsPanel from './ViewerShortcutsPanel.vue';
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
  scaleEditable: {
    type: Boolean,
    default: true,
  },
  tileFormat: {
    type: String,
    required: false,
    default: '',
  },
  features: {
    type: [Object, String],
    default: null,
  },
});

const emit = defineEmits(['annotation-create', 'rti-loaded', 'annotation-click', 'annotation-update', 'view-change', 'rti-export', 'scale-change']);

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
  lightDir2,
  rtiInfo,
  datasetInfo,
  renderMode,
  specularExponent,
  specularIntensity,
  diffuseGain,
  unsharpAmount,
  dualLinked,
  ridgeThreshold,
  valleyThreshold,
  lineWidth,
  setRenderMode,
  onSpecularExponentChange,
  onSpecularIntensityChange,
  onDiffuseGainChange,
  onUnsharpAmountChange,
  onRidgeThresholdChange,
  onValleyThresholdChange,
  onLineWidthChange,
  setDualLinked,
  resetShading,
  overlayShapes,
  overlaySize,
  overlayComponentRef,
  annotationShape,
  annotationColor,
  annotationStrokeWidth,
  shapeMenuOpen,
  selectedAnnotationId,
  activeShapeOption,
  shapeInteractionClass,
  onShapeClick,
  onAnnotationPointerDown,
  onAnnotationPointerMove,
  onAnnotationPointerUp,
  onAnnotationWheel,
  onHandlePointerDown,
  selectAnnotationColor,
  selectAnnotationStrokeWidth,
  toggleAnnotateMode,
  selectAnnotationShape,
  toggleWhiteBalanceMode,
  toggleMeasureMode,
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
  copyLink,
  executeCopyLink,
  toggleFullscreen,
  setMode,
  fitToView,
  resetLight,
  showShortcuts,
  showEnhancements,
  showExportModal,
  exportIncludeAnnotations,
  exportBusy,
  exportStatus,
  meshExportAvailable,
  drawingExportAvailable,
  showMeshPreview,
  meshPreview,
  closeMeshPreview,
  downloadMeshPly,
  runExport,
  lightAnimation,
  lightPlaying,
  lightAnimMode,
  lightAnimSpeed,
  pendingTileCount,
  measureOverlayVisible,
  measureStartScreen,
  measureEndScreen,
  measureLabel,
  measurePixelLabel,
  scaleCalibration,
  scalePanelReady,
  confirmScale,
  onMeasurePointerDown,
  onMeasurePointerMove,
  onMeasurePointerUp,
  onProbeMove,
  hudZoomPercent,
  hudLightX,
  hudLightY,
  hudProbeRgb,
  mount,
  unmount,
  onAnnotationEnabledChange,
  onUrlChange,
  viewerConfig,
  annotationUiEnabled,
} = viewer;

onMounted(mount);
onBeforeUnmount(unmount);
watch(() => props.annotationEnabled, onAnnotationEnabledChange);
watch(() => props.url, onUrlChange);
</script>
