/** Shared GLSL snippets for RTI shader materials. */

import { COLOR_CORRECTION_GLSL } from './colorCorrection.js';

export const RTI_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec2 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = wPos.xy;
    gl_Position = projectionMatrix * viewMatrix * wPos;
  }
`;

export const RTI_FRAGMENT_PREAMBLE = `
  uniform vec4 uBounds;
  uniform int uRenderMode;
  uniform float uSpecularExponent;
  ${COLOR_CORRECTION_GLSL}

  varying vec2 vUv;
  varying vec2 vWorldPos;

  bool outsideBounds(vec2 pos, vec4 bounds) {
    return pos.x < bounds.x || pos.x > bounds.y || pos.y < bounds.z || pos.y > bounds.w;
  }

  vec3 slopeHeatmap(vec3 N) {
    float steepness = 1.0 - N.z;
    vec3 heat = mix(vec3(0.0, 0.0, 0.8), vec3(0.0, 0.8, 0.2), clamp(steepness * 3.0, 0.0, 1.0));
    return mix(heat, vec3(1.0, 0.0, 0.0), clamp(steepness * 3.0 - 1.0, 0.0, 1.0));
  }

  vec3 shadedNormalColor(vec3 N, vec3 lightDir) {
    float diffuse = max(0.0, dot(N, normalize(lightDir)));
    vec3 normalColor = N * 0.5 + 0.5;
    return normalColor * (diffuse * 0.8 + 0.2);
  }
`;

export function buildRtiFragmentShader(body: string) {
  return `${RTI_FRAGMENT_PREAMBLE}\n${body}`;
}

export const IMAGE_FRAGMENT_PREAMBLE = `
  uniform vec4 uBounds;
  ${COLOR_CORRECTION_GLSL}

  varying vec2 vUv;
  varying vec2 vWorldPos;

  bool outsideBounds(vec2 pos, vec4 bounds) {
    return pos.x < bounds.x || pos.x > bounds.y || pos.y < bounds.z || pos.y > bounds.w;
  }
`;

export function buildImageFragmentShader(body: string) {
  return `${IMAGE_FRAGMENT_PREAMBLE}\n${body}`;
}
