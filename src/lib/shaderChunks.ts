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
  uniform float uDiffuseGain;
  uniform float uUnsharpAmount;
  uniform float uSpecularIntensity;
  uniform vec3 uLightDir2;
  uniform float uDualLinked;
  ${COLOR_CORRECTION_GLSL}

  varying vec2 vUv;
  varying vec2 vWorldPos;

  bool outsideBounds(vec2 pos, vec4 bounds) {
    return pos.x < bounds.x || pos.x > bounds.y || pos.y < bounds.z || pos.y > bounds.w;
  }

  void clipPaddedBounds() {
    if (outsideBounds(vWorldPos, uBounds)) discard;
  }

  vec3 slopeHeatmap(vec3 N) {
    float steepness = 1.0 - N.z;
    vec3 heat = mix(vec3(0.0, 0.0, 0.8), vec3(0.0, 0.8, 0.2), clamp(steepness * 3.0, 0.0, 1.0));
    return mix(heat, vec3(1.0, 0.0, 0.0), clamp(steepness * 3.0 - 1.0, 0.0, 1.0));
  }

  vec3 packedNormalColor(vec3 N) {
    return N * 0.5 + 0.5;
  }

  vec3 encodeNormal(vec3 N) {
    return packedNormalColor(normalize(N));
  }

  vec3 shadedNormalColor(vec3 N, vec3 lightDir) {
    float diffuse = max(0.0, dot(N, normalize(lightDir)));
    return packedNormalColor(N) * (diffuse * 0.8 + 0.2);
  }

  vec3 dualLightDir(vec3 primary) {
    if (uDualLinked > 0.5) {
      return vec3(-primary.x, -primary.y, primary.z);
    }
    return uLightDir2;
  }

  vec3 applyDiffuseGain(vec3 color) {
    if (uDiffuseGain <= 1.001) return color;
    return clamp((color - vec3(0.5)) * uDiffuseGain + vec3(0.5), 0.0, 1.0);
  }

  vec3 applyUnsharp(vec3 color) {
    if (uUnsharpAmount <= 0.001) return color;
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 detail = color - vec3(lum);
    float contrast = 0.5 + (lum - 0.5) * (1.0 + uUnsharpAmount * 0.35);
    return clamp(vec3(contrast) + detail * (1.0 + uUnsharpAmount), 0.0, 1.0);
  }

  vec3 applySpecularBoost(vec3 color, float lum) {
    float specular = pow(max(0.0, lum), uSpecularExponent);
    return color + vec3(specular * uSpecularIntensity);
  }

  vec3 finishColor(vec3 color) {
    return applyColorGain(applyUnsharp(applyDiffuseGain(color)));
  }
`;

export function buildRtiFragmentShader(body: string) {
  return `${RTI_FRAGMENT_PREAMBLE}\n${body}`;
}

export const IMAGE_FRAGMENT_PREAMBLE = `
  uniform vec4 uBounds;
  uniform float uDiffuseGain;
  uniform float uUnsharpAmount;
  ${COLOR_CORRECTION_GLSL}

  varying vec2 vUv;
  varying vec2 vWorldPos;

  bool outsideBounds(vec2 pos, vec4 bounds) {
    return pos.x < bounds.x || pos.x > bounds.y || pos.y < bounds.z || pos.y > bounds.w;
  }

  void clipPaddedBounds() {
    if (outsideBounds(vWorldPos, uBounds)) discard;
  }

  vec3 applyDiffuseGain(vec3 color) {
    if (uDiffuseGain <= 1.001) return color;
    return clamp((color - vec3(0.5)) * uDiffuseGain + vec3(0.5), 0.0, 1.0);
  }

  vec3 applyUnsharp(vec3 color) {
    if (uUnsharpAmount <= 0.001) return color;
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 detail = color - vec3(lum);
    float contrast = 0.5 + (lum - 0.5) * (1.0 + uUnsharpAmount * 0.35);
    return clamp(vec3(contrast) + detail * (1.0 + uUnsharpAmount), 0.0, 1.0);
  }

  vec3 finishColor(vec3 color) {
    return applyColorGain(applyUnsharp(applyDiffuseGain(color)));
  }
`;

export function buildImageFragmentShader(body: string) {
  return `${IMAGE_FRAGMENT_PREAMBLE}\n${body}`;
}
