import { ref } from 'vue';
import { buildShareUrl } from '../lib/viewerUrl.js';
import { captureRtiView, applyRtiView } from '../lib/viewerViewState.js';

import type { UseViewerChromeOptions } from './types.js';
import type { Annotation } from '../types/rti.js';

export function useViewerChrome({
  rootWrapper,
  sidebarComponentRef,
  shareUrl,
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
      renderMode: renderMode.value,
      specularExponent: specularExponent.value,
      colorGain: colorGain.value,
      camera: camera.value,
      controls: controls.value,
    });
  }

  function restoreView(view: Parameters<typeof applyRtiView>[0]) {
    applyRtiView(view, {
      lightDir,
      renderMode,
      specularExponent,
      colorGain,
      camera,
      controls,
      setRenderMode,
      updateSpecular,
      updateColorGain,
      onApplied: onViewRestored,
    });
  }

  function exportImage() {
    const dataURL = exportPng();
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
      renderMode: renderMode.value,
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
    const minH = sidebar.scrollHeight;
    root.style.minHeight = `${minH}px`;
    const host = root.closest('modern-rti-viewer');
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
