import type { Ref } from 'vue';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { QuadtreeManager } from '../lib/QuadtreeManager.js';
import type {
  Annotation,
  AnnotationCreatePayload,
  ColorGain,
  RtiInfo,
  RtiViewState,
} from '../types/rti.js';

export type ViewerMode = 'pan' | 'light' | 'annotate' | 'whitebalance';

export interface AnnotationDraft {
  type: string;
  geometry: Record<string, unknown>;
}

export interface AnnotationOverlayExpose {
  overlayEl?: HTMLElement;
}

export interface UseRtiViewerOptions {
  props: {
    url: string;
    shareUrl?: string;
    debug?: string;
    annotationEnabled?: boolean;
  };
  emit: (event: 'annotation-create' | 'rti-loaded' | 'annotation-click', ...args: unknown[]) => void;
  rootWrapper: Ref<HTMLElement | null>;
  sidebarComponentRef: Ref<{ sidebarEl?: HTMLElement } | null>;
  compassComponentRef: Ref<{ compassEl?: HTMLElement } | null>;
  containerWrapper: Ref<HTMLElement | null>;
  container: Ref<HTMLElement | null>;
}

export interface UseRtiInteractionOptions {
  currentMode: Ref<ViewerMode>;
  lightDir: Ref<THREE.Vector3>;
  container: Ref<HTMLElement | null>;
  getRenderer: () => THREE.WebGLRenderer | null | undefined;
  getCompassEl?: () => HTMLElement | undefined;
  setControlsEnabled: (enabled: boolean) => void;
  onLeaveAnnotate?: () => void;
  onLeaveWhiteBalance?: () => void;
  onWhiteBalancePick?: (e: PointerEvent) => void;
}

export interface UseAnnotationsOptions {
  enabled: () => boolean;
  currentMode: Ref<ViewerMode>;
  renderer: Ref<{ domElement: HTMLCanvasElement } | null>;
  camera: Ref<THREE.OrthographicCamera | null>;
  quadtree: Ref<QuadtreeManager | null>;
  onCreate: (payload: AnnotationCreatePayload) => void;
  onClick: (ann: Annotation) => void;
  captureRtiView: () => RtiViewState;
}

export interface UseWhiteBalanceOptions {
  currentMode: Ref<ViewerMode>;
  colorGainVector: THREE.Vector3;
  updateColorGainOnMeshes: () => void;
  pointerToImageNorm: (e: PointerEvent) => { x: number; y: number } | null;
  sampleColorAtScreen: (clientX: number, clientY: number) => { r: number; g: number; b: number } | null;
}

export interface UseRtiRendererOptions {
  containerWrapper: Ref<HTMLElement | null>;
  container: Ref<HTMLElement | null>;
  url: Ref<string>;
  lightDir: Ref<THREE.Vector3>;
  renderMode: Ref<number>;
  specularExponent: Ref<number>;
  colorGainVector: THREE.Vector3;
  getPanEnabled: () => boolean;
  onResize?: () => void;
  onFrame?: () => void;
  debug?: boolean;
}

export interface UseViewerChromeOptions {
  rootWrapper: Ref<HTMLElement | null>;
  sidebarComponentRef: Ref<{ sidebarEl?: HTMLElement } | null>;
  shareUrl: Ref<string | undefined>;
  lightDir: Ref<THREE.Vector3>;
  renderMode: Ref<number>;
  specularExponent: Ref<number>;
  colorGain: Ref<ColorGain>;
  camera: Ref<THREE.OrthographicCamera | null>;
  controls: Ref<OrbitControls | null>;
  exportPng: () => string | null;
  setRenderMode: (mode: number) => void;
  updateSpecular: () => void;
  updateColorGain: () => void;
  onViewRestored?: () => void;
  hostHandlers: {
    onSetAnnotations: (list: Annotation[]) => void;
    onResize: () => void;
    onSelectAnnotation: (id: string | null) => void;
  };
}
