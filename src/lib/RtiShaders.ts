import * as THREE from 'three';
import { RTI_VERTEX_SHADER, buildRtiFragmentShader } from './shaderChunks.js';
import {
  DEFAULT_DIFFUSE_GAIN,
  DEFAULT_UNSHARP_AMOUNT,
  DEFAULT_SPECULAR_INTENSITY,
} from './rtiEnhancements.js';

const HSH_FRAGMENT = buildRtiFragmentShader(`
  uniform vec3 uLightDir;
  uniform sampler2D tex0;
  uniform sampler2D tex1;
  uniform sampler2D tex2;
  uniform sampler2D tex3;
  uniform sampler2D tex4;
  uniform sampler2D tex5;
  uniform sampler2D tex6;
  uniform sampler2D tex7;
  uniform sampler2D tex8;
  uniform vec4 uBias;
  uniform vec4 uScale;
  uniform vec4 uBiasHi;
  uniform vec4 uScaleHi;
  uniform float uBias8;
  uniform float uScale8;
  uniform int uCoeffCount;

  vec3 unpackCoeff(sampler2D tex, float bias, float scale) {
    return texture2D(tex, vUv).xyz * bias + scale;
  }

  vec3 evaluateHsh(vec3 L) {
    float cosTheta = L.z;
    float cosTheta2 = cosTheta * cosTheta;

    float phi = 0.0;
    if (abs(L.x) > 0.0001 || abs(L.y) > 0.0001) {
      phi = atan(L.y, L.x);
      if (phi < 0.0) phi += 2.0 * 3.14159265;
    }

    float cosPhi = cos(phi);
    float sinPhi = sin(phi);
    float sin2Phi = sin(2.0 * phi);
    float ring = sqrt(max(0.0, cosTheta - cosTheta2));

    float l0 = 1.0 / sqrt(2.0 * 3.14159265);
    float l1 = sqrt(6.0 / 3.14159265) * (cosPhi * ring);
    float l2 = sqrt(3.0 / (2.0 * 3.14159265)) * (-1.0 + 2.0 * cosTheta);
    float l3 = sqrt(6.0 / 3.14159265) * (ring * sinPhi);

    vec3 c0 = unpackCoeff(tex0, uBias.x, uScale.x);
    vec3 c1 = unpackCoeff(tex1, uBias.y, uScale.y);
    vec3 c2 = unpackCoeff(tex2, uBias.z, uScale.z);
    vec3 c3 = unpackCoeff(tex3, uBias.w, uScale.w);
    vec3 color = c0 * l0 + c1 * l1 + c2 * l2 + c3 * l3;

    if (uCoeffCount > 4) {
      float l4 = sqrt(30.0 / 3.14159265) * (cos(2.0 * phi) * (-cosTheta + cosTheta2));
      float l5 = sqrt(30.0 / 3.14159265) * (cosPhi * (-1.0 + 2.0 * cosTheta) * ring);
      float l6 = sqrt(5.0 / (2.0 * 3.14159265)) * (1.0 - 6.0 * cosTheta + 6.0 * cosTheta2);
      float l7 = sqrt(30.0 / 3.14159265) * ((-1.0 + 2.0 * cosTheta) * ring * sinPhi);
      float l8 = sqrt(30.0 / 3.14159265) * ((-cosTheta + cosTheta2) * sin2Phi);

      vec3 c4 = unpackCoeff(tex4, uBiasHi.x, uScaleHi.x);
      vec3 c5 = unpackCoeff(tex5, uBiasHi.y, uScaleHi.y);
      vec3 c6 = unpackCoeff(tex6, uBiasHi.z, uScaleHi.z);
      vec3 c7 = unpackCoeff(tex7, uBiasHi.w, uScaleHi.w);
      vec3 c8 = unpackCoeff(tex8, uBias8, uScale8);
      color += c4 * l4 + c5 * l5 + c6 * l6 + c7 * l7 + c8 * l8;
    }

    return color;
  }

  vec3 hshNormal() {
    vec3 c1 = unpackCoeff(tex1, uBias.y, uScale.y);
    vec3 c2 = unpackCoeff(tex2, uBias.z, uScale.z);
    vec3 c3 = unpackCoeff(tex3, uBias.w, uScale.w);
    float nx = dot(c1, vec3(0.299, 0.587, 0.114));
    float ny = -dot(c3, vec3(0.299, 0.587, 0.114));
    float nz = dot(c2, vec3(0.299, 0.587, 0.114));
    return normalize(vec3(nx, ny, abs(nz) + 0.1));
  }

  void main() {
    clipPaddedBounds();

    vec3 color = evaluateHsh(uLightDir);

    if (uRenderMode == 0) {
      gl_FragColor = vec4(finishColor(color), 1.0);
    } else if (uRenderMode == 1) {
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(finishColor(applySpecularBoost(color, lum)), 1.0);
    } else if (uRenderMode == 2) {
      gl_FragColor = vec4(applyColorGain(shadedNormalColor(hshNormal(), uLightDir)), 1.0);
    } else if (uRenderMode == 3) {
      gl_FragColor = vec4(applyColorGain(slopeHeatmap(hshNormal())), 1.0);
    } else if (uRenderMode == 4) {
      vec3 color2 = evaluateHsh(dualLightDir(uLightDir));
      vec3 dualColor = (max(vec3(0.0), color) * vec3(1.0, 0.3, 0.1)) + (max(vec3(0.0), color2) * vec3(0.1, 0.5, 1.0));
      gl_FragColor = vec4(finishColor(dualColor), 1.0);
    } else if (uRenderMode == 6) {
      gl_FragColor = vec4(packedNormalColor(hshNormal()), 1.0);
    }
  }
`);

