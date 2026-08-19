import { ref } from 'vue';
import { buildShareUrl } from '../lib/viewerUrl.js';
import { captureRtiView, applyRtiView } from '../lib/viewerViewState.js';

import type { UseViewerChromeOptions, ViewerMode } from './types.js';
import type { Annotation } from '../types/rti.js';

export function useViewerChrome({
  rootWrapper,
  sidebarComponentRef,
  shareUrl,
  lightDir,
  lightDir2,
  renderMode,
  specularExponent,
  specularIntensity,
  diffuseGain,
  unsharpAmount,
  exposure,
  dualLinked,
  colorGain,
  camera,
  controls,
  exportPng,
  setRenderMode,
  updateSpecular,
  updateEnhancements,
  updateColorGain,
  setMode,
  fitToView,
  requestRender,
  onViewRestored,
  hostHandlers,
}: UseViewerChromeOptions) {
  const showInfo = ref(false);
  const showShareModal = ref(false);
  const generatedShareLink = ref('');
  const isCopied = ref(false);
  const isFullscreen = ref(false);

  let hostCommandHandler: ((event: Event) => void) | null = null;
  let sidebarResizeObserver: ResizeObserver | null = null;
  let fullscreenChangeHandler: (() => void) | null = null;

  function syncFullscreenState() {
    isFullscreen.value = document.fullscreenElement === rootWrapper.value;
  }

  function handleFullscreenChange() {
    syncFullscreenState();
  }

  function attachGlobalListeners() {
    fullscreenChangeHandler = handleFullscreenChange;
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    syncFullscreenState();
  }

  function getCaptureState() {
    return captureRtiView({
      lightDir: lightDir.value,
      lightDir2: lightDir2?.value,
      renderMode: renderMode.value,
      specularExponent: specularExponent.value,
      specularIntensity: specularIntensity?.value,
      diffuseGain: diffuseGain?.value,
      unsharpAmount: unsharpAmount?.value,
      exposure: exposure?.value,
      dualLinked: dualLinked?.value,
      colorGain: colorGain.value,
      camera: camera.value,
      controls: controls.value,
    });
  }

  function restoreView(view: Parameters<typeof applyRtiView>[0]) {
    applyRtiView(view, {
      lightDir,
      lightDir2,
      renderMode,
      specularExponent,
      specularIntensity,
      diffuseGain,
      unsharpAmount,
      exposure,
      dualLinked,
      colorGain,
      camera,
      controls,
      setRenderMode,
      updateSpecular,
      updateEnhancements,
      updateColorGain,
      onApplied: onViewRestored,
    });
  }

  async function exportImage() {
    const dataURL = await exportPng();
    if (!dataURL) return;
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `rti_export_${Date.now()}.png`;
    link.click();
  }

  function copyLink() {
    if (!camera.value) return;
    const base = shareUrl.value || `${window.location.origin}${window.location.pathname}`;
    generatedShareLink.value = buildShareUrl(base, {
      camera: {
        cx: camera.value.position.x,
        cy: camera.value.position.y,
        zoom: camera.value.zoom,
      },
      lightDir: {
        x: lightDir.value.x,
        y: lightDir.value.y,
        z: lightDir.value.z,
      },
      lightDir2: lightDir2 ? {
        x: lightDir2.value.x,
        y: lightDir2.value.y,
        z: lightDir2.value.z,
      } : undefined,
      renderMode: renderMode.value,
      specularExponent: specularExponent.value,
      specularIntensity: specularIntensity?.value,
      diffuseGain: diffuseGain?.value,
      unsharpAmount: unsharpAmount?.value,
      exposure: exposure?.value,
      dualLinked: dualLinked?.value,
      colorGain: colorGain.value,
    });
    isCopied.value = false;
    showShareModal.value = true;
  }

  async function executeCopyLink() {
    try {
      await navigator.clipboard.writeText(generatedShareLink.value);
      isCopied.value = true;
      setTimeout(() => {
        isCopied.value = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy link. Please select the text and copy it manually.');
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      rootWrapper.value?.requestFullscreen?.().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
      return;
    }
    document.exitFullscreen?.();
  }

  function syncToolbarMinHeight() {
    const sidebar = sidebarComponentRef.value?.sidebarEl;
    const root = rootWrapper.value;
    if (!sidebar || !root) return;
    const host = root.closest('modern-rti-viewer') as HTMLElement | null;

    // On mobile the parent flex chain caps height to the viewport; forcing
    // sidebar scrollHeight as min-height clips the toolbar and light compass.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      root.style.minHeight = '';
      if (host) host.style.minHeight = '';
      return;
    }

    const minH = sidebar.scrollHeight;
    root.style.minHeight = `${minH}px`;
    if (host) host.style.minHeight = `${minH}px`;
  }

  function observeSidebarResize() {
    if (!sidebarComponentRef.value?.sidebarEl) return;
    sidebarResizeObserver = new ResizeObserver(() => syncToolbarMinHeight());
    sidebarResizeObserver.observe(sidebarComponentRef.value.sidebarEl);
  }

  function attachHostCommands() {
    const host = rootWrapper.value?.closest('modern-rti-viewer') as ModernRtiViewerElementHost | null;
    if (!host) return;

    hostCommandHandler = (event: Event) => {
      const { type, ...payload } = (event as CustomEvent).detail || {};
      if (type === 'set-annotations') {
        const list = payload.annotations || [];
        host._pendingAnnotations = list;
        hostHandlers.onSetAnnotations(list as Annotation[]);
      } else if (type === 'restore-view') {
        restoreView(payload.rtiView);
      } else if (type === 'resize') {
        hostHandlers.onResize();
      } else if (type === 'select-annotation') {
        hostHandlers.onSelectAnnotation(payload.id ?? null);
      } else if (type === 'set-light') {
        const dir = (payload.lightDir || payload) as { x?: number; y?: number; z?: number };
        if (typeof dir.x === 'number' && typeof dir.y === 'number') {
          const z = typeof dir.z === 'number'
            ? dir.z
            : Math.sqrt(Math.max(0, 1 - dir.x * dir.x - dir.y * dir.y));
          lightDir.value.set(dir.x, dir.y, z).normalize();
          requestRender();
          onViewRestored?.();
        }
      } else if (type === 'set-render-mode' && typeof payload.mode === 'number') {
        setRenderMode(payload.mode);
      } else if (type === 'set-interaction-mode' && isInteractionMode(payload.mode)) {
        setMode(payload.mode);
      } else if (type === 'fit') {
        fitToView();
      } else if (type === 'reset-light') {
        lightDir.value.set(0, 0, 1);
        requestRender();
        onViewRestored?.();
      } else if (type === 'set-scale') {
        hostHandlers.onSetScale?.(payload.scale ?? payload);
      } else if (type === 'set-annotation-overlays-visible') {
        hostHandlers.onSetAnnotationOverlaysVisible?.(payload.visible !== false);
      } else if (type === 'export') {
        void (async () => {
          if (payload.download === false) {
            const dataUrl = await exportPng({
              fullRes: !!payload.fullRes,
              includeAnnotations: !!payload.includeAnnotations,
            });
            hostHandlers.onExport?.(typeof dataUrl === 'string' ? dataUrl : null);
            return;
          }
          await exportImage();
        })();
      }
    };

    host.addEventListener('rti-command', hostCommandHandler);

    if (host._pendingAnnotations?.length) {
      hostHandlers.onSetAnnotations(host._pendingAnnotations as Annotation[]);
    }
  }

  function dispose() {
    if (fullscreenChangeHandler) {
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
      fullscreenChangeHandler = null;
    }
    if (hostCommandHandler) {
      const host = rootWrapper.value?.closest('modern-rti-viewer') as ModernRtiViewerElementHost | null;
      host?.removeEventListener('rti-command', hostCommandHandler);
      hostCommandHandler = null;
    }
    sidebarResizeObserver?.disconnect();
    sidebarResizeObserver = null;
  }

  return {
    showInfo,
    showShareModal,
    generatedShareLink,
    isCopied,
    isFullscreen,
    getCaptureState,
    restoreView,
    exportImage,
    copyLink,
    executeCopyLink,
    toggleFullscreen,
    syncToolbarMinHeight,
    observeSidebarResize,
    attachGlobalListeners,
    attachHostCommands,
    dispose,
  };
}

function isInteractionMode(value: unknown): value is ViewerMode {
  return value === 'pan' || value === 'light' || value === 'annotate' || value === 'whitebalance' || value === 'measure';
}
