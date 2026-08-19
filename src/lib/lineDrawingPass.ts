/** Screen-space line drawing: smoothed curvature, Canny lines, silhouettes, optional sketch. */

import * as THREE from 'three';
import type { LineDrawingStyle } from './rtiEnhancements.js';

export const LINE_DRAWING_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const DECODE_NORMAL = `
  vec3 decodePackedNormal(vec4 c, vec3 fallback) {
    if (c.a < 0.5) return fallback;
    return normalize(c.rgb * 2.0 - 1.0);
  }
`;

export const LINE_DRAWING_SMOOTH_FRAGMENT = `
  uniform sampler2D tNormals;
  uniform vec2 uResolution;
  varying vec2 vUv;
  ${DECODE_NORMAL}

  void main() {
    vec4 center = texture2D(tNormals, vUv);
    if (center.a < 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 1.0, 0.0);
      return;
    }
    vec2 px = 1.0 / uResolution;
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int j = 0; j < 5; j++) {
      for (int i = 0; i < 5; i++) {
        float fi = float(i) - 2.0;
        float fj = float(j) - 2.0;
        vec4 c = texture2D(tNormals, vUv + vec2(fi, fj) * px);
        float mask = step(0.5, c.a);
        float ax = (i == 0 || i == 4) ? 1.0 : (i == 1 || i == 3) ? 4.0 : 6.0;
        float ay = (j == 0 || j == 4) ? 1.0 : (j == 1 || j == 3) ? 4.0 : 6.0;
        float w = ax * ay * mask;
        acc += decodePackedNormal(c, vec3(0.0, 0.0, 1.0)) * w;
        wsum += w;
      }
    }
    if (wsum < 1.0) {
      gl_FragColor = vec4(decodePackedNormal(center, vec3(0.0, 0.0, 1.0)), 1.0);
      return;
    }
    gl_FragColor = vec4(normalize(acc / wsum), 1.0);
  }
`;

