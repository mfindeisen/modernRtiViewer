import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, type Ref } from 'vue';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Annotation } from '@/types/rti.js';
import { useViewerChrome } from '@/composables/useViewerChrome.js';
import { mockVector3 } from '../testUtils.js';

describe('useViewerChrome', () => {
  let rootWrapper: HTMLDivElement;
  let hostHandlers: {
    onSetAnnotations: ReturnType<typeof vi.fn>;
    onResize: ReturnType<typeof vi.fn>;
    onSelectAnnotation: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    rootWrapper = document.createElement('div');
    document.body.appendChild(rootWrapper);

    hostHandlers = {
      onSetAnnotations: vi.fn(),
      onResize: vi.fn(),
      onSelectAnnotation: vi.fn(),
    };
  });

  afterEach(() => {
    rootWrapper?.remove();
  });

  function createChrome(overrides: Record<string, unknown> = {}) {
    const camera = ref({
      position: { x: 10, y: 20 },
      zoom: 2,
    }) as unknown as Ref<THREE.OrthographicCamera | null>;
    const controls = ref({
      target: { x: 10, y: 20 },
    }) as unknown as Ref<OrbitControls | null>;

    return {
      camera,
      controls,
      chrome: useViewerChrome({
        rootWrapper: ref(rootWrapper),
        sidebarComponentRef: ref(null),
        shareUrl: ref('https://example.com/share'),
        lightDir: ref(mockVector3()),
        renderMode: ref(1),
        specularExponent: ref(12),
        colorGain: ref({ r: 1, g: 1, b: 1 }),
        camera,
        controls,
        exportPng: vi.fn(() => 'data:image/png;base64,abc'),
        setRenderMode: vi.fn(),
        updateSpecular: vi.fn(),
        updateColorGain: vi.fn(),
        onViewRestored: vi.fn(),
        hostHandlers: hostHandlers as {
          onSetAnnotations: (list: Annotation[]) => void;
          onResize: () => void;
          onSelectAnnotation: (id: string | null) => void;
        },
        ...overrides,
      }),
    };
  }

  it('captures current viewer state', () => {
    const { chrome } = createChrome();
    const view = chrome.getCaptureState();

    expect(view.renderMode).toBe(1);
    expect(view.specularExponent).toBe(12);
    expect(view.camera?.cx).toBe(10);
    expect(view.camera?.cy).toBe(20);
    expect(view.camera?.zoom).toBe(2);
  });

  it('builds a share link and opens the modal', () => {
    const { chrome } = createChrome();
    chrome.copyLink();

    expect(chrome.showShareModal.value).toBe(true);
    expect(chrome.generatedShareLink.value).toContain('https://example.com/share');
    expect(chrome.generatedShareLink.value).toContain('cx=10');
    expect(chrome.isCopied.value).toBe(false);
  });

  it('copies the generated share link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const { chrome } = createChrome();
    chrome.generatedShareLink.value = 'https://example.com/view#x=1';
    await chrome.executeCopyLink();

    expect(writeText).toHaveBeenCalledWith('https://example.com/view#x=1');
    expect(chrome.isCopied.value).toBe(true);

    vi.unstubAllGlobals();
  });

  it('handles host rti-command events', () => {
    const host = document.createElement('modern-rti-viewer');
    document.body.appendChild(host);
    rootWrapper.remove();
    host.appendChild(rootWrapper);

    const { chrome } = createChrome();

    chrome.attachHostCommands();
    host.dispatchEvent(new CustomEvent('rti-command', {
      detail: { type: 'set-annotations', annotations: [{ id: '1', type: 'point', geometry: {} }] as Annotation[] },
    }));
    host.dispatchEvent(new CustomEvent('rti-command', {
      detail: { type: 'resize' },
    }));
    host.dispatchEvent(new CustomEvent('rti-command', {
      detail: { type: 'select-annotation', id: 'ann-1' },
    }));

    expect(hostHandlers.onSetAnnotations).toHaveBeenCalledWith([{ id: '1', type: 'point', geometry: {} }]);
    expect(hostHandlers.onResize).toHaveBeenCalled();
    expect(hostHandlers.onSelectAnnotation).toHaveBeenCalledWith('ann-1');
  });

  it('syncs fullscreen state from document events', () => {
    const { chrome } = createChrome();
    chrome.attachGlobalListeners();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: rootWrapper,
    });
    document.dispatchEvent(new Event('fullscreenchange'));

    expect(chrome.isFullscreen.value).toBe(true);

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    chrome.dispose();

    expect(chrome.isFullscreen.value).toBe(false);
  });
});
