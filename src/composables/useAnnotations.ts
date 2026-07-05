import { ref, computed } from 'vue';
import {
  worldToImageNorm,
  imageNormToWorld,
  worldToScreen,
  screenToWorld,
  imageNormRadiusToScreen,
} from '../lib/annotationCoords.js';
import {
  ANNOTATION_SHAPE_OPTIONS,
  normalizeAnnotationList,
  isValidDraft,
  isPointClick,
} from '../lib/annotationShapes.js';
import {
  loadAnnotationColor,
  saveAnnotationColor,
} from '../lib/annotationColors.js';
import { buildOverlayShapes } from '../lib/annotationOverlay.js';
import type { OverlayShape } from '../types/annotations.js';
import type { Annotation } from '../types/rti.js';
import type { AnnotationDraft, AnnotationOverlayExpose, UseAnnotationsOptions } from './types.js';

export function useAnnotations({
  enabled,
  currentMode,
  renderer,
  camera,
  quadtree,
  onCreate,
  onClick,
  captureRtiView,
}: UseAnnotationsOptions) {
  const overlayComponentRef = ref<AnnotationOverlayExpose | null>(null);
  const displayedAnnotations = ref<Annotation[]>([]);
  const overlayShapes = ref<OverlayShape[]>([]);
  const overlaySize = ref({ w: 1, h: 1 });
  const draftAnnotation = ref<AnnotationDraft | null>(null);
  const annotationShape = ref('circle');
  const annotationColor = ref(loadAnnotationColor());
  const shapeMenuOpen = ref(false);
  const selectedAnnotationId = ref<string | null>(null);

  let drawingAnnotation = false;
  let annotateStartNorm: { x: number; y: number } | null = null;

  const activeShapeOption = computed(() =>
    ANNOTATION_SHAPE_OPTIONS.find((o) => o.id === annotationShape.value)
      ?? ANNOTATION_SHAPE_OPTIONS[1],
  );

  function getOverlayEl() {
    return overlayComponentRef.value?.overlayEl ?? null;
  }

  function syncOverlaySize() {
    const overlay = getOverlayEl();
    if (!overlay) return;
    const { width, height } = overlay.getBoundingClientRect();
    const w = Math.round(width) || 1;
    const h = Math.round(height) || 1;
    if (overlaySize.value.w !== w || overlaySize.value.h !== h) {
      overlaySize.value = { w, h };
    }
  }

  function pointerToImageNorm(e: PointerEvent) {
    if (!renderer.value || !quadtree.value || !camera.value) return null;
    const rect = renderer.value.domElement.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, camera.value, renderer.value.domElement);
    if (!world) return null;
    const norm = worldToImageNorm(world.x, world.y, quadtree.value);
    if (!norm) return null;
    if (norm.x < 0 || norm.x > 1 || norm.y < 0 || norm.y > 1) return null;
    return norm;
  }

  function createProjectors() {
    const dom = renderer.value?.domElement;
    const qt = quadtree.value;
    const cam = camera.value;
    if (!dom || !qt || !cam) return null;

    return {
      normToScreen(nx: number, ny: number) {
        const world = imageNormToWorld(nx, ny, qt);
        if (!world) return null;
        return worldToScreen(world.x, world.y, cam, dom);
      },
      circleToScreen(center: number[], radius: number) {
        const world = imageNormToWorld(center[0], center[1], qt);
        if (!world) return null;
        const screen = worldToScreen(world.x, world.y, cam, dom);
        if (!screen) return null;
        const r = imageNormRadiusToScreen(radius, qt, cam, dom);
        return { cx: screen.x, cy: screen.y, r };
      },
    };
  }

  function updateOverlayShapes() {
    if (!enabled() || !renderer.value || !quadtree.value || !camera.value) {
      overlayShapes.value = [];
      return;
    }
    syncOverlaySize();
    const project = createProjectors();
    if (!project) {
      overlayShapes.value = [];
      return;
    }
    overlayShapes.value = buildOverlayShapes(
      displayedAnnotations.value,
      draftAnnotation.value,
      annotationColor.value,
      project,
    );
  }

  function setAnnotations(list: Annotation[]) {
    displayedAnnotations.value = normalizeAnnotationList(list);
    updateOverlayShapes();
  }

  function selectAnnotation(id: string | null) {
    selectedAnnotationId.value = id ?? null;
  }

  function clearDrawingState() {
    shapeMenuOpen.value = false;
    draftAnnotation.value = null;
    annotateStartNorm = null;
    drawingAnnotation = false;
  }

  function toggleAnnotateMode(setMode: (mode: 'annotate') => void) {
    if (currentMode.value === 'annotate') {
      shapeMenuOpen.value = !shapeMenuOpen.value;
      return;
    }
    setMode('annotate');
    shapeMenuOpen.value = true;
  }

  function selectAnnotationShape(shapeId: string, setMode: (mode: 'annotate') => void) {
    annotationShape.value = shapeId;
    shapeMenuOpen.value = false;
    setMode('annotate');
  }

  function selectAnnotationColor(color: string) {
    annotationColor.value = color;
    saveAnnotationColor(color);
  }

  function shapeInteractionClass(shape: OverlayShape) {
    if (shape.draft || currentMode.value === 'annotate') {
      return 'pointer-events-none';
    }
    if (!shape.annotationId) {
      return 'pointer-events-none';
    }
    return 'pointer-events-auto cursor-pointer';
  }

  function onShapeClick(shape: OverlayShape) {
    if (shape.draft || currentMode.value === 'annotate' || !shape.ann) return;
    selectedAnnotationId.value = shape.annotationId ?? null;
    onClick(shape.ann);
  }

  function finishAnnotation(type: string, geometry: Record<string, unknown>) {
    onCreate({
      type,
      geometry,
      color: annotationColor.value,
      rtiView: captureRtiView(),
    });
  }

  function onAnnotationPointerDown(e: PointerEvent) {
    if (currentMode.value !== 'annotate') return;
    e.stopPropagation();
    const pt = pointerToImageNorm(e);
    if (!pt) return;
    annotateStartNorm = pt;
    drawingAnnotation = true;
    getOverlayEl()?.setPointerCapture(e.pointerId);

    if (annotationShape.value === 'circle') {
      draftAnnotation.value = { type: 'circle', geometry: { center: [pt.x, pt.y], radius: 0 } };
    } else if (annotationShape.value === 'rectangle') {
      draftAnnotation.value = {
        type: 'rectangle',
        geometry: { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y },
      };
    } else {
      draftAnnotation.value = null;
    }
    updateOverlayShapes();
    e.preventDefault();
  }

  function onAnnotationPointerMove(e: PointerEvent) {
    if (!drawingAnnotation || !draftAnnotation.value) return;
    const point = pointerToImageNorm(e);
    if (!point) return;
    const draft = draftAnnotation.value;

    if (draft.type === 'circle') {
      const centerArr = draft.geometry.center as number[];
      const center = { x: centerArr[0], y: centerArr[1] };
      draftAnnotation.value = {
        type: 'circle',
        geometry: {
          center: draft.geometry.center,
          radius: Math.hypot(point.x - center.x, point.y - center.y),
        },
      };
    } else if (draft.type === 'rectangle') {
      draftAnnotation.value = {
        type: 'rectangle',
        geometry: {
          x1: draft.geometry.x1,
          y1: draft.geometry.y1,
          x2: point.x,
          y2: point.y,
        },
      };
    }
    updateOverlayShapes();
  }

  function onAnnotationPointerUp(e: PointerEvent) {
    if (!drawingAnnotation) return;
    drawingAnnotation = false;
    getOverlayEl()?.releasePointerCapture(e.pointerId);

    if (annotationShape.value === 'point') {
      const end = pointerToImageNorm(e);
      if (annotateStartNorm && end && isPointClick(annotateStartNorm, end)) {
        finishAnnotation('point', { position: [annotateStartNorm.x, annotateStartNorm.y] });
      }
      annotateStartNorm = null;
      updateOverlayShapes();
      return;
    }

    const draft = draftAnnotation.value;
    draftAnnotation.value = null;
    annotateStartNorm = null;
    if (!draft || !isValidDraft(draft.type, draft.geometry)) {
      updateOverlayShapes();
      return;
    }
    finishAnnotation(draft.type, draft.geometry);
    updateOverlayShapes();
  }

  return {
    overlayComponentRef,
    displayedAnnotations,
    overlayShapes,
    overlaySize,
    annotationShape,
    annotationColor,
    shapeMenuOpen,
    selectedAnnotationId,
    activeShapeOption,
    syncOverlaySize,
    updateOverlayShapes,
    setAnnotations,
    selectAnnotation,
    clearDrawingState,
    toggleAnnotateMode,
    selectAnnotationShape,
    selectAnnotationColor,
    pointerToImageNorm,
    shapeInteractionClass,
    onShapeClick,
    onAnnotationPointerDown,
    onAnnotationPointerMove,
    onAnnotationPointerUp,
  };
}