export const LINE_DRAWING_FEATURE_FRAGMENT = `
  uniform sampler2D tSmooth;
  uniform sampler2D tNormals;
  uniform vec2 uResolution;
  uniform float uRidgeThreshold;
  uniform float uValleyThreshold;
  uniform float uOutline;
  varying vec2 vUv;

  vec3 sn(vec2 uv, vec3 fallback) {
    vec4 c = texture2D(tSmooth, uv);
    if (c.a < 0.5) return fallback;
    return normalize(c.xyz);
  }

  void main() {
    vec4 packedC = texture2D(tNormals, vUv);
    vec4 sm = texture2D(tSmooth, vUv);
    if (packedC.a < 0.5 || sm.a < 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec2 px = 1.0 / uResolution;
    vec3 n = normalize(sm.xyz);
    vec3 nL = sn(vUv - vec2(px.x, 0.0), n);
    vec3 nR = sn(vUv + vec2(px.x, 0.0), n);
    vec3 nD = sn(vUv - vec2(0.0, px.y), n);
    vec3 nU = sn(vUv + vec2(0.0, px.y), n);
    vec3 nUL = sn(vUv + vec2(-px.x, px.y), n);
    vec3 nUR = sn(vUv + vec2(px.x, px.y), n);
    vec3 nDL = sn(vUv + vec2(-px.x, -px.y), n);
    vec3 nDR = sn(vUv + vec2(px.x, -px.y), n);

    float dnx = (nUR.x + 2.0 * nR.x + nDR.x - (nUL.x + 2.0 * nL.x + nDL.x)) * 0.25;
    float dny = (nUL.y + 2.0 * nU.y + nUR.y - (nDL.y + 2.0 * nD.y + nDR.y)) * 0.25;
    float divN = dnx + dny;
    float ridge = max(0.0, divN);
    float valley = max(0.0, -divN);
    float crease = length(nR - nL) + length(nU - nD);

    vec2 gNz = vec2(
      nUR.z + 2.0 * nR.z + nDR.z - (nUL.z + 2.0 * nL.z + nDL.z),
      nUL.z + 2.0 * nU.z + nUR.z - (nDL.z + 2.0 * nD.z + nDR.z)
    ) * 0.25;
    float angle = atan(gNz.y, gNz.x);

    vec2 wdir = normalize(n.xy + vec2(1.0e-4));
    vec3 nF = sn(vUv + px * wdir, n);
    vec3 nB = sn(vUv - px * wdir, n);
    float kr = (nF.z - nB.z) * 0.5;
    float dkr = nF.z - 2.0 * n.z + nB.z;
    float suggestive = (1.0 - smoothstep(0.0, 0.045, abs(kr)))
      * smoothstep(-0.002, 0.02, dkr)
      * smoothstep(0.08, 0.32, length(n.xy));
    float silhouette = pow(clamp(1.0 - n.z, 0.0, 1.0), 2.4);

    float aL = texture2D(tNormals, vUv - vec2(px.x, 0.0)).a;
    float aR = texture2D(tNormals, vUv + vec2(px.x, 0.0)).a;
    float aD = texture2D(tNormals, vUv - vec2(0.0, px.y)).a;
    float aU = texture2D(tNormals, vUv + vec2(0.0, px.y)).a;
    float objectEdge = 1.0 - min(min(aL, aR), min(aD, aU));

    float ridgeThr = max(uRidgeThreshold, 0.02);
    float valleyThr = max(uValleyThreshold, 0.02);
    float outline = clamp(uOutline, 0.0, 1.0);
    float energy = max(ridge / ridgeThr, valley / valleyThr);
    energy = max(energy, crease / (ridgeThr * 1.35));
    energy = max(energy, silhouette * outline * 2.4);
    energy = max(energy, suggestive * outline * 2.6);
    energy = max(energy, objectEdge * 3.2);

    float tone = clamp(0.52 + 0.48 * n.z - 0.42 * valley * 4.0, 0.0, 1.0);
    float hatch = clamp((1.0 - n.z) * 0.62 + valley * 5.0, 0.0, 1.0);

    gl_FragColor = vec4(energy, angle / 6.28318530718 + 0.5, tone, hatch);
  }
`;

export const LINE_DRAWING_THIN_FRAGMENT = `
  uniform sampler2D tFeatures;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float nmsAt(vec2 uv) {
    vec4 f = texture2D(tFeatures, uv);
    float mag = f.r;
    if (mag < 0.12) return 0.0;
    float angle = (f.g - 0.5) * 6.28318530718;
    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 px = 1.0 / uResolution;
    float m1 = texture2D(tFeatures, uv + dir * px).r;
    float m2 = texture2D(tFeatures, uv - dir * px).r;
    return (mag >= m1 && mag >= m2) ? mag : 0.0;
  }

  void main() {
    vec4 f = texture2D(tFeatures, vUv);
    float m = nmsAt(vUv);
    float keep = 0.0;
    if (m >= 1.0) {
      keep = clamp(0.55 + 0.45 * smoothstep(1.0, 2.2, m), 0.0, 1.0);
    } else if (m >= 0.42) {
      vec2 px = 1.0 / uResolution;
      float nearby = 0.0;
      nearby = max(nearby, nmsAt(vUv + vec2(px.x, 0.0)));
      nearby = max(nearby, nmsAt(vUv - vec2(px.x, 0.0)));
      nearby = max(nearby, nmsAt(vUv + vec2(0.0, px.y)));
      nearby = max(nearby, nmsAt(vUv - vec2(0.0, px.y)));
      nearby = max(nearby, nmsAt(vUv + vec2(px.x, px.y)));
      nearby = max(nearby, nmsAt(vUv + vec2(-px.x, px.y)));
      nearby = max(nearby, nmsAt(vUv + vec2(px.x, -px.y)));
      nearby = max(nearby, nmsAt(vUv + vec2(-px.x, -px.y)));
      if (nearby >= 1.0) {
        keep = 0.45 + 0.4 * smoothstep(0.42, 1.0, m);
      }
    }
    gl_FragColor = vec4(keep, f.b, f.a, f.r > 0.0 ? 1.0 : 0.0);
  }
`;