const LRGB_PTM_FRAGMENT = buildRtiFragmentShader(`
  uniform vec3 uLightDir;
  uniform sampler2D tex0;
  uniform sampler2D tex1;
  uniform sampler2D tex2;
  uniform vec3 uBias;
  uniform vec3 uBias2;
  uniform vec3 uScale;
  uniform vec3 uScale2;

  vec3 ptmNormal(float a0, float a1, float a2, float a3, float a4) {
    float den = 4.0 * a0 * a1 - a2 * a2;
    float u0 = (a2 * a4 - 2.0 * a1 * a3) / (den + 0.000001);
    float v0 = (a2 * a3 - 2.0 * a0 * a4) / (den + 0.000001);
    float r2 = u0 * u0 + v0 * v0;
    if (r2 > 1.0) {
      float len = sqrt(r2);
      u0 /= len;
      v0 /= len;
      r2 = 1.0;
    }
    return normalize(vec3(u0, -v0, sqrt(max(0.0, 1.0 - r2))));
  }

  void main() {
    clipPaddedBounds();

    vec3 coeffH = texture2D(tex0, vUv).xyz;
    vec3 coeffL = texture2D(tex1, vUv).xyz;
    vec3 color  = texture2D(tex2, vUv).xyz;

    float u = uLightDir.x;
    float v = uLightDir.y;

    float l0 = u * u;
    float l1 = v * v;
    float l2 = u * v;
    float l3 = u;
    float l4 = v;
    float l5 = 1.0;

    float a0 = (coeffH.x - uBias.x / 255.0) * uScale.x;
    float a1 = (coeffH.y - uBias.y / 255.0) * uScale.y;
    float a2 = (coeffH.z - uBias.z / 255.0) * uScale.z;
    float a3 = (coeffL.x - uBias2.x / 255.0) * uScale2.x;
    float a4 = (coeffL.y - uBias2.y / 255.0) * uScale2.y;
    float a5 = (coeffL.z - uBias2.z / 255.0) * uScale2.z;

    float lum = a0*l0 + a1*l1 + a2*l2 + a3*l3 + a4*l4 + a5*l5;

    if (uRenderMode == 0) {
      gl_FragColor = vec4(finishColor(color * lum), 1.0);
    } else if (uRenderMode == 1) {
      gl_FragColor = vec4(finishColor(applySpecularBoost(color * lum, lum)), 1.0);
    } else if (uRenderMode == 2) {
      gl_FragColor = vec4(applyColorGain(shadedNormalColor(ptmNormal(a0, a1, a2, a3, a4), uLightDir)), 1.0);
    } else if (uRenderMode == 3) {
      gl_FragColor = vec4(applyColorGain(slopeHeatmap(ptmNormal(a0, a1, a2, a3, a4))), 1.0);
    } else if (uRenderMode == 4) {
      vec3 L2 = dualLightDir(uLightDir);
      float u2 = L2.x;
      float v2 = L2.y;
      float lum2 = a0*(u2*u2) + a1*(v2*v2) + a2*(u2*v2) + a3*u2 + a4*v2 + a5;
      vec3 dualColor = color * (vec3(1.0, 0.3, 0.1) * max(0.0, lum) + vec3(0.1, 0.5, 1.0) * max(0.0, lum2));
      gl_FragColor = vec4(finishColor(dualColor), 1.0);
    } else if (uRenderMode == 6) {
      gl_FragColor = vec4(packedNormalColor(ptmNormal(a0, a1, a2, a3, a4)), 1.0);
    }
  }
`);

