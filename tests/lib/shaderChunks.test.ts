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
    expect(RTI_FRAGMENT_PREAMBLE).toContain('clipPaddedBounds');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('discard');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('slopeHeatmap');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('packedNormalColor');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('applyColorGain');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('finishColor');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('applyDiffuseGain');
    expect(RTI_FRAGMENT_PREAMBLE).toContain('dualLightDir');
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

  it('includes RGB PTM coefficient sampling in the shader library', async () => {
    const { RgbPtmMaterial } = await import('@/lib/RtiShaders.js');
    expect(RgbPtmMaterial).toBeTypeOf('function');
  });

  it('evaluates nine HSH coefficient layers when present', async () => {
    const THREE = await import('three');
    const { HshShaderMaterial } = await import('@/lib/RtiShaders.js');
    const tex = new THREE.Texture();
    const textures = Array.from({ length: 9 }, () => tex);
    const material = HshShaderMaterial(
      textures,
      new THREE.Vector3(0, 0, 1),
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
      new THREE.Vector4(),
      new THREE.Vector3(1, 1, 1),
    );
    expect(material.fragmentShader).toContain('clipPaddedBounds');
    expect(material.fragmentShader).toContain('tex8');
    expect(material.fragmentShader).toContain('uCoeffCount');
    expect(material.fragmentShader).toContain('hshNormal');
    expect(material.fragmentShader).toContain('uRenderMode == 6');
    expect(material.fragmentShader).toContain('packedNormalColor');
    expect(material.fragmentShader).toContain('uRenderMode == 6');
    expect(material.uniforms.uCoeffCount.value).toBe(9);
    expect(material.uniforms.uBiasHi.value.x).toBe(4);
    expect(material.uniforms.uBias8.value).toBe(8);
  });
});
