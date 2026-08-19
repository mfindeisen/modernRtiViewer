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

  // CHI Diffuse Gain: scale directional reflectance, keep the DC / ambient term.
  vec3 applyPhotometricGain(vec3 lit, vec3 ambient) {
    if (uDiffuseGain <= 1.001) return lit;
    return clamp(ambient + (lit - ambient) * uDiffuseGain, 0.0, 1.0);
  }

  // CHI Unsharp Masking: sharpen photometric normals, then relight.
  vec3 sharpenNormal(vec3 N) {
    vec3 Nn = normalize(N);
    if (uUnsharpAmount <= 0.001) return Nn;
    vec3 lap = dFdx(dFdx(Nn)) + dFdy(dFdy(Nn));
    return normalize(Nn - lap * uUnsharpAmount * 8.0);
  }

  vec3 applyUnsharpMask(vec3 color, vec3 N, vec3 L) {
    if (uUnsharpAmount <= 0.001) return color;
    vec3 Ln = normalize(L);
    vec3 Ns = sharpenNormal(N);
    float extra = max(0.0, dot(Ns, Ln)) - max(0.0, dot(normalize(N), Ln));
    return clamp(color * (1.0 + extra * uUnsharpAmount), 0.0, 1.0);
  }

  vec3 applySpecularBlinn(vec3 color, vec3 N, vec3 L) {
    if (uSpecularIntensity <= 0.001) return color;
    vec3 H = normalize(normalize(L) + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(0.0, dot(normalize(N), H)), max(uSpecularExponent, 1.0));
    return color + vec3(spec * uSpecularIntensity);
  }

  vec3 finishColor(vec3 color) {
    return applyColorGain(color);
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
    vec3 lap = dFdx(dFdx(color)) + dFdy(dFdy(color));
    return clamp(color - lap * uUnsharpAmount * 8.0, 0.0, 1.0);
  }

  vec3 finishColor(vec3 color) {
    return applyColorGain(applyUnsharp(applyDiffuseGain(color)));
  }
`;

export function buildImageFragmentShader(body: string) {
  return `${IMAGE_FRAGMENT_PREAMBLE}\n${body}`;
}
