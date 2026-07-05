import { describe, it, expect } from 'vitest';
import {
  RTI_VERTEX_SHADER,
  RTI_FRAGMENT_PREAMBLE,
  buildRtiFragmentShader,
  buildImageFragmentShader,
} from '@/lib/shaderChunks.js';

describe('shaderChunks', () => {
  it('includes shared vertex shader and varyings', () => {
    expect(RTI_VERTEX_SHADER).toContain('vWorldPos');
    expect(RTI_VERTEX_SHADER).toContain('gl_Position');
  });

  it('includes bounds check, slope heatmap, and color correction helpers', () => {
    expect(RTI_FRAGMENT_PREAMBLE).toContain('outsideBounds');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('slopeHeatmap');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('applyColorGain');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('shadedNormalColor');
  });

  it('builds fragment shaders with custom body', () => {
    const shader = buildRtiFragmentShader('void main() { gl_FragColor = vec4(1.0); }');
    expect(shader).toContain('outsideBounds');
    expect(shader).toContain('void main() { gl_FragColor = vec4(1.0); }');
  });

  it('builds image fragment shaders without RTI render uniforms', () => {
    const shader = buildImageFragmentShader('void main() { gl_FragColor = vec4(1.0); }');
    expect(shader).toContain('outsideBounds');
    expect(shader).not.toContain('uRenderMode');
    expect(shader).toContain('applyColorGain');
  });
});
