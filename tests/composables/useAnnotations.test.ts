import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';
import type { Annotation, AnnotationCreatePayload } from '@/types/rti.js';
import type { ViewerMode } from '@/composables/types.js';
import type { OverlayShape } from '@/types/annotations.js';
import { useAnnotations } from '@/composables/useAnnotations.js';

vi.mock('@/lib/annotationColors.js', () => ({
  loadAnnotationColor: () => '#f59e0b',
  saveAnnotationColor: vi.fn(),
  normalizeAnnotationColor: (color: string) => color,
}));

vi.mock('@/lib/annotationStroke.js', () => ({
  loadAnnotationStrokeWidth: () => 2,
  saveAnnotationStrokeWidth: vi.fn(),
  normalizeAnnotationStrokeWidth: (value: unknown) => Number(value) || 2,
}));

import { saveAnnotationColor } from '@/lib/annotationColors.js';

describe('useAnnotations', () => {
  let currentMode: Ref<ViewerMode>;
  let onCreate: ReturnType<typeof vi.fn<(payload: AnnotationCreatePayload) => void>>;
  let onClick: ReturnType<typeof vi.fn<(ann: Annotation) => void>>;

  beforeEach(() => {
    currentMode = ref<ViewerMode>('pan');
    onCreate = vi.fn();
    onClick = vi.fn();
  });

  function createAnnotations(overrides: Record<string, unknown> = {}) {
    return useAnnotations({
      enabled: () => true,
      currentMode,
      renderer: ref(null),
      camera: ref(null),
      quadtree: ref(null),
      onCreate,
      onClick,
      captureRtiView: () => ({ renderMode: 0 }),
      ...overrides,
    });
  }

  it('toggles overlay visibility without dropping stored annotations', () => {
    const { overlaysVisible, toggleOverlaysVisible, displayedAnnotations, setAnnotations } = createAnnotations();
    setAnnotations([{ id: '1', type: 'point', geometry: { position: [0.2, 0.3] } }]);
    expect(overlaysVisible.value).toBe(true);
    toggleOverlaysVisible();
    expect(overlaysVisible.value).toBe(false);
    expect(displayedAnnotations.value).toHaveLength(1);
    toggleOverlaysVisible();
    expect(overlaysVisible.value).toBe(true);
  });

  it('stores annotations and refreshes overlay state', () => {
    const { setAnnotations, overlayShapes } = createAnnotations();
    setAnnotations([
      { id: '1', type: 'point', geometry: { position: [0.2, 0.3] } },
    ]);

    expect(overlayShapes.value).toEqual([]);
  });

  it('selects an annotation by id', () => {
    const { selectAnnotation, selectedAnnotationId } = createAnnotations();
    selectAnnotation('ann-42');
    expect(selectedAnnotationId.value).toBe('ann-42');
    selectAnnotation(null);
    expect(selectedAnnotationId.value).toBeNull();
  });

  it('enters annotate mode and opens the shape menu', () => {
    const setMode = vi.fn<(mode: 'annotate') => void>();
    const { toggleAnnotateMode, shapeMenuOpen } = createAnnotations();

    toggleAnnotateMode(setMode);

    expect(setMode).toHaveBeenCalledWith('annotate');
    expect(shapeMenuOpen.value).toBe(true);
  });

  it('toggles the shape menu while already annotating', () => {
    currentMode.value = 'annotate';
    const setMode = vi.fn();
    const { toggleAnnotateMode, shapeMenuOpen } = createAnnotations();
    shapeMenuOpen.value = true;

    toggleAnnotateMode(setMode);

    expect(setMode).not.toHaveBeenCalled();
    expect(shapeMenuOpen.value).toBe(false);
  });

  it('persists selected annotation color', () => {
    const { selectAnnotationColor, annotationColor } = createAnnotations();
    selectAnnotationColor('#ff0000');

    expect(annotationColor.value).toBe('#ff0000');
    expect(saveAnnotationColor).toHaveBeenCalledWith('#ff0000');
  });

  it('persists selected annotation stroke width', () => {
    const { selectAnnotationStrokeWidth, annotationStrokeWidth } = createAnnotations();
    selectAnnotationStrokeWidth(7);

    expect(annotationStrokeWidth.value).toBe(7);
  });

  function sampleShape(ann: Annotation, extra: Partial<OverlayShape> = {}): OverlayShape {
    return {
      kind: 'point',
      key: String(ann.id),
      cx: 0,
      cy: 0,
      r: 6,
      color: '#f59e0b',
      strokeWidth: 2,
      draft: false,
      annotationId: String(ann.id),
      ann,
      ...extra,
    } as OverlayShape;
  }

  it('lets measure and pan ignore annotation hit targets', () => {
    const ann: Annotation = { id: 'a1', type: 'point', geometry: { position: [0, 0] } };
    const { shapeInteractionClass } = createAnnotations();

    currentMode.value = 'measure';
    expect(shapeInteractionClass(sampleShape(ann))).toBe('pointer-events-none');
    currentMode.value = 'pan';
    expect(shapeInteractionClass(sampleShape(ann))).toBe('pointer-events-none');
    currentMode.value = 'annotate';
    expect(shapeInteractionClass(sampleShape(ann))).toBe('pointer-events-auto cursor-move');
  });

  it('emits click for finished annotation shapes only in annotate mode', () => {
    const ann: Annotation = { id: 'a1', type: 'point', geometry: { position: [0, 0] } };
    const { onShapeClick, selectedAnnotationId } = createAnnotations();
    const shape = sampleShape(ann);

    onShapeClick(shape);
    expect(onClick).not.toHaveBeenCalled();
    expect(selectedAnnotationId.value).toBeNull();

    currentMode.value = 'measure';
    onShapeClick(shape);
    expect(onClick).not.toHaveBeenCalled();

    currentMode.value = 'annotate';
    onShapeClick(shape);
    expect(selectedAnnotationId.value).toBe('a1');
    expect(onClick).toHaveBeenCalledWith(ann);
  });

  it('normalizes numeric annotation ids from the host', () => {
    const { selectAnnotation, selectedAnnotationId } = createAnnotations();
    selectAnnotation(42);
    expect(selectedAnnotationId.value).toBe('42');
  });

  it('clears drawing state when leaving annotate mode', () => {
    const { clearDrawingState, shapeMenuOpen } = createAnnotations();
    shapeMenuOpen.value = true;

    clearDrawingState();

    expect(shapeMenuOpen.value).toBe(false);
  });

  it('forwards wheel events to the viewer canvas in pan mode', () => {
    const canvas = document.createElement('canvas');
    const dispatchEvent = vi.spyOn(canvas, 'dispatchEvent');
    const preventDefault = vi.fn();
    const { onAnnotationWheel } = createAnnotations({
      renderer: ref({ domElement: canvas }),
    });

    onAnnotationWheel({
      deltaX: 0,
      deltaY: -120,
      deltaZ: 0,
      deltaMode: 0,
      clientX: 10,
      clientY: 20,
      screenX: 10,
      screenY: 20,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      preventDefault,
    } as unknown as WheelEvent);

    expect(dispatchEvent).toHaveBeenCalled();
    const forwarded = dispatchEvent.mock.calls.find(([event]) => event instanceof WheelEvent)?.[0];
    expect(forwarded).toBeInstanceOf(WheelEvent);
    expect((forwarded as WheelEvent).deltaY).toBe(-120);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('forwards wheel events to the viewer canvas in annotate mode', () => {
    currentMode.value = 'annotate';
    const canvas = document.createElement('canvas');
    const dispatchEvent = vi.spyOn(canvas, 'dispatchEvent');
    const { onAnnotationWheel } = createAnnotations({
      renderer: ref({ domElement: canvas }),
    });

    onAnnotationWheel({
      deltaY: -120,
      preventDefault: vi.fn(),
    } as unknown as WheelEvent);

    expect(dispatchEvent).toHaveBeenCalled();
  });
});
