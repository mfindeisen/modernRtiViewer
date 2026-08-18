import { describe, it, expect } from 'vitest';
import { LINE_DRAWING_FRAGMENT, LINE_DRAWING_VERTEX } from '@/lib/lineDrawingPass.js';
import {
  supportsLineDrawing,
  maxRenderModeForRtiType,
  RENDER_MODE_LINE_DRAWING,
  RENDER_MODE_LATENT,
  PACKED_NORMAL_RENDER_MODE,
} from '@/lib/rtiEnhancements.js';
import { RTI_FRAGMENT_PREAMBLE } from '@/lib/shaderChunks.js';

describe('lineDrawingPass shader', () => {
  it('samples neighboring normals and thresholds ridges and valleys', () => {
    expect(LINE_DRAWING_VERTEX).toContain('gl_Position');
    expect(LINE_DRAWING_FRAGMENT).toContain('tNormals');
    expect(LINE_DRAWING_FRAGMENT).toContain('uRidgeThreshold');
    expect(LINE_DRAWING_FRAGMENT).toContain('uValleyThreshold');
    expect(LINE_DRAWING_FRAGMENT).toContain('uLineWidth');
    expect(LINE_DRAWING_FRAGMENT).toContain('divN');
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