const RGB_PTM_FRAGMENT = buildRtiFragmentShader(`
  uniform vec3 uLightDir;
  uniform sampler2D tex0;
  uniform sampler2D tex1;
  uniform sampler2D tex2;
  uniform sampler2D tex3;
  uniform sampler2D tex4;
  uniform sampler2D tex5;
  uniform vec3 uBias;
  uniform vec3 uBias2;
  uniform vec3 uScale;
  uniform vec3 uScale2;

  vec3 decodeCoeff(sampler2D tex, float bias, float scale) {
    return (texture2D(tex, vUv).xyz - bias / 255.0) * scale;
  }

  vec3 evalRgbPtm(float u, float v) {
    vec3 a0 = decodeCoeff(tex0, uBias.x, uScale.x);
    vec3 a1 = decodeCoeff(tex1, uBias.y, uScale.y);
    vec3 a2 = decodeCoeff(tex2, uBias.z, uScale.z);
    vec3 a3 = decodeCoeff(tex3, uBias2.x, uScale2.x);
    vec3 a4 = decodeCoeff(tex4, uBias2.y, uScale2.y);
    vec3 a5 = decodeCoeff(tex5, uBias2.z, uScale2.z);
    return a0 * (u * u) + a1 * (v * v) + a2 * (u * v) + a3 * u + a4 * v + a5;
  }

  vec3 ptmNormal() {
    vec3 lum = vec3(0.299, 0.587, 0.114);
    float a0 = dot(decodeCoeff(tex0, uBias.x, uScale.x), lum);
    float a1 = dot(decodeCoeff(tex1, uBias.y, uScale.y), lum);
    float a2 = dot(decodeCoeff(tex2, uBias.z, uScale.z), lum);
    float a3 = dot(decodeCoeff(tex3, uBias2.x, uScale2.x), lum);
    float a4 = dot(decodeCoeff(tex4, uBias2.y, uScale2.y), lum);
    float den = 4.0 * a0 * a1 - a2 * a2;
    float u0 = (a2 * a4 - 2.0 * a1 * a3) / (den + 0.000001);
    float v0 = (a2 * a3 - 2.0 * a0 * a4) / (den + 0.000001);
    float r2 = u0 * u0 + v0 * v0;
    if (r2 > 1.0) {
      float len = sqrt(r2);
      u0 /= len;
      v0 /= len;
      r2 = 1.0;
    }
    return normalize(vec3(u0, -v0, sqrt(max(0.0, 1.0 - r2))));
  }

  void main() {
    clipPaddedBounds();

    float u = uLightDir.x;
    float v = uLightDir.y;
    vec3 color = evalRgbPtm(u, v);

    if (uRenderMode == 0) {
      gl_FragColor = vec4(finishColor(color), 1.0);
    } else if (uRenderMode == 1) {
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      gl_FragColor = vec4(finishColor(applySpecularBoost(color, lum)), 1.0);
    } else if (uRenderMode == 2) {
      gl_FragColor = vec4(applyColorGain(shadedNormalColor(ptmNormal(), uLightDir)), 1.0);
    } else if (uRenderMode == 3) {
      gl_FragColor = vec4(applyColorGain(slopeHeatmap(ptmNormal())), 1.0);
    } else if (uRenderMode == 4) {
      vec3 L2 = dualLightDir(uLightDir);
      vec3 color2 = evalRgbPtm(L2.x, L2.y);
      vec3 dualColor = (max(vec3(0.0), color) * vec3(1.0, 0.3, 0.1)) + (max(vec3(0.0), color2) * vec3(0.1, 0.5, 1.0));
      gl_FragColor = vec4(finishColor(dualColor), 1.0);
    } else if (uRenderMode == 6) {
      gl_FragColor = vec4(packedNormalColor(ptmNormal()), 1.0);
    }
  }
`);

