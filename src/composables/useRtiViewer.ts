import { ref, nextTick, toRef } from 'vue';
import * as THREE from 'three';
import { useRtiRenderer } from './useRtiRenderer.js';
import { useAnnotations } from './useAnnotations.js';
import { useRtiInteraction } from './useRtiInteraction.js';
import { useWhiteBalance } from './useWhiteBalance.js';
import { useViewerChrome } from './useViewerChrome.js';
import { useRenderSettings } from './useRenderSettings.js';
import { useViewerKeyboard } from './useViewerKeyboard.js';
import { FRONT_LIGHT, nudgeLightDir } from '../lib/lightDirection.js';
import { computeFitToViewZoom, formatZoomPercent } from '../lib/cameraFit.js';

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
  const lightDir = ref(new THREE.Vector3(FRONT_LIGHT.x, FRONT_LIGHT.y, FRONT_LIGHT.z));

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
    setControlMode,
    updateColorGainOnMeshes,
    applyUrlView,
    exportPng,
    sampleColorAtScreen,
    requestRender,
    fitToView,
    zoomBy,
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
    overlayComponentRef,
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
    setControlMode,
    onLeaveAnnotate: clearDrawingState,
    onLeaveWhiteBalance: clearWbFeedback,
    onWhiteBalancePick: pickWhiteBalance,
    onLightChange: requestRender,
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
  const showShortcuts = ref(false);
  let viewChangeTimer: ReturnType<typeof setTimeout> | null = null;

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

  function applyNudgeLight(dx: number, dy: number) {
    const next = nudgeLightDir(lightDir.value, dx, dy);
    lightDir.value.set(next.x, next.y, next.z);
    requestRender();
  }

  function resetLight() {
    lightDir.value.set(FRONT_LIGHT.x, FRONT_LIGHT.y, FRONT_LIGHT.z);
    requestRender();
    updateHud();
  }

  function handleEscape() {
    if (showShortcuts.value) {
      showShortcuts.value = false;
      return;
    }
    if (showShareModal.value) {
      showShareModal.value = false;
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
    getAnnotationEnabled: () => !!props.annotationEnabled,
    getMaxRenderMode: () => (rtiInfo.value?.type === 5 ? 5 : 4),
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
      if (command.type === 'render-mode') {
        setRenderMode(command.mode);
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
        exportImage();
        return;
      }
      handleEscape();
    },
  });

  rendererHooks.onFrame = () => {
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
    fitToView,
    resetLight,
    showShortcuts,
    hudZoomPercent,
    hudLightX,
    hudLightY,
    mount,
    unmount,
    onAnnotationEnabledChange,
    onUrlChange,
  };
}
