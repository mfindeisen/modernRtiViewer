import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';
import type { Annotation, AnnotationCreatePayload } from '@/types/rti.js';
import type { ViewerMode } from '@/composables/types.js';
import type { OverlayShape } from '@/types/annotations.js';
import { useAnnotations } from '@/composables/useAnnotations.js';

vi.mock('@/lib/annotationColors.js', () => ({
  loadAnnotationColor: () => '#f59e0b',
  saveAnnotationColor: vi.fn(),
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

  it('emits click for finished annotation shapes', () => {
    const ann: Annotation = { id: 'a1', type: 'point', geometry: { position: [0, 0] } };
    const { onShapeClick, selectedAnnotationId } = createAnnotations();

    onShapeClick({
      kind: 'point',
      key: 'a1',
      cx: 0,
      cy: 0,
      r: 6,
      color: '#f59e0b',
      draft: false,
      annotationId: 'a1',
      ann,
    } as OverlayShape);

    expect(selectedAnnotationId.value).toBe('a1');
    expect(onClick).toHaveBeenCalledWith(ann);
  });

  it('clears drawing state when leaving annotate mode', () => {
    const { clearDrawingState, shapeMenuOpen } = createAnnotations();
    shapeMenuOpen.value = true;

    clearDrawingState();

    expect(shapeMenuOpen.value).toBe(false);
  });
});
