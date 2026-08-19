import type { Ref } from 'vue';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { QuadtreeManager } from '../lib/QuadtreeManager.js';
import type { LineDrawingStyle } from '../lib/rtiEnhancements.js';
import type {
  Annotation,
  AnnotationCreatePayload,
  ColorGain,
  RtiInfo,
  RtiViewState,
} from '../types/rti.js';

export type ViewerMode = 'pan' | 'light' | 'annotate' | 'whitebalance' | 'measure';

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
    scaleEditable?: boolean;
    tileFormat?: string;
    features?: unknown;
  };
  emit: (event: 'annotation-create' | 'rti-loaded' | 'annotation-click' | 'annotation-update' | 'view-change' | 'rti-export' | 'scale-change', ...args: unknown[]) => void;
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
  setControlMode: (mode: ViewerMode) => void;
  onLeaveAnnotate?: () => void;
  onLeaveWhiteBalance?: () => void;
  onLeaveMeasure?: () => void;
  onWhiteBalancePick?: (e: PointerEvent) => void;
  onLightChange?: () => void;
  getDualMode?: () => boolean;
  lightDir2?: Ref<THREE.Vector3>;
  dualLinked?: Ref<boolean>;
  onDualUnlink?: () => void;
}

export interface UseAnnotationsOptions {
  enabled: () => boolean;
  currentMode: Ref<ViewerMode>;
  renderer: Ref<{ domElement: HTMLCanvasElement } | null>;
  camera: Ref<THREE.OrthographicCamera | null>;
  quadtree: Ref<QuadtreeManager | null>;
  onCreate: (payload: AnnotationCreatePayload) => void;
  onUpdate?: (ann: Annotation) => void;
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
  tileFormat?: Ref<string | undefined>;
  lightDir: Ref<THREE.Vector3>;
  renderMode: Ref<number>;
  specularExponent: Ref<number>;
  specularIntensity?: Ref<number>;
  diffuseGain?: Ref<number>;
  unsharpAmount?: Ref<number>;
  exposure?: Ref<number>;
  dualLinked?: Ref<boolean>;
  lightDir2?: Ref<THREE.Vector3>;
  ridgeThreshold?: Ref<number>;
  valleyThreshold?: Ref<number>;
  lineWidth?: Ref<number>;
  lineOutline?: Ref<number>;
  lineHatch?: Ref<number>;
  lineDrawingStyle?: Ref<LineDrawingStyle>;
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
  specularIntensity?: Ref<number>;
  diffuseGain?: Ref<number>;
  unsharpAmount?: Ref<number>;
  exposure?: Ref<number>;
  dualLinked?: Ref<boolean>;
  lightDir2?: Ref<THREE.Vector3>;
  colorGain: Ref<ColorGain>;
  camera: Ref<THREE.OrthographicCamera | null>;
  controls: Ref<OrbitControls | null>;
  exportPng: (options?: { fullRes?: boolean; includeAnnotations?: boolean }) => Promise<string | null> | string | null;
  recordOrbitVideo?: (durationMs: number, onTick: (elapsedMs: number) => void) => Promise<Blob>;
  setRenderMode: (mode: number) => void;
  updateSpecular: () => void;
  updateEnhancements?: () => void;
  updateColorGain: () => void;
  setMode: (mode: ViewerMode) => void;
  fitToView: () => void;
  requestRender: () => void;
  onViewRestored?: () => void;
  hostHandlers: {
    onSetAnnotations: (list: Annotation[]) => void;
    onResize: () => void;
    onSelectAnnotation: (id: string | number | null) => void;
    onExport?: (dataUrl: string | null) => void;
    onSetScale?: (value: unknown) => void;
    onSetAnnotationOverlaysVisible?: (visible: boolean) => void;
  };
}