const NEURAL_RTI_FRAGMENT = buildRtiFragmentShader(`
  uniform vec3 uLightDir;
  uniform sampler2D tex0;
  uniform float uW1[112];
  uniform float uB1[16];
  uniform float uW2[256];
  uniform float uB2[16];
  uniform float uW3[48];
  uniform float uB3[3];

  vec3 evaluateMLP(vec3 lDir, vec4 latent) {
    float x[7];
    x[0] = latent.r;
    x[1] = latent.g;
    x[2] = latent.b;
    x[3] = latent.a;
    x[4] = lDir.x;
    x[5] = lDir.y;
    x[6] = lDir.z;

    float h1[16];
    for (int i = 0; i < 16; i++) {
      float val = uB1[i];
      for (int j = 0; j < 7; j++) {
        val += uW1[i * 7 + j] * x[j];
      }
      h1[i] = max(0.0, val);
    }

    float h2[16];
    for (int i = 0; i < 16; i++) {
      float val = uB2[i];
      for (int j = 0; j < 16; j++) {
        val += uW2[i * 16 + j] * h1[j];
      }
      h2[i] = max(0.0, val);
    }

    float rgb[3];
    for (int i = 0; i < 3; i++) {
      float val = uB3[i];
      for (int j = 0; j < 16; j++) {
        val += uW3[i * 16 + j] * h2[j];
      }
      rgb[i] = 1.0 / (1.0 + exp(-val));
    }

    return vec3(rgb[0], rgb[1], rgb[2]);
  }

  void main() {
    clipPaddedBounds();

    vec4 latent = texture2D(tex0, vUv);
    vec3 color = evaluateMLP(uLightDir, latent);

    if (uRenderMode == 0) {
      gl_FragColor = vec4(finishColor(color), 1.0);
    } else if (uRenderMode == 7) {
      gl_FragColor = vec4(applyColorGain(latent.rgb), 1.0);
    } else {
      float eps = 0.005;
      float z_eps = sqrt(1.0 - eps * eps);

      vec3 c0 = evaluateMLP(vec3(0.0, 0.0, 1.0), latent);
      vec3 cx = evaluateMLP(vec3(eps, 0.0, z_eps), latent);
      vec3 cy = evaluateMLP(vec3(0.0, eps, z_eps), latent);

      float y0 = dot(c0, vec3(0.299, 0.587, 0.114));
      float yx = dot(cx, vec3(0.299, 0.587, 0.114));
      float yy = dot(cy, vec3(0.299, 0.587, 0.114));

      float gx = (yx - y0) / eps;
      float gy = (yy - y0) / eps;
      vec3 N = normalize(vec3(-gx * 4.0, -gy * 4.0, 1.0));

      if (uRenderMode == 1) {
        vec3 L = normalize(uLightDir);
        vec3 V = vec3(0.0, 0.0, 1.0);
        vec3 H = normalize(L + V);
        float specular = pow(max(0.0, dot(N, H)), uSpecularExponent);
        gl_FragColor = vec4(finishColor(color + vec3(specular * uSpecularIntensity)), 1.0);
      } else if (uRenderMode == 2) {
        gl_FragColor = vec4(applyColorGain(shadedNormalColor(N, uLightDir)), 1.0);
      } else if (uRenderMode == 3) {
        gl_FragColor = vec4(applyColorGain(slopeHeatmap(N)), 1.0);
      } else if (uRenderMode == 4) {
        vec3 color2 = evaluateMLP(dualLightDir(uLightDir), latent);
        vec3 dualColor = (max(vec3(0.0), color) * vec3(1.0, 0.3, 0.1)) + (max(vec3(0.0), color2) * vec3(0.1, 0.5, 1.0));
        gl_FragColor = vec4(finishColor(dualColor), 1.0);
      } else if (uRenderMode == 6) {
        gl_FragColor = vec4(packedNormalColor(N), 1.0);
      }
    }
  }
`);

