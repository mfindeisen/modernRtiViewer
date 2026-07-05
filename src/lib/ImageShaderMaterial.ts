import * as THREE from 'three';
import { RTI_VERTEX_SHADER, buildImageFragmentShader } from './shaderChunks.js';

const IMAGE_FRAGMENT = buildImageFragmentShader(`
  uniform sampler2D tex0;

  void main() {
    if (outsideBounds(vWorldPos, uBounds)) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    vec3 color = texture2D(tex0, vUv).xyz;
    gl_FragColor = vec4(applyColorGain(color), 1.0);
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
  },
  vertexShader: RTI_VERTEX_SHADER,
  fragmentShader: IMAGE_FRAGMENT,
  transparent: true,
});
