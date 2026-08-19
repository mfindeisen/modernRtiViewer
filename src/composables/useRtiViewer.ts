import { ref, computed, nextTick, shallowRef, toRef, watch } from 'vue';
import * as THREE from 'three';
import { useRtiRenderer } from './useRtiRenderer.js';
import { useAnnotations } from './useAnnotations.js';
import { useRtiInteraction } from './useRtiInteraction.js';
import { useWhiteBalance } from './useWhiteBalance.js';
import { useViewerChrome } from './useViewerChrome.js';
import { useRenderSettings } from './useRenderSettings.js';
import { useViewerKeyboard } from './useViewerKeyboard.js';
import { FRONT_LIGHT, nudgeLightDir, oppositeLightDir } from '../lib/lightDirection.js';
import { computeFitToViewZoom, formatZoomPercent } from '../lib/cameraFit.js';
import {
  rtiTypeLabel,
  supportsMeshExport,
  supportsLineDrawing,
  RENDER_MODE_LINE_DRAWING,
  RENDER_MODE_LATENT,
} from '../lib/rtiEnhancements.js';
import { resolveViewerConfig, isFeatureEnabled } from '../lib/viewerConfig.js';
import { DEFAULT_RENDER_MODE } from './useRenderSettings.js';
import { useLightAnimation } from './useLightAnimation.js';
import {
  imagePixelDistance,
  formatPixelDistance,
  formatCalibratedDistance,
  isMeaningfulMeasure,
  parseScaleCalibration,
  pixelsPerUnitFromKnown,
  type MeasureUnit,
  type ScaleCalibration,
} from '../lib/measureDistance.js';
import { pixelSizeFromCalibration, type ReconstructedSurface } from '../lib/surfaceFromNormals.js';
import {
  copyPngDataUrl,
  downloadDataUrl,
  compositeDataUrlWithAnnotations,
  compositeDataUrlWithOverlay,
  blobToObjectUrlDownload,
} from '../lib/exportView.js';
import { worldToScreen, imageNormToWorld } from '../lib/annotationCoords.js';

import type { RtiViewState } from '../types/rti.js';
import type { UseRtiViewerOptions, ViewerMode } from './types.js';