function defaultColorGain(colorGain: THREE.Vector3) {
  return colorGain?.clone?.() ?? new THREE.Vector3(1, 1, 1);
}

function enhancementUniforms() {
  return {
    uDiffuseGain: { value: DEFAULT_DIFFUSE_GAIN },
    uUnsharpAmount: { value: DEFAULT_UNSHARP_AMOUNT },
    uSpecularIntensity: { value: DEFAULT_SPECULAR_INTENSITY },
    uLightDir2: { value: new THREE.Vector3(0, 0, 1) },
    uDualLinked: { value: 1.0 },
  };
}

export const HshShaderMaterial = (
  textures: THREE.Texture[],
  lightDir: THREE.Vector3,
  bias: number[],
  scale: number[],
  bounds: THREE.Vector4,
  colorGain: THREE.Vector3,
) => new THREE.ShaderMaterial({
  uniforms: {
    uLightDir: { value: lightDir },
    tex0: { value: textures[0] || null },
    tex1: { value: textures[1] || textures[0] || null },
    tex2: { value: textures[2] || textures[0] || null },
    tex3: { value: textures[3] || textures[0] || null },
    tex4: { value: textures[4] || textures[0] || null },
    tex5: { value: textures[5] || textures[0] || null },
    tex6: { value: textures[6] || textures[0] || null },
    tex7: { value: textures[7] || textures[0] || null },
    tex8: { value: textures[8] || textures[0] || null },
    uBias: { value: new THREE.Vector4(bias[0] || 0, bias[1] || 0, bias[2] || 0, bias[3] || 0) },
    uScale: { value: new THREE.Vector4(scale[0] || 0, scale[1] || 0, scale[2] || 0, scale[3] || 0) },
    uBiasHi: { value: new THREE.Vector4(bias[4] || 0, bias[5] || 0, bias[6] || 0, bias[7] || 0) },
    uScaleHi: { value: new THREE.Vector4(scale[4] || 0, scale[5] || 0, scale[6] || 0, scale[7] || 0) },
    uBias8: { value: bias[8] || 0 },
    uScale8: { value: scale[8] || 0 },
    uCoeffCount: { value: textures.length },
    uBounds: { value: bounds },
    uRenderMode: { value: 0 },
    uSpecularExponent: { value: 10.0 },
    uColorGain: { value: defaultColorGain(colorGain) },
    ...enhancementUniforms(),
  },
  vertexShader: RTI_VERTEX_SHADER,
  fragmentShader: HSH_FRAGMENT,
  transparent: true,
});

function padCoeffArray(values: number[] | undefined, length: number, fill: number): number[] {
  const next = Array.isArray(values) ? values.slice(0, length) : [];
  while (next.length < length) next.push(fill);
  return next;
}

