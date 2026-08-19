import { describe, it, expect } from 'vitest';
import {
  LINE_DRAWING_FRAGMENT,
  LINE_DRAWING_FEATURE_FRAGMENT,
  LINE_DRAWING_SMOOTH_FRAGMENT,
  LINE_DRAWING_THIN_FRAGMENT,
  LINE_DRAWING_COMPOSITE_FRAGMENT,
  LINE_DRAWING_PACK_FRAGMENT,
  LINE_DRAWING_VERTEX,
} from '@/lib/lineDrawingPass.js';
import {
  supportsLineDrawing,
  maxRenderModeForRtiType,
  RENDER_MODE_LINE_DRAWING,
  RENDER_MODE_LATENT,
  PACKED_NORMAL_RENDER_MODE,
  LINE_DRAWING_STYLE_CONTOUR,
  LINE_DRAWING_STYLE_SKETCH,
} from '@/lib/rtiEnhancements.js';
import { RTI_FRAGMENT_PREAMBLE } from '@/lib/shaderChunks.js';

describe('lineDrawingPass shader', () => {
  it('smooths packed normals before measuring curvature', () => {
    expect(LINE_DRAWING_VERTEX).toContain('gl_Position');
    expect(LINE_DRAWING_SMOOTH_FRAGMENT).toContain('tNormals');
    expect(LINE_DRAWING_SMOOTH_FRAGMENT).toContain('decodePackedNormal');
  });

  it('builds ridge, valley, silhouette, and suggestive-contour energy', () => {
    expect(LINE_DRAWING_FEATURE_FRAGMENT).toContain('tSmooth');
    expect(LINE_DRAWING_FEATURE_FRAGMENT).toContain('uRidgeThreshold');
    expect(LINE_DRAWING_FEATURE_FRAGMENT).toContain('uValleyThreshold');
    expect(LINE_DRAWING_FEATURE_FRAGMENT).toContain('uOutline');
    expect(LINE_DRAWING_FEATURE_FRAGMENT).toContain('suggestive');
    expect(LINE_DRAWING_FEATURE_FRAGMENT).toContain('silhouette');
    expect(LINE_DRAWING_FEATURE_FRAGMENT).toContain('divN');
  });

  it('thins lines with non-maximum suppression and hysteresis', () => {
    expect(LINE_DRAWING_THIN_FRAGMENT).toContain('nmsAt');
    expect(LINE_DRAWING_THIN_FRAGMENT).toContain('tFeatures');
  });

  it('packs thin lines and orientation for publication tracing', () => {
    expect(LINE_DRAWING_PACK_FRAGMENT).toContain('tThin');
    expect(LINE_DRAWING_PACK_FRAGMENT).toContain('tFeatures');
    expect(LINE_DRAWING_PACK_FRAGMENT).toContain('tNormals');
  });

  it('strokes thin lines and optionally hatches in sketch style', () => {
    expect(LINE_DRAWING_COMPOSITE_FRAGMENT).toContain('uLineWidth');
    expect(LINE_DRAWING_COMPOSITE_FRAGMENT).toContain('uStyle');
    expect(LINE_DRAWING_COMPOSITE_FRAGMENT).toContain('uHatch');
    expect(LINE_DRAWING_COMPOSITE_FRAGMENT).toContain('xdogInk');
    expect(LINE_DRAWING_FRAGMENT).toBe(LINE_DRAWING_COMPOSITE_FRAGMENT);
    expect(LINE_DRAWING_STYLE_CONTOUR).toBe('contour');
    expect(LINE_DRAWING_STYLE_SKETCH).toBe('sketch');
  });
});

describe('line drawing modes', () => {
  it('is available for photometric RTI, not plain images', () => {
    expect(supportsLineDrawing(1)).toBe(true);
    expect(supportsLineDrawing(4)).toBe(false);
    expect(supportsLineDrawing(5)).toBe(true);
    expect(maxRenderModeForRtiType(1)).toBe(RENDER_MODE_LINE_DRAWING);
    expect(maxRenderModeForRtiType(5)).toBe(RENDER_MODE_LATENT);
    expect(PACKED_NORMAL_RENDER_MODE).not.toBe(RENDER_MODE_LINE_DRAWING);
  });

  it('packs normals in the shared RTI preamble', () => {
    expect(RTI_FRAGMENT_PREAMBLE).toContain('packedNormalColor');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('encodeNormal');
  });
});
