import { ref, computed } from 'vue';
import {
  worldToImageNorm,
  imageNormToWorld,
  worldToScreen,
  screenToWorld,
  imageNormRadiusToScreen,
  imageNormCircleRadius,
  getImageWorldBounds,
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
  normalizeAnnotationColor,
} from '../lib/annotationColors.js';
import {
  loadAnnotationStrokeWidth,
  saveAnnotationStrokeWidth,
  normalizeAnnotationStrokeWidth,
} from '../lib/annotationStroke.js';
import { buildOverlayShapes } from '../lib/annotationOverlay.js';
import {
  applyAnnotationEdit,
  hitTestOverlayShape,
  type AnnotationEditHandle,
} from '../lib/annotationEdit.js';
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
  onUpdate,
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
  const annotationStrokeWidth = ref(loadAnnotationStrokeWidth());
  const shapeMenuOpen = ref(false);
  const selectedAnnotationId = ref<string | null>(null);
  const overlaysVisible = ref(true);

  let drawingAnnotation = false;
  let annotateStartNorm: { x: number; y: number } | null = null;
  let editing = false;
  let editHandle: AnnotationEditHandle | null = null;
  let editStartNorm: { x: number; y: number } | null = null;
  let editStartGeometry: Record<string, unknown> | null = null;
  let editAnnotation: Annotation | null = null;

  const activeShapeOption = computed(() =>
    ANNOTATION_SHAPE_OPTIONS.find((o) => o.id === annotationShape.value)
      ?? ANNOTATION_SHAPE_OPTIONS[1],
  );

  function getOverlayEl() {
    return overlayComponentRef.value?.overlayEl ?? null;
  }

  function syncOverlaySize() {
    const overlay = getOverlayEl();
    const rect = overlay?.getBoundingClientRect()
      ?? renderer.value?.domElement.getBoundingClientRect();
    if (!rect) return;
    const w = Math.round(rect.width) || 1;
    const h = Math.round(rect.height) || 1;
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
    if (!renderer.value || !quadtree.value || !camera.value) {
      overlayShapes.value = [];
      return;
    }
    const canvas = renderer.value.domElement;
    if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;
    syncOverlaySize();
    const project = createProjectors();
    if (!project) {
      overlayShapes.value = [];
      return;
    }
    overlayShapes.value = buildOverlayShapes(
      overlaysVisible.value ? displayedAnnotations.value : [],
      draftAnnotation.value,
      annotationColor.value,
      project,
      annotationStrokeWidth.value,
    );
  }

  function setOverlaysVisible(visible: boolean) {
    overlaysVisible.value = visible;
    updateOverlayShapes();
  }

  function toggleOverlaysVisible() {
    setOverlaysVisible(!overlaysVisible.value);
  }

  function setAnnotations(list: Annotation[]) {
    displayedAnnotations.value = normalizeAnnotationList(list);
    updateOverlayShapes();
  }

  function selectAnnotation(id: string | number | null) {
    selectedAnnotationId.value = id == null ? null : String(id);
  }

  function clearDrawingState() {
    shapeMenuOpen.value = false;
    draftAnnotation.value = null;
    annotateStartNorm = null;
    drawingAnnotation = false;
    editing = false;
    editHandle = null;
    editStartNorm = null;
    editStartGeometry = null;
    editAnnotation = null;
  }

  function toggleAnnotateMode(setMode: (mode: 'annotate') => void) {
    if (!enabled()) return;
    if (!overlaysVisible.value) setOverlaysVisible(true);
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
    const next = normalizeAnnotationColor(color);
    annotationColor.value = next;
    saveAnnotationColor(next);
  }

  function selectAnnotationStrokeWidth(width: number) {
    annotationStrokeWidth.value = normalizeAnnotationStrokeWidth(width);
    saveAnnotationStrokeWidth(annotationStrokeWidth.value);
    updateOverlayShapes();
  }

  function shapeInteractionClass(shape: OverlayShape) {
    if (shape.draft) {
      return 'pointer-events-none';
    }
    if (currentMode.value === 'annotate') {
      return 'pointer-events-auto cursor-move';
    }
    if (!shape.annotationId) {
      return 'pointer-events-none';
    }
    return 'pointer-events-auto cursor-pointer';
  }

  function onShapeClick(shape: OverlayShape) {
    if (shape.draft || currentMode.value === 'annotate' || !shape.ann) return;
    selectedAnnotationId.value = shape.annotationId == null ? null : String(shape.annotationId);
    onClick(shape.ann);
  }

  function onAnnotationWheel(e: WheelEvent) {
    const canvas = renderer.value?.domElement;
    if (!canvas) return;
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ,
        deltaMode: e.deltaMode,
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      }),
    );
    e.preventDefault();
  }

  function finishAnnotation(type: string, geometry: Record<string, unknown>) {
    onCreate({
      type,
      geometry,
      color: annotationColor.value,
      strokeWidth: annotationStrokeWidth.value,
      rtiView: captureRtiView(),
    });
  }

  function overlayPoint(e: PointerEvent) {
    const overlay = getOverlayEl();
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function imageAspect() {
    const bounds = quadtree.value ? getImageWorldBounds(quadtree.value) : null;
    if (!bounds || bounds.width <= 0) return 1;
    return bounds.height / bounds.width;
  }

  function startEdit(ann: Annotation, handle: AnnotationEditHandle, start: { x: number; y: number }, pointerId: number) {
    selectedAnnotationId.value = ann.id == null ? null : String(ann.id);
    editing = true;
    drawingAnnotation = false;
    editHandle = handle;
    editStartNorm = start;
    editStartGeometry = { ...(ann.geometry as Record<string, unknown>) };
    if (Array.isArray((ann.geometry as { position?: number[] }).position)) {
      editStartGeometry.position = [...(ann.geometry as { position: number[] }).position];
    }
    if (Array.isArray((ann.geometry as { center?: number[] }).center)) {
      editStartGeometry.center = [...(ann.geometry as { center: number[] }).center];
    }
    editAnnotation = ann;
    getOverlayEl()?.setPointerCapture(pointerId);
  }

  function commitEdit() {
    if (!editing || !editAnnotation || !editHandle || !editStartGeometry) return;
    const geometry = editAnnotation.geometry;
    editing = false;
    editHandle = null;
    editStartNorm = null;
    editStartGeometry = null;
    const ann = editAnnotation;
    editAnnotation = null;
    onUpdate?.(ann);
    updateOverlayShapes();
    return geometry;
  }

  function onShapePointerDown(shape: OverlayShape, e: PointerEvent, handle?: AnnotationEditHandle) {
    if (currentMode.value !== 'annotate' || shape.draft || !shape.ann) return;
    e.stopPropagation();
    const pt = pointerToImageNorm(e);
    if (!pt) return;
    const hit = handle || (() => {
      const screen = overlayPoint(e);
      return screen ? hitTestOverlayShape(shape, screen.x, screen.y) : 'move';
    })() || 'move';
    startEdit(shape.ann, hit, pt, e.pointerId);
    e.preventDefault();
  }

  function onHandlePointerDown(shape: OverlayShape, handle: AnnotationEditHandle, e: PointerEvent) {
    onShapePointerDown(shape, e, handle);
  }

  function onAnnotationPointerDown(e: PointerEvent) {
    if (currentMode.value !== 'annotate') return;
    e.stopPropagation();
    const pt = pointerToImageNorm(e);
    if (!pt) return;

    const screen = overlayPoint(e);
    if (screen) {
      for (let i = overlayShapes.value.length - 1; i >= 0; i--) {
        const shape = overlayShapes.value[i];
        if (shape.draft || !shape.ann) continue;
        const hit = hitTestOverlayShape(shape, screen.x, screen.y);
        if (hit) {
          startEdit(shape.ann, hit, pt, e.pointerId);
          e.preventDefault();
          return;
        }
      }
    }

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
    if (editing && editAnnotation && editHandle && editStartNorm && editStartGeometry) {
      const point = pointerToImageNorm(e);
      if (!point) return;
      editAnnotation.geometry = applyAnnotationEdit(
        editAnnotation.type,
        editStartGeometry,
        editHandle,
        editStartNorm,
        point,
        imageAspect(),
      );
      updateOverlayShapes();
      return;
    }

    if (!drawingAnnotation || !draftAnnotation.value) return;
    const point = pointerToImageNorm(e);
    if (!point) return;
    const draft = draftAnnotation.value;

    if (draft.type === 'circle') {
      const centerArr = draft.geometry.center as number[];
      const center = { x: centerArr[0], y: centerArr[1] };
      const qt = quadtree.value;
      draftAnnotation.value = {
        type: 'circle',
        geometry: {
          center: draft.geometry.center,
          radius: qt ? imageNormCircleRadius(center, point, qt) : 0,
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
    if (editing) {
      getOverlayEl()?.releasePointerCapture(e.pointerId);
      commitEdit();
      return;
    }

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
    annotationStrokeWidth,
    shapeMenuOpen,
    selectedAnnotationId,
    overlaysVisible,
    activeShapeOption,
    syncOverlaySize,
    updateOverlayShapes,
    setAnnotations,
    selectAnnotation,
    setOverlaysVisible,
    toggleOverlaysVisible,
    clearDrawingState,
    toggleAnnotateMode,
    selectAnnotationShape,
    selectAnnotationColor,
    selectAnnotationStrokeWidth,
    pointerToImageNorm,
    shapeInteractionClass,
    onShapeClick,
    onAnnotationPointerDown,
    onAnnotationPointerMove,
    onAnnotationPointerUp,
    onAnnotationWheel,
    onShapePointerDown,
    onHandlePointerDown,
  };
}
