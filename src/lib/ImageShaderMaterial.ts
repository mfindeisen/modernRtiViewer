import * as THREE from 'three';
import { RTI_VERTEX_SHADER, buildImageFragmentShader } from './shaderChunks.js';

const IMAGE_FRAGMENT = buildImageFragmentShader(`
  uniform sampler2D tex0;

  void main() {
    clipPaddedBounds();
    vec3 color = texture2D(tex0, vUv).xyz;
    gl_FragColor = vec4(finishColor(color), 1.0);
  }
`);

export const ImageShaderMaterial = (
  texture: THREE.Texture,
  bounds: THREE.Vector4,
  colorGain: THREE.Vector3,
) => new THREE.ShaderMaterial({
  uniforms: {
    tex0: { value: texture || null },
    uBounds: { value: bounds },
    uColorGain: { value: colorGain?.clone?.() ?? new THREE.Vector3(1, 1, 1) },
    uDiffuseGain: { value: 1.0 },
    uUnsharpAmount: { value: 0.0 },
    uExposure: { value: 1.0 },
  },
  vertexShader: RTI_VERTEX_SHADER,
  fragmentShader: IMAGE_FRAGMENT,
  transparent: true,
});
