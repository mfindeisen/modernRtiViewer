/** Screen-space line drawing from an encoded normal buffer. */

import * as THREE from 'three';

export const LINE_DRAWING_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const LINE_DRAWING_FRAGMENT = `
  uniform sampler2D tNormals;
  uniform vec2 uResolution;
  uniform float uRidgeThreshold;
  uniform float uValleyThreshold;
  uniform float uLineWidth;
  varying vec2 vUv;

  vec3 decodeNormal(vec4 c, vec3 fallback) {
    if (c.a < 0.5) return fallback;
    return normalize(c.rgb * 2.0 - 1.0);
  }

  void main() {
    vec4 center = texture2D(tNormals, vUv);
    if (center.a < 0.5) {
      gl_FragColor = vec4(1.0);
      return;
    }

    vec3 n = decodeNormal(center, vec3(0.0, 0.0, 1.0));
    vec2 px = (1.0 / uResolution) * max(uLineWidth, 1.0);

    vec3 nL = decodeNormal(texture2D(tNormals, vUv - vec2(px.x, 0.0)), n);
    vec3 nR = decodeNormal(texture2D(tNormals, vUv + vec2(px.x, 0.0)), n);
    vec3 nD = decodeNormal(texture2D(tNormals, vUv - vec2(0.0, px.y)), n);
    vec3 nU = decodeNormal(texture2D(tNormals, vUv + vec2(0.0, px.y)), n);

    float divN = (nR.x - nL.x) + (nU.y - nD.y);
    float ridge = max(0.0, divN);
    float valley = max(0.0, -divN);
    float edge = length(nR - nL) + length(nU - nD);

    float ridgeInk = smoothstep(uRidgeThreshold, uRidgeThreshold + 0.05, ridge);
    float valleyInk = smoothstep(uValleyThreshold, uValleyThreshold + 0.04, valley);
    float edgeInk = smoothstep(uRidgeThreshold * 0.85, uRidgeThreshold * 0.85 + 0.06, edge);
    float slopeInk = smoothstep(0.45, 0.7, 1.0 - n.z) * 0.35;

    float ink = max(max(ridgeInk, valleyInk), max(edgeInk * 0.8, slopeInk));
    float paper = 1.0 - clamp(ink, 0.0, 1.0);
    gl_FragColor = vec4(vec3(paper), 1.0);
  }
`;

export interface LineDrawingParams {
  ridgeThreshold: number;
  valleyThreshold: number;
  lineWidth: number;
}

export interface LineDrawingRenderOptions extends LineDrawingParams {
  setEncodeNormals: (enabled: boolean) => void;
  outputTarget?: THREE.WebGLRenderTarget | null;
  width?: number;
  height?: number;
}

export function createLineDrawingPass() {
  const normalTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  });
  normalTarget.texture.colorSpace = THREE.NoColorSpace;
  normalTarget.texture.generateMipmaps = false;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tNormals: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uRidgeThreshold: { value: 0.14 },
      uValleyThreshold: { value: 0.1 },
      uLineWidth: { value: 1.5 },
    },
    vertexShader: LINE_DRAWING_VERTEX,
    fragmentShader: LINE_DRAWING_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  const passScene = new THREE.Scene();
  passScene.add(quad);
  const passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const clearColor = new THREE.Color();

  function ensureSize(width: number, height: number) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (normalTarget.width !== w || normalTarget.height !== h) {
      normalTarget.setSize(w, h);
    }
    material.uniforms.uResolution.value.set(w, h);
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

    material.uniforms.tNormals.value = normalTarget.texture;
    material.uniforms.uRidgeThreshold.value = options.ridgeThreshold;
    material.uniforms.uValleyThreshold.value = options.valleyThreshold;
    material.uniforms.uLineWidth.value = options.lineWidth;

    const prevTarget = renderer.getRenderTarget();
    const prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(clearColor);
    const prevBackground = scene.background;

    scene.background = null;
    options.setEncodeNormals(true);
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(normalTarget);
    renderer.clear();
    renderer.render(scene, camera);
    options.setEncodeNormals(false);

    renderer.setClearColor(0xffffff, 1);
    renderer.setRenderTarget(output);
    renderer.clear();
    renderer.render(passScene, passCamera);

    scene.background = prevBackground;
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(clearColor, prevAlpha);
  }

  function dispose() {
    normalTarget.dispose();
    material.dispose();
    quad.geometry.dispose();
  }

  return { render, dispose };
}