export const LINE_DRAWING_COMPOSITE_FRAGMENT = `
  uniform sampler2D tThin;
  uniform sampler2D tFeatures;
  uniform sampler2D tSmooth;
  uniform sampler2D tNormals;
  uniform vec2 uResolution;
  uniform float uLineWidth;
  uniform float uStyle;
  uniform float uHatch;
  varying vec2 vUv;

  float sampleThin(vec2 uv) {
    return texture2D(tThin, uv).r;
  }

  float dilateInk() {
    vec2 px = 1.0 / uResolution;
    float energy = texture2D(tFeatures, vUv).r;
    float radius = mix(0.65, max(uLineWidth, 1.0), smoothstep(0.35, 1.8, energy));
    float ink = sampleThin(vUv);
    vec2 d0 = vec2(1.0, 0.0);
    vec2 d1 = vec2(0.0, 1.0);
    vec2 d2 = vec2(0.70710678, 0.70710678);
    vec2 d3 = vec2(-0.70710678, 0.70710678);
    for (int r = 1; r < 5; r++) {
      float rf = float(r);
      float fall = 1.0 - smoothstep(radius - 0.55, radius + 0.3, rf);
      ink = max(ink, sampleThin(vUv + d0 * px * rf) * fall);
      ink = max(ink, sampleThin(vUv - d0 * px * rf) * fall);
      ink = max(ink, sampleThin(vUv + d1 * px * rf) * fall);
      ink = max(ink, sampleThin(vUv - d1 * px * rf) * fall);
      ink = max(ink, sampleThin(vUv + d2 * px * rf) * fall);
      ink = max(ink, sampleThin(vUv - d2 * px * rf) * fall);
      ink = max(ink, sampleThin(vUv + d3 * px * rf) * fall);
      ink = max(ink, sampleThin(vUv - d3 * px * rf) * fall);
    }
    return clamp(ink, 0.0, 1.0);
  }

  float blurTone(float spread) {
    vec2 px = spread / uResolution;
    float c = texture2D(tFeatures, vUv).b;
    float l = texture2D(tFeatures, vUv - vec2(px.x, 0.0)).b;
    float r = texture2D(tFeatures, vUv + vec2(px.x, 0.0)).b;
    float d = texture2D(tFeatures, vUv - vec2(0.0, px.y)).b;
    float u = texture2D(tFeatures, vUv + vec2(0.0, px.y)).b;
    float ul = texture2D(tFeatures, vUv + vec2(-px.x, px.y)).b;
    float ur = texture2D(tFeatures, vUv + vec2(px.x, px.y)).b;
    float dl = texture2D(tFeatures, vUv + vec2(-px.x, -px.y)).b;
    float dr = texture2D(tFeatures, vUv + vec2(px.x, -px.y)).b;
    return (4.0 * c + 2.0 * (l + r + d + u) + (ul + ur + dl + dr)) / 16.0;
  }

  float xdogInk() {
    float g1 = blurTone(1.0);
    float g2 = blurTone(1.7);
    float dog = g1 - 0.97 * g2;
    float edge = 1.0 / (1.0 + exp(clamp(-90.0 * dog, -20.0, 20.0)));
    return pow(1.0 - edge, 1.35);
  }

  float hatchStroke(vec2 dir, float spacing, float sharpness) {
    float t = dot(vUv * uResolution, normalize(dir + vec2(1.0e-5)));
    float wave = abs(fract(t / spacing) - 0.5) * 2.0;
    return 1.0 - smoothstep(sharpness, sharpness + 0.35, wave);
  }

  void main() {
    vec4 packedC = texture2D(tNormals, vUv);
    if (packedC.a < 0.5) {
      gl_FragColor = vec4(1.0);
      return;
    }

    float lines = dilateInk();
    float ink = lines;

    if (uStyle > 0.5) {
      vec3 n = normalize(texture2D(tSmooth, vUv).xyz);
      float density = texture2D(tThin, vUv).b;
      vec2 around = vec2(-n.y, n.x);
      vec2 along = n.xy;
      float spacing = 6.2 + uLineWidth * 0.8;
      float h1 = hatchStroke(around, spacing, 0.62) * smoothstep(0.12, 0.5, density);
      float h2 = hatchStroke(along, spacing * 1.15, 0.7) * smoothstep(0.42, 0.78, density);
      float hatch = max(h1, h2 * 0.85) * clamp(uHatch, 0.0, 1.0);
      ink = max(ink, max(xdogInk() * 0.62, hatch));
    }

    float paper = 1.0 - clamp(ink, 0.0, 1.0);
    gl_FragColor = vec4(vec3(paper), 1.0);
  }
`;

