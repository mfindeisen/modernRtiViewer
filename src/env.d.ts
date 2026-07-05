/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

interface ModernRtiViewerElement extends HTMLElement {
  _pendingAnnotations?: unknown[];
  _setUrl?: (val: string | null) => void;
  _setShareUrl?: (val: string | null) => void;
  _setAnnotationEnabled?: (val: boolean) => void;
  mountPoint?: HTMLDivElement;
  app?: import('vue').App;
}

declare global {
  interface Window {
    _lastLoggedZoom?: string;
  }

  interface ModernRtiViewerElementHost extends HTMLElement {
    _pendingAnnotations?: unknown[];
  }

  interface HTMLElementTagNameMap {
    'modern-rti-viewer': ModernRtiViewerElement;
  }
}

export {};
