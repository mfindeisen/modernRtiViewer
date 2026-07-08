import { ref, nextTick, toRef } from 'vue';
import * as THREE from 'three';
import { useRtiRenderer } from './useRtiRenderer.js';
import { useAnnotations } from './useAnnotations.js';
import { useRtiInteraction } from './useRtiInteraction.js';
import { useWhiteBalance } from './useWhiteBalance.js';
import { useViewerChrome } from './useViewerChrome.js';
import { useRenderSettings } from './useRenderSettings.js';

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
  const colorGainVector = new THREE.Vector3(1, 1, 1);
  const lightDir = ref(new THREE.Vector3(0, 0, 1));

  const meshUpdaters = {
    setRenderModeOnMeshes: () => {},
    updateSpecularOnMeshes: () => {},
  };

  const {
    renderMode,
    specularExponent,
    setRenderMode,
    updateSpecular,
    onSpecularExponentChange,
  } = useRenderSettings(meshUpdaters);

  const rendererHooks = {
    onFrame() {},
    onResize() {},
  };

  const rtiRenderer = useRtiRenderer({
    containerWrapper,
    container,
    url: toRef(props, 'url'),
    lightDir,
    renderMode,
    specularExponent,
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
    setControlsEnabled,
    updateColorGainOnMeshes,
    applyUrlView,
    exportPng,
    sampleColorAtScreen,
  } = rtiRenderer;

  Object.assign(meshUpdaters, {
    setRenderModeOnMeshes: rtiRenderer.setRenderModeOnMeshes,
    updateSpecularOnMeshes: rtiRenderer.updateSpecularOnMeshes,
  });

  let captureRtiViewFn: () => RtiViewState = () => ({});

  const annotations = useAnnotations({
    enabled: () => !!props.annotationEnabled,
    currentMode,
    renderer,
    camera,
    quadtree,
    onCreate: (payload) => emit('annotation-create', payload),
    onClick: (ann) => emit('annotation-click', ann),
    captureRtiView: () => captureRtiViewFn(),
  });

  const {
    overlayShapes,
    overlaySize,
    annotationShape,
    annotationColor,
    shapeMenuOpen,
    selectedAnnotationId,
    activeShapeOption,
    syncOverlaySize,
    updateOverlayShapes,
    clearDrawingState,
    toggleAnnotateMode: toggleAnnotateModeBase,
    selectAnnotationShape: selectAnnotationShapeBase,
    selectAnnotationColor,
    pointerToImageNorm,
    shapeInteractionClass,
    onShapeClick,
    onAnnotationPointerDown,
    onAnnotationPointerMove,
    onAnnotationPointerUp,
    onAnnotationWheel,
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
    getCompassEl: () => compassComponentRef.value?.compassEl,
    setControlsEnabled,
    onLeaveAnnotate: clearDrawingState,
    onLeaveWhiteBalance: clearWbFeedback,
    onWhiteBalancePick: pickWhiteBalance,
  });

  const { setMode, toggleWhiteBalanceMode, setup: setupInteraction, dispose: disposeInteraction } = interaction;

  const chrome = useViewerChrome({
    rootWrapper,
    sidebarComponentRef,
    shareUrl: toRef(props, 'shareUrl'),
    lightDir,
    renderMode,
    specularExponent,
    colorGain,
    camera,
    controls,
    exportPng,
    setRenderMode,
    updateSpecular,
    updateColorGain,
    onViewRestored: updateOverlayShapes,
    hostHandlers: {
      onSetAnnotations: annotations.setAnnotations,
      onResize: resizeRenderer,
      onSelectAnnotation: annotations.selectAnnotation,
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

  rendererHooks.onFrame = () => updateOverlayShapes();
  rendererHooks.onResize = () => {
    syncOverlaySize();
    updateOverlayShapes();
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
    if (currentMode.value !== 'pan') setMode('pan');

    await fetchRtiInfo();
    initQuadtree();
    const urlView = initRenderer();
    const restoredGain = applyUrlView(urlView);
    if (restoredGain) applyColorGain(restoredGain);
    setupInteraction();

    loading.value = false;
    await nextTick();
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
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
      loading.value = false;
    }
  }

  async function onUrlChange(newUrl: string) {
    if (!isMounted || !newUrl || newUrl === loadedUrl) return;
    loadedUrl = newUrl;
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

  return {
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
  };
}
