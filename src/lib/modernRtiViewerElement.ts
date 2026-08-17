import { createApp, ref, h } from 'vue';
import RtiViewer from '../components/RtiViewer.vue';
import { parseAnnotationEnabledAttr } from './webComponentAttrs.js';

import type { AnnotationCreatePayload } from '../types/rti.js';

export class ModernRtiViewerElement extends HTMLElement {
  _pendingAnnotations: unknown[] = [];
  mountPoint?: HTMLDivElement;
  app?: ReturnType<typeof createApp> | null;
  _setUrl?: (val: string | null) => void;
  _setShareUrl?: (val: string | null) => void;
  _setAnnotationEnabled?: (val: boolean) => void;
  _setTileFormat?: (val: string | null) => void;
  _setDebug?: (val: boolean) => void;

  static get observedAttributes() {
    return ['url', 'share-url', 'annotation-enabled', 'tile-format', 'debug'];
  }

  connectedCallback() {
    const host = this;
    host._pendingAnnotations = host._pendingAnnotations || [];

    this.mountPoint = document.createElement('div');
    this.mountPoint.style.width = '100%';
    this.mountPoint.style.height = '100%';
    this.appendChild(this.mountPoint);

    this.app = createApp({
      setup() {
        const url = ref(host.getAttribute('url') || '');
        const shareUrl = ref(host.getAttribute('share-url') || '');
        const annotationEnabled = ref(parseAnnotationEnabledAttr(host.getAttribute('annotation-enabled')));
        const tileFormat = ref(host.getAttribute('tile-format') || '');
        const debug = ref(host.getAttribute('debug') === 'true');

        host._setUrl = (val) => {
          url.value = val ?? '';
        };
        host._setShareUrl = (val) => {
          shareUrl.value = val ?? '';
        };
        host._setAnnotationEnabled = (val) => {
          annotationEnabled.value = val;
        };
        host._setTileFormat = (val) => {
          tileFormat.value = val ?? '';
        };
        host._setDebug = (val) => {
          debug.value = val;
        };

        return () => h(RtiViewer, {
          url: url.value,
          shareUrl: shareUrl.value,
          annotationEnabled: annotationEnabled.value,
          tileFormat: tileFormat.value,
          debug: debug.value ? 'true' : undefined,
          onAnnotationCreate(payload: AnnotationCreatePayload) {
            host.dispatchEvent(new CustomEvent('annotation-create', { detail: payload, bubbles: true }));
          },
          onRtiLoaded(detail: unknown) {
            host.dispatchEvent(new CustomEvent('rti-loaded', { detail, bubbles: true }));
          },
          onAnnotationClick(payload: unknown) {
            host.dispatchEvent(new CustomEvent('annotation-click', { detail: payload, bubbles: true }));
          },
        });
      },
    });
    this.app.mount(this.mountPoint);
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'url') {
      this._setUrl?.(newValue);
      return;
    }
    if (name === 'share-url') {
      this._setShareUrl?.(newValue);
      return;
    }
    if (name === 'annotation-enabled') {
      this._setAnnotationEnabled?.(parseAnnotationEnabledAttr(newValue));
      return;
    }
    if (name === 'tile-format') {
      this._setTileFormat?.(newValue);
      return;
    }
    if (name === 'debug') {
      this._setDebug?.(newValue === 'true');
    }
  }

  disconnectedCallback() {
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
    this.mountPoint?.remove();
    this.mountPoint = undefined;
    this._setUrl = undefined;
    this._setShareUrl = undefined;
    this._setAnnotationEnabled = undefined;
    this._setTileFormat = undefined;
    this._setDebug = undefined;
  }
}

export function registerModernRtiViewerElement() {
  if (!customElements.get('modern-rti-viewer')) {
    customElements.define('modern-rti-viewer', ModernRtiViewerElement);
  }
}