export const LINE_DRAWING_PACK_FRAGMENT = `
  uniform sampler2D tThin;
  uniform sampler2D tFeatures;
  uniform sampler2D tNormals;
  varying vec2 vUv;

  void main() {
    if (texture2D(tNormals, vUv).a < 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }
    float thin = texture2D(tThin, vUv).r;
    float energy = clamp(texture2D(tFeatures, vUv).r * 0.25, 0.0, 1.0);
    float angle = texture2D(tFeatures, vUv).g;
    gl_FragColor = vec4(thin, energy, angle, 1.0);
  }
`;

/** @deprecated Use LINE_DRAWING_COMPOSITE_FRAGMENT. Kept for existing tests. */
export const LINE_DRAWING_FRAGMENT = LINE_DRAWING_COMPOSITE_FRAGMENT;

export type { LineDrawingStyle };

export interface LineDrawingParams {
  ridgeThreshold: number;
  valleyThreshold: number;
  lineWidth: number;
  outline?: number;
  hatch?: number;
  style?: LineDrawingStyle;
}

export interface LineDrawingRenderOptions extends LineDrawingParams {
  setEncodeNormals: (enabled: boolean) => void;
  outputTarget?: THREE.WebGLRenderTarget | null;
  width?: number;
  height?: number;
  packFields?: boolean;
}

function makeTarget(type: THREE.TextureDataType, depth: boolean) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type,
    depthBuffer: depth,
    stencilBuffer: false,
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  target.texture.generateMipmaps = false;
  return target;
}

function makeMaterial(fragmentShader: string, uniforms: THREE.ShaderMaterial['uniforms']) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: LINE_DRAWING_VERTEX,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    precision: 'highp',
  });
}