export function useRtiViewer({
  props,
  emit,
  rootWrapper,
  sidebarComponentRef,
  compassComponentRef,
  containerWrapper,
  container,
}: UseRtiViewerOptions) {
  const loading = ref(true);
  const error = ref('');
  const currentMode = ref<ViewerMode>('pan');
  const viewerConfig = computed(() => resolveViewerConfig(props.features));
  const annotationUiEnabled = computed(() => !!props.annotationEnabled && isFeatureEnabled(viewerConfig.value, 'annotations'));
  const colorGainVector = new THREE.Vector3(1, 1, 1);
  const lightDir = ref(new THREE.Vector3(FRONT_LIGHT.x, FRONT_LIGHT.y, FRONT_LIGHT.z));
  const lightDir2 = ref(new THREE.Vector3(-FRONT_LIGHT.x, -FRONT_LIGHT.y, FRONT_LIGHT.z));

  const meshUpdaters = {
    setRenderModeOnMeshes: () => {},
    updateSpecularOnMeshes: () => {},
    updateEnhancementsOnMeshes: () => {},
  };

  const {
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
    updateSpecular,
    updateEnhancements,
    onSpecularExponentChange,
    onSpecularIntensityChange,
    onDiffuseGainChange,
    onUnsharpAmountChange,
    onRidgeThresholdChange,
    onValleyThresholdChange,
    onLineWidthChange,
    setDualLinked,
    resetShading,
  } = useRenderSettings(meshUpdaters);

  const rendererHooks = {
    onFrame() {},
    onResize() {},
  };

  const rtiRenderer = useRtiRenderer({
    containerWrapper,
    container,
    url: toRef(props, 'url'),
    tileFormat: toRef(props, 'tileFormat'),
    lightDir,
    lightDir2,
    renderMode,
    specularExponent,
    specularIntensity,
    diffuseGain,
    unsharpAmount,
    dualLinked,
    ridgeThreshold,
    valleyThreshold,
    lineWidth,
    colorGainVector,
    getPanEnabled: () => currentMode.value === 'pan',
    debug: props.debug === 'true',
    onResize: () => rendererHooks.onResize(),
    onFrame: () => rendererHooks.onFrame(),
  });

  const {
    rtiInfo,
    renderer,
    camera,
    controls,
    quadtree,
    fetchRtiInfo,
    initQuadtree,
    init: initRenderer,
    dispose: disposeRenderer,
    resize: resizeRenderer,
    setControlMode,
    updateColorGainOnMeshes,
    applyUrlView,
    exportPng,
    exportFullResolution,
    reconstructSurface,
    recordOrbitVideo,
    sampleColorAtScreen,
    readPixelAtScreen,
    requestRender,
    fitToView,
    zoomBy,
    pendingTileCount,
  } = rtiRenderer;

  Object.assign(meshUpdaters, {
    setRenderModeOnMeshes: rtiRenderer.setRenderModeOnMeshes,
    updateSpecularOnMeshes: rtiRenderer.updateSpecularOnMeshes,
    updateEnhancementsOnMeshes: rtiRenderer.updateEnhancementsOnMeshes,
  });

  let captureRtiViewFn: () => RtiViewState = () => ({});

  const annotations = useAnnotations({
    enabled: () => annotationUiEnabled.value,
    currentMode,
    renderer,
    camera,
    quadtree,
    onCreate: (payload) => emit('annotation-create', payload),
    onUpdate: (ann) => emit('annotation-update', ann),
    onClick: (ann) => emit('annotation-click', ann),
    captureRtiView: () => captureRtiViewFn(),
  });

  const {
    overlayShapes,
    overlaySize,
    overlayComponentRef,
    annotationShape,
    annotationColor,
    annotationStrokeWidth,
    shapeMenuOpen,
    selectedAnnotationId,
    activeShapeOption,
    syncOverlaySize,
    updateOverlayShapes,
    clearDrawingState,
    toggleAnnotateMode: toggleAnnotateModeBase,
    selectAnnotationShape: selectAnnotationShapeBase,
    selectAnnotationColor,
    selectAnnotationStrokeWidth,
    pointerToImageNorm,
    shapeInteractionClass,
    onShapeClick,
    onAnnotationPointerDown,
    onAnnotationPointerMove,
    onAnnotationPointerUp,
    onAnnotationWheel,
    onHandlePointerDown,
  } = annotations;

  const whiteBalance = useWhiteBalance({
    currentMode,
    colorGainVector,
    updateColorGainOnMeshes,
    pointerToImageNorm,
    sampleColorAtScreen,
  });

  const {
    colorGain,
    wbPickFeedback,
    whiteBalanceActive,
    gainMin,
    gainMax,
    updateColorGain,
    pick: pickWhiteBalance,
    reset: resetWhiteBalance,
    onColorGainUpdate,
    clearFeedback: clearWbFeedback,
    applyColorGain,
  } = whiteBalance;

  const interaction = useRtiInteraction({
    currentMode,
    lightDir,
    container,
    getRenderer: () => renderer.value,
    getCompassEl: () => {
      const exposed = compassComponentRef.value?.compassEl as unknown;
      if (exposed instanceof HTMLElement) return exposed;
      if (exposed && typeof exposed === 'object' && 'value' in (exposed as object)) {
        const inner = (exposed as { value: unknown }).value;
        if (inner instanceof HTMLElement) return inner;
      }
      return undefined;
    },
    setControlMode,
    onLeaveAnnotate: clearDrawingState,
    onLeaveWhiteBalance: clearWbFeedback,
    onLeaveMeasure: () => clearMeasure(),
    onWhiteBalancePick: pickWhiteBalance,
    onLightChange: () => {
      lightAnimation.pause();
      requestRender();
    },
    getDualMode: () => renderMode.value === 4,
    lightDir2,
    dualLinked,
    onDualUnlink: () => setDualLinked(false),
  });

  const { setMode, toggleWhiteBalanceMode, setup: setupInteraction, dispose: disposeInteraction } = interaction;

  const showEnhancements = ref(false);

  function isRenderModeAllowed(mode: number) {
    const features = viewerConfig.value.features;
    if (mode === 4) return features.dualLight;
    if (mode === RENDER_MODE_LINE_DRAWING) return features.lineDrawing;
    if (mode === RENDER_MODE_LATENT) return features.latentMap;
    return true;
  }

  function setViewerRenderMode(mode: number) {
    const next = isRenderModeAllowed(mode) ? mode : DEFAULT_RENDER_MODE;
    setRenderMode(next);
    if (next === 1 || next === RENDER_MODE_LINE_DRAWING) showEnhancements.value = true;
  }

  const chrome = useViewerChrome({
    rootWrapper,
    sidebarComponentRef,
    shareUrl: toRef(props, 'shareUrl'),
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
    exportPng: (options) => exportSnapshot(options),
    setRenderMode: setViewerRenderMode,
    updateSpecular,
    updateEnhancements,
    updateColorGain,
    setMode,
    fitToView,
    requestRender,
    onViewRestored: () => {
      updateOverlayShapes();
      requestRender();
    },
    hostHandlers: {
      onSetAnnotations: annotations.setAnnotations,
      onResize: resizeRenderer,
      onSelectAnnotation: annotations.selectAnnotation,
      onExport: (dataUrl) => emit('rti-export', dataUrl),
      onSetScale: applyScale,
    },
  });

  const {
    showInfo,
    showShareModal,
    generatedShareLink,
    isCopied,
    isFullscreen,
    getCaptureState,
    exportImage,
    copyLink,
    executeCopyLink,
    toggleFullscreen,
    syncToolbarMinHeight,
    observeSidebarResize,
    attachGlobalListeners,
    attachHostCommands,
    dispose: disposeChrome,
  } = chrome;

  captureRtiViewFn = getCaptureState;

  const hudZoomPercent = ref(100);
  const hudLightX = ref('0.00');
  const hudLightY = ref('0.00');
  const hudProbeRgb = ref('');
  const showShortcuts = ref(false);
  const showExportModal = ref(false);
  const exportIncludeAnnotations = ref(false);
  const exportBusy = ref(false);
  const exportStatus = ref('');
  const showMeshPreview = ref(false);
  const meshPreview = shallowRef<ReconstructedSurface | null>(null);
  const measureStart = ref<{ x: number; y: number } | null>(null);
  const measureEnd = ref<{ x: number; y: number } | null>(null);
  const measureStartScreen = ref<{ x: number; y: number } | null>(null);
  const measureEndScreen = ref<{ x: number; y: number } | null>(null);
  const measureLabel = ref('');
  const measurePixelLabel = ref('');
  const scaleCalibration = ref<ScaleCalibration | null>(null);
  let viewChangeTimer: ReturnType<typeof setTimeout> | null = null;
  let measureDrawing = false;

  const lightAnimation = useLightAnimation({ lightDir, requestRender });

  function updateHud() {
    const cam = camera.value;
    const info = rtiInfo.value;
    const wrap = containerWrapper.value;
    if (cam && info && wrap) {
      const fit = computeFitToViewZoom(wrap.clientWidth, wrap.clientHeight, info.width, info.height);
      hudZoomPercent.value = formatZoomPercent(cam.zoom, fit);
    }
    hudLightX.value = lightDir.value.x.toFixed(2);
    hudLightY.value = lightDir.value.y.toFixed(2);
    syncMeasureScreens();
  }

  function emitViewChange() {
    const view = getCaptureState();
    emit('view-change', view);
    rootWrapper.value?.dispatchEvent(new CustomEvent('view-change', {
      detail: view,
      bubbles: true,
    }));
  }

  function scheduleViewChange() {
    if (viewChangeTimer) clearTimeout(viewChangeTimer);
    viewChangeTimer = setTimeout(emitViewChange, 160);
  }

  function syncLinkedDualLight() {
    if (!dualLinked.value) return;
    const opposite = oppositeLightDir(lightDir.value);
    lightDir2.value.set(opposite.x, opposite.y, opposite.z);
    updateEnhancements();
  }

  function datasetInfo() {
    const info = rtiInfo.value;
    if (!info) return null;
    return {
      typeLabel: rtiTypeLabel(info.type),
      width: info.width,
      height: info.height,
      tileSize: info.tileSize,
      format: info.isTiff ? 'TIFF' : (info.format || 'jpg'),
    };
  }

  async function exportSnapshot(options?: { fullRes?: boolean; includeAnnotations?: boolean; lineDrawing?: boolean }) {
    const include = options?.includeAnnotations ?? exportIncludeAnnotations.value;
    const dataUrl = (options?.fullRes || options?.lineDrawing)
      ? await exportFullResolution({ lineDrawing: options?.lineDrawing })
      : exportPng();
    if (!dataUrl) return null;
    if (!include) return dataUrl;
    if (options?.fullRes) {
      return compositeDataUrlWithAnnotations(dataUrl, annotations.displayedAnnotations.value);
    }
    return compositeDataUrlWithOverlay(dataUrl, overlayShapes.value, overlaySize.value);
  }

  async function runExport(kind: 'snapshot' | 'full-res' | 'clipboard' | 'video' | 'mesh' | 'drawing') {
    const features = viewerConfig.value.features;
    if (!features.export) return;
    if (kind === 'drawing' && !features.lineDrawing) return;
    if (kind === 'mesh' && !features.meshPreview) return;
    if (kind === 'video' && !features.lightOrbit) return;
    exportBusy.value = true;
    exportStatus.value = kind === 'full-res' || kind === 'drawing'
      ? 'Rendering full resolution…'
      : kind === 'mesh'
        ? 'Reconstructing 3D surface…'
        : 'Working…';
    try {
      if (kind === 'video') {
        lightAnimation.setMode('orbit');
        lightAnimation.play();
        const blob = await recordOrbitVideo(4000, () => {});
        lightAnimation.pause();
        blobToObjectUrlDownload(blob, `rti_orbit_${Date.now()}.webm`);
        exportStatus.value = 'Saved orbit video';
        return;
      }
      if (kind === 'mesh') {
        exportStatus.value = 'Capturing normals and integrating surface…';
        meshPreview.value = await reconstructSurface(pixelSizeFromCalibration(scaleCalibration.value));
        showExportModal.value = false;
        showMeshPreview.value = true;
        exportStatus.value = '';
        return;
      }
      const dataUrl = await exportSnapshot({
        fullRes: kind === 'full-res' || kind === 'drawing',
        lineDrawing: kind === 'drawing',
      });
      if (!dataUrl) {
        exportStatus.value = 'Export failed';
        return;
      }
      if (kind === 'clipboard') {
        await copyPngDataUrl(dataUrl);
        exportStatus.value = 'Copied to clipboard';
        return;
      }
      downloadDataUrl(
        dataUrl,
        kind === 'drawing' ? `rti_drawing_${Date.now()}.png` : `rti_export_${Date.now()}.png`,
      );
      exportStatus.value = kind === 'drawing' ? 'Saved line drawing' : 'Saved PNG';
    } catch (err: unknown) {
      exportStatus.value = err instanceof Error ? err.message : 'Export failed';
    } finally {
      exportBusy.value = false;
    }
  }

  function projectNorm(nx: number, ny: number) {
    if (!quadtree.value || !camera.value || !renderer.value) return null;
    const world = imageNormToWorld(nx, ny, quadtree.value);
    if (!world) return null;
    return worldToScreen(world.x, world.y, camera.value, renderer.value.domElement);
  }

  function syncMeasureScreens() {
    if (!measureStart.value) measureStartScreen.value = null;
    else measureStartScreen.value = projectNorm(measureStart.value.x, measureStart.value.y);
    if (!measureEnd.value) measureEndScreen.value = null;
    else measureEndScreen.value = projectNorm(measureEnd.value.x, measureEnd.value.y);
    const info = rtiInfo.value;
    if (measureStart.value && measureEnd.value && info) {
      const px = imagePixelDistance(measureStart.value, measureEnd.value, info.width, info.height);
      measurePixelLabel.value = formatPixelDistance(px);
      measureLabel.value = formatCalibratedDistance(px, scaleCalibration.value);
    } else {
      measurePixelLabel.value = '';
      measureLabel.value = '';
    }
  }

  function measurePixelLength() {
    const info = rtiInfo.value;
    if (!measureStart.value || !measureEnd.value || !info) return 0;
    return imagePixelDistance(measureStart.value, measureEnd.value, info.width, info.height);
  }

  function clearMeasure() {
    measureDrawing = false;
    measureStart.value = null;
    measureEnd.value = null;
    measureStartScreen.value = null;
    measureEndScreen.value = null;
    measureLabel.value = '';
    measurePixelLabel.value = '';
  }

  function isLengthTool() {
    return currentMode.value === 'measure';
  }

  const measureOverlayVisible = computed(() => (
    isLengthTool() && isMeaningfulMeasure(measurePixelLength())
  ));

  const scalePanelReady = computed(() => (
    currentMode.value === 'measure' && isMeaningfulMeasure(measurePixelLength())
  ));

  function onMeasurePointerDown(e: PointerEvent) {
    if (!isLengthTool()) return;
    const pt = pointerToImageNorm(e);
    if (!pt) return;
    measureDrawing = true;
    measureStart.value = pt;
    measureEnd.value = pt;
    syncMeasureScreens();
    e.preventDefault();
  }

  function onMeasurePointerMove(e: PointerEvent) {
    if (!isLengthTool() || !measureDrawing) return;
    const pt = pointerToImageNorm(e);
    if (!pt) return;
    measureEnd.value = pt;
    syncMeasureScreens();
  }

  function onMeasurePointerUp() {
    measureDrawing = false;
    if (!isMeaningfulMeasure(measurePixelLength())) clearMeasure();
  }

  function onProbeMove(e: PointerEvent) {
    if (loading.value) return;
    const sample = readPixelAtScreen(e.clientX, e.clientY);
    if (!sample) return;
    hudProbeRgb.value = [sample.r, sample.g, sample.b]
      .map((channel) => String(Math.round(channel * 255)).padStart(3, '0'))
      .join(' ');
  }

  function toggleMeasureMode() {
    if (currentMode.value === 'measure') {
      setMode('pan');
      return;
    }
    setMode('measure');
  }

  function applyScale(value: unknown) {
    scaleCalibration.value = parseScaleCalibration(value);
    syncMeasureScreens();
  }

  function confirmScale(payload: { knownLength: number; unit: MeasureUnit }) {
    const pixelLength = measurePixelLength();
    const pixelsPerUnit = pixelsPerUnitFromKnown(pixelLength, payload.knownLength);
    if (!pixelsPerUnit) return;
    const next: ScaleCalibration = {
      pixelsPerUnit,
      unit: payload.unit,
      knownLength: payload.knownLength,
      pixelLength,
    };
    scaleCalibration.value = next;
    emit('scale-change', next);
    syncMeasureScreens();
  }

  function applyNudgeLight(dx: number, dy: number) {
    const next = nudgeLightDir(lightDir.value, dx, dy);
    lightDir.value.set(next.x, next.y, next.z);
    requestRender();
  }

  function resetLight() {
    lightDir.value.set(FRONT_LIGHT.x, FRONT_LIGHT.y, FRONT_LIGHT.z);
    const opposite = oppositeLightDir(lightDir.value);
    lightDir2.value.set(opposite.x, opposite.y, opposite.z);
    requestRender();
    updateHud();
  }

  function closeMeshPreview() {
    showMeshPreview.value = false;
    meshPreview.value = null;
  }

  function downloadMeshPly() {
    const ply = meshPreview.value?.ply;
    if (!ply) return;
    blobToObjectUrlDownload(new Blob([new Uint8Array(ply)]), `rti_surface_${Date.now()}.ply`);
  }

  function handleEscape() {
    if (showMeshPreview.value) {
      closeMeshPreview();
      return;
    }
    if (showShortcuts.value) {
      showShortcuts.value = false;
      return;
    }
    if (showShareModal.value) {
      showShareModal.value = false;
      return;
    }
    if (showExportModal.value) {
      showExportModal.value = false;
      return;
    }
    if (showEnhancements.value) {
      showEnhancements.value = false;
      return;
    }
    if (showInfo.value) {
      showInfo.value = false;
      return;
    }
    clearDrawingState();
    if (currentMode.value !== 'pan') setMode('pan');
  }

  const keyboard = useViewerKeyboard({
    root: rootWrapper,
    getAnnotationEnabled: () => annotationUiEnabled.value,
    getRtiType: () => rtiInfo.value?.type,
    getFeatures: () => viewerConfig.value.features,
    onCommand(command) {
      if (command.type === 'interaction-mode') {
        if (command.mode === 'annotate') {
          toggleAnnotateMode();
          return;
        }
        if (command.mode === 'whitebalance') {
          toggleWhiteBalanceMode();
          return;
        }
        setMode(command.mode);
        return;
      }
      if (command.type === 'measure') {
        toggleMeasureMode();
        return;
      }
      if (command.type === 'enhancements') {
        if (!viewerConfig.value.features.enhancements) return;
        showEnhancements.value = !showEnhancements.value;
        return;
      }
      if (command.type === 'toggle-animation') {
        if (!viewerConfig.value.features.lightOrbit) return;
        lightAnimation.toggle();
        return;
      }
      if (command.type === 'render-mode') {
        setViewerRenderMode(command.mode);
        return;
      }
      if (command.type === 'nudge-light') {
        applyNudgeLight(command.dx, command.dy);
        return;
      }
      if (command.type === 'zoom') {
        zoomBy(command.factor);
        return;
      }
      if (command.type === 'fit') {
        fitToView();
        return;
      }
      if (command.type === 'reset-light') {
        resetLight();
        return;
      }
      if (command.type === 'shortcuts') {
        showShortcuts.value = !showShortcuts.value;
        return;
      }
      if (command.type === 'export') {
        if (!viewerConfig.value.features.export) return;
        showExportModal.value = true;
        return;
      }
      handleEscape();
    },
  });

  rendererHooks.onFrame = () => {
    syncLinkedDualLight();
    updateOverlayShapes();
    updateHud();
    scheduleViewChange();
  };
  rendererHooks.onResize = () => {
    syncOverlaySize();
    updateOverlayShapes();
    updateHud();
  };

  const toggleAnnotateMode = () => toggleAnnotateModeBase(setMode);
  const selectAnnotationShape = (shapeId: string) => selectAnnotationShapeBase(shapeId, setMode);

  let isMounted = false;
  let loadedUrl = '';

  async function loadDataset() {
    loading.value = true;
    error.value = '';
    disposeInteraction();
    disposeRenderer();
    annotations.setAnnotations([]);
    clearDrawingState();
    applyColorGain({ r: 1, g: 1, b: 1 });
    clearWbFeedback();
    lightDir.value.set(FRONT_LIGHT.x, FRONT_LIGHT.y, FRONT_LIGHT.z);
    lightDir2.value.set(-FRONT_LIGHT.x, -FRONT_LIGHT.y, FRONT_LIGHT.z);
    lightAnimation.pause();
    resetShading();
    if (currentMode.value !== 'pan') setMode('pan');

    await fetchRtiInfo();
    initQuadtree();
    const urlView = initRenderer();
    const restoredGain = applyUrlView(urlView);
    if (restoredGain) {
      applyColorGain(restoredGain);
    } else if (rtiInfo.value?.colorGain) {
      applyColorGain(rtiInfo.value.colorGain);
    }

    loading.value = false;
    await nextTick();
    setupInteraction();
    syncOverlaySize();
    syncToolbarMinHeight();
    updateOverlayShapes();

    if (rootWrapper.value) {
      rootWrapper.value.dispatchEvent(new CustomEvent('rti-loaded', {
        detail: rtiInfo.value,
        bubbles: true,
      }));
    }
    emit('rti-loaded', rtiInfo.value);
  }

  async function mount() {
    try {
      isMounted = true;
      loadedUrl = props.url;
      await loadDataset();
      attachHostCommands();
      observeSidebarResize();
      attachGlobalListeners();
      keyboard.setup();
      updateHud();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      loading.value = false;
    }
  }

  async function onUrlChange(newUrl: string) {
    if (!isMounted || !newUrl || newUrl === loadedUrl) return;
    loadedUrl = newUrl;
    if (typeof window !== 'undefined' && window.location.hash) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    try {
      await loadDataset();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      loading.value = false;
    }
  }

  function unmount() {
    isMounted = false;
    loadedUrl = '';
    if (viewChangeTimer) clearTimeout(viewChangeTimer);
    lightAnimation.dispose();
    keyboard.dispose();
    disposeChrome();
    disposeInteraction();
    disposeRenderer();
  }

  function onAnnotationEnabledChange(enabled: boolean) {
    if (!enabled && currentMode.value === 'annotate') {
      setMode('pan');
    }
    if (enabled) {
      nextTick(syncOverlaySize);
    }
  }

  watch(() => viewerConfig.value.features, (features) => {
    if (!features.annotations && currentMode.value === 'annotate') setMode('pan');
    if (!features.whiteBalance && currentMode.value === 'whitebalance') setMode('pan');
    if (!features.measure && currentMode.value === 'measure') setMode('pan');
    if (!features.enhancements) showEnhancements.value = false;
    if (!features.export) showExportModal.value = false;
    if (!features.share) showShareModal.value = false;
    if (!features.meshPreview) {
      showMeshPreview.value = false;
      meshPreview.value = null;
    }
    if (!isRenderModeAllowed(renderMode.value)) setViewerRenderMode(DEFAULT_RENDER_MODE);
  }, { deep: true });

  return {
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
    setRenderMode: setViewerRenderMode,
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
    exportImage,
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
    meshExportAvailable: computed(() => (
      viewerConfig.value.features.meshPreview && supportsMeshExport(rtiInfo.value?.type)
    )),
    drawingExportAvailable: computed(() => (
      viewerConfig.value.features.lineDrawing && supportsLineDrawing(rtiInfo.value?.type)
    )),
    showMeshPreview,
    meshPreview,
    closeMeshPreview,
    downloadMeshPly,
    runExport,
    lightAnimation,
    lightPlaying: lightAnimation.playing,
    lightAnimMode: lightAnimation.mode,
    lightAnimSpeed: lightAnimation.speed,
    pendingTileCount,
    measureOverlayVisible,
    measureStartScreen,
    measureEndScreen,
    measureLabel,
    measurePixelLabel,
    onMeasurePointerDown,
    onMeasurePointerMove,
    onMeasurePointerUp,
    scaleCalibration,
    scalePanelReady,
    confirmScale,
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
  };
}