export const LrgbPtmMaterial = (
  textures: THREE.Texture[],
  lightDir: THREE.Vector3,
  bias: number[],
  scale: number[],
  bounds: THREE.Vector4,
  colorGain: THREE.Vector3,
) => {
  const paddedBias = padCoeffArray(bias, 6, 0);
  const paddedScale = padCoeffArray(scale, 6, 1);

  return new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: lightDir },
      tex0: { value: textures[0] || null },
      tex1: { value: textures[1] || null },
      tex2: { value: textures[2] || null },
      uBias: { value: new THREE.Vector3(paddedBias[0], paddedBias[1], paddedBias[2]) },
      uBias2: { value: new THREE.Vector3(paddedBias[3], paddedBias[4], paddedBias[5]) },
      uScale: { value: new THREE.Vector3(paddedScale[0], paddedScale[1], paddedScale[2]) },
      uScale2: { value: new THREE.Vector3(paddedScale[3], paddedScale[4], paddedScale[5]) },
      uBounds: { value: bounds },
      uRenderMode: { value: 0 },
      uSpecularExponent: { value: 10.0 },
      uColorGain: { value: defaultColorGain(colorGain) },
      ...enhancementUniforms(),
    },
    vertexShader: RTI_VERTEX_SHADER,
    fragmentShader: LRGB_PTM_FRAGMENT,
    transparent: true,
  });
};

export const RgbPtmMaterial = (
  textures: THREE.Texture[],
  lightDir: THREE.Vector3,
  bias: number[],
  scale: number[],
  bounds: THREE.Vector4,
  colorGain: THREE.Vector3,
) => {
  const paddedBias = padCoeffArray(bias, 6, 0);
  const paddedScale = padCoeffArray(scale, 6, 1);

  return new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: lightDir },
      tex0: { value: textures[0] || null },
      tex1: { value: textures[1] || null },
      tex2: { value: textures[2] || null },
      tex3: { value: textures[3] || null },
      tex4: { value: textures[4] || null },
      tex5: { value: textures[5] || null },
      uBias: { value: new THREE.Vector3(paddedBias[0], paddedBias[1], paddedBias[2]) },
      uBias2: { value: new THREE.Vector3(paddedBias[3], paddedBias[4], paddedBias[5]) },
      uScale: { value: new THREE.Vector3(paddedScale[0], paddedScale[1], paddedScale[2]) },
      uScale2: { value: new THREE.Vector3(paddedScale[3], paddedScale[4], paddedScale[5]) },
      uBounds: { value: bounds },
      uRenderMode: { value: 0 },
      uSpecularExponent: { value: 10.0 },
      uColorGain: { value: defaultColorGain(colorGain) },
      ...enhancementUniforms(),
    },
    vertexShader: RTI_VERTEX_SHADER,
    fragmentShader: RGB_PTM_FRAGMENT,
    transparent: true,
  });
};

export const NeuralRtiMaterial = (
  textures: THREE.Texture[],
  lightDir: THREE.Vector3,
  weights: { w1: number[][]; b1: number[]; w2: number[][]; b2: number[]; w3: number[][]; b3: number[] },
  bounds: THREE.Vector4,
  colorGain: THREE.Vector3,
) => {
  const w1: number[] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 7; j++) {
      w1.push(weights.w1[i][j]);
    }
  }
  const b1 = weights.b1;

  const w2: number[] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      w2.push(weights.w2[i][j]);
    }
  }
  const b2 = weights.b2;

  const w3: number[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 16; j++) {
      w3.push(weights.w3[i][j]);
    }
  }
  const b3 = weights.b3;

  return new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: lightDir },
      tex0: { value: textures[0] || null },
      uBounds: { value: bounds },
      uW1: { value: new Float32Array(w1) },
      uB1: { value: new Float32Array(b1) },
      uW2: { value: new Float32Array(w2) },
      uB2: { value: new Float32Array(b2) },
      uW3: { value: new Float32Array(w3) },
      uB3: { value: new Float32Array(b3) },
      uRenderMode: { value: 0 },
      uSpecularExponent: { value: 10.0 },
      uColorGain: { value: defaultColorGain(colorGain) },
      ...enhancementUniforms(),
    },
    vertexShader: RTI_VERTEX_SHADER,
    fragmentShader: NEURAL_RTI_FRAGMENT,
    transparent: true,
  });
};