export function createLineDrawingPass() {
  const normalTarget = makeTarget(THREE.UnsignedByteType, true);
  const smoothTarget = makeTarget(THREE.HalfFloatType, false);
  const featureTarget = makeTarget(THREE.HalfFloatType, false);
  const thinTarget = makeTarget(THREE.HalfFloatType, false);

  const smoothMaterial = makeMaterial(LINE_DRAWING_SMOOTH_FRAGMENT, {
    tNormals: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
  });
  const featureMaterial = makeMaterial(LINE_DRAWING_FEATURE_FRAGMENT, {
    tSmooth: { value: null },
    tNormals: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uRidgeThreshold: { value: 0.14 },
    uValleyThreshold: { value: 0.1 },
    uOutline: { value: 0.65 },
  });
  const thinMaterial = makeMaterial(LINE_DRAWING_THIN_FRAGMENT, {
    tFeatures: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
  });
  const drawMaterial = makeMaterial(LINE_DRAWING_COMPOSITE_FRAGMENT, {
    tThin: { value: null },
    tFeatures: { value: null },
    tSmooth: { value: null },
    tNormals: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uLineWidth: { value: 1.5 },
    uStyle: { value: 0 },
    uHatch: { value: 0.4 },
  });
  const packMaterial = makeMaterial(LINE_DRAWING_PACK_FRAGMENT, {
    tThin: { value: null },
    tFeatures: { value: null },
    tNormals: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), smoothMaterial);
  const passScene = new THREE.Scene();
  passScene.add(quad);
  const passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const clearColor = new THREE.Color();
  const materials = [smoothMaterial, featureMaterial, thinMaterial, drawMaterial, packMaterial];
  const targets = [normalTarget, smoothTarget, featureTarget, thinTarget];

  function ensureSize(width: number, height: number) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    for (const target of targets) {
      if (target.width !== w || target.height !== h) target.setSize(w, h);
    }
    for (const material of materials) {
      material.uniforms.uResolution.value.set(w, h);
    }
  }

  function blit(
    renderer: THREE.WebGLRenderer,
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget | null,
  ) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(passScene, passCamera);
  }

  function render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: LineDrawingRenderOptions,
  ) {
    const output = options.outputTarget ?? null;
    const drawing = new THREE.Vector2();
    renderer.getDrawingBufferSize(drawing);
    const width = options.width ?? (output ? output.width : drawing.x);
    const height = options.height ?? (output ? output.height : drawing.y);
    ensureSize(width, height);

    smoothMaterial.uniforms.tNormals.value = normalTarget.texture;
    featureMaterial.uniforms.tSmooth.value = smoothTarget.texture;
    featureMaterial.uniforms.tNormals.value = normalTarget.texture;
    featureMaterial.uniforms.uRidgeThreshold.value = options.ridgeThreshold;
    featureMaterial.uniforms.uValleyThreshold.value = options.valleyThreshold;
    featureMaterial.uniforms.uOutline.value = options.outline ?? 0.65;
    thinMaterial.uniforms.tFeatures.value = featureTarget.texture;
    drawMaterial.uniforms.tThin.value = thinTarget.texture;
    drawMaterial.uniforms.tFeatures.value = featureTarget.texture;
    drawMaterial.uniforms.tSmooth.value = smoothTarget.texture;
    drawMaterial.uniforms.tNormals.value = normalTarget.texture;
    drawMaterial.uniforms.uLineWidth.value = options.lineWidth;
    drawMaterial.uniforms.uStyle.value = options.style === 'sketch' ? 1 : 0;
    drawMaterial.uniforms.uHatch.value = options.hatch ?? 0.4;
    packMaterial.uniforms.tThin.value = thinTarget.texture;
    packMaterial.uniforms.tFeatures.value = featureTarget.texture;
    packMaterial.uniforms.tNormals.value = normalTarget.texture;

    const prevTarget = renderer.getRenderTarget();
    const prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(clearColor);
    const prevBackground = scene.background;
    const prevTone = renderer.toneMapping;

    scene.background = null;
    renderer.toneMapping = THREE.NoToneMapping;
    options.setEncodeNormals(true);
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(normalTarget);
    renderer.clear();
    renderer.render(scene, camera);
    options.setEncodeNormals(false);

    blit(renderer, smoothMaterial, smoothTarget);
    blit(renderer, featureMaterial, featureTarget);
    blit(renderer, thinMaterial, thinTarget);

    renderer.setClearColor(options.packFields ? 0x000000 : 0xffffff, options.packFields ? 0 : 1);
    renderer.setRenderTarget(output);
    renderer.clear();
    blit(renderer, options.packFields ? packMaterial : drawMaterial, output);

    scene.background = prevBackground;
    renderer.toneMapping = prevTone;
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(clearColor, prevAlpha);
  }

  function dispose() {
    for (const target of targets) target.dispose();
    for (const material of materials) material.dispose();
    quad.geometry.dispose();
  }

  return { render, dispose };
}
