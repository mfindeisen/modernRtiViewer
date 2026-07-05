import * as THREE from 'three';
import { RTI_VERTEX_SHADER, buildRtiFragmentShader } from './shaderChunks.js';

const HSH_FRAGMENT = buildRtiFragmentShader(`
  uniform vec3 uLightDir;
  uniform sampler2D tex0;
  uniform sampler2D tex1;
  uniform sampler2D tex2;
  uniform sampler2D tex3;
  uniform vec4 uBias;
  uniform vec4 uScale;

  void main() {
    if (outsideBounds(vWorldPos, uBounds)) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec3 c0 = texture2D(tex0, vUv).xyz;
    vec3 c1 = texture2D(tex1, vUv).xyz;
    vec3 c2 = texture2D(tex2, vUv).xyz;
    vec3 c3 = texture2D(tex3, vUv).xyz;

    c0 = c0 * uBias.x + uScale.x;
    c1 = c1 * uBias.y + uScale.y;
    c2 = c2 * uBias.z + uScale.z;
    c3 = c3 * uBias.w + uScale.w;

    float cosTheta = uLightDir.z;
    float cosTheta2 = cosTheta * cosTheta;

    float phi = 0.0;
    if (abs(uLightDir.x) > 0.0001 || abs(uLightDir.y) > 0.0001) {
      phi = atan(uLightDir.y, uLightDir.x);
      if (phi < 0.0) phi += 2.0 * 3.14159265;
    }

    float cosPhi = cos(phi);
    float sinPhi = sin(phi);

    float l0 = 1.0 / sqrt(2.0 * 3.14159265);
    float l1 = sqrt(6.0 / 3.14159265) * (cosPhi * sqrt(max(0.0, cosTheta - cosTheta2)));
    float l2 = sqrt(3.0 / (2.0 * 3.14159265)) * (-1.0 + 2.0 * cosTheta);
    float l3 = sqrt(6.0 / 3.14159265) * (sqrt(max(0.0, cosTheta - cosTheta2)) * sinPhi);

    vec3 color = c0 * l0 + c1 * l1 + c2 * l2 + c3 * l3;

    if (uRenderMode == 0) {
      gl_FragColor = vec4(applyColorGain(color), 1.0);
    } else if (uRenderMode == 1) {
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      float specular = pow(max(0.0, lum), uSpecularExponent);
      gl_FragColor = vec4(applyColorGain(color + vec3(specular * 0.8)), 1.0);
    } else if (uRenderMode == 2) {
      float nx = dot(c1, vec3(0.299, 0.587, 0.114));
      float ny = -dot(c3, vec3(0.299, 0.587, 0.114));
      float nz = dot(c2, vec3(0.299, 0.587, 0.114));
      vec3 N = normalize(vec3(nx, ny, abs(nz) + 0.1));
      gl_FragColor = vec4(applyColorGain(shadedNormalColor(N, uLightDir)), 1.0);
    } else if (uRenderMode == 3) {
      float nx = dot(c1, vec3(0.299, 0.587, 0.114));
      float ny = -dot(c3, vec3(0.299, 0.587, 0.114));
      float nz = dot(c2, vec3(0.299, 0.587, 0.114));
      vec3 N = normalize(vec3(nx, ny, abs(nz) + 0.1));
      gl_FragColor = vec4(applyColorGain(slopeHeatmap(N)), 1.0);
    } else if (uRenderMode == 4) {
      vec3 L2 = vec3(-uLightDir.x, -uLightDir.y, uLightDir.z);
      float phi2 = 0.0;
      if (abs(L2.x) > 0.0001 || abs(L2.y) > 0.0001) {
        phi2 = atan(L2.y, L2.x);
        if (phi2 < 0.0) phi2 += 2.0 * 3.14159265;
      }
      float l1_2 = sqrt(6.0 / 3.14159265) * (cos(phi2) * sqrt(max(0.0, cosTheta - cosTheta2)));
      float l3_2 = sqrt(6.0 / 3.14159265) * (sqrt(max(0.0, cosTheta - cosTheta2)) * sin(phi2));
      vec3 color2 = c0 * l0 + c1 * l1_2 + c2 * l2 + c3 * l3_2;
      vec3 dualColor = (max(vec3(0.0), color) * vec3(1.0, 0.3, 0.1)) + (max(vec3(0.0), color2) * vec3(0.1, 0.5, 1.0));
      gl_FragColor = vec4(applyColorGain(dualColor), 1.0);
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

  void main() {
    if (outsideBounds(vWorldPos, uBounds)) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

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
      gl_FragColor = vec4(applyColorGain(color * lum), 1.0);
    } else if (uRenderMode == 1) {
      float specular = pow(max(0.0, lum), uSpecularExponent);
      gl_FragColor = vec4(applyColorGain(color * lum + vec3(specular * 0.8)), 1.0);
    } else if (uRenderMode == 2) {
      float den = 4.0 * a0 * a1 - a2 * a2;
      float u0 = (a2 * a4 - 2.0 * a1 * a3) / (den + 0.000001);
      float v0 = (a2 * a3 - 2.0 * a0 * a4) / (den + 0.000001);
      float r2 = u0*u0 + v0*v0;
      if (r2 > 1.0) {
        float len = sqrt(r2);
        u0 /= len;
        v0 /= len;
        r2 = 1.0;
      }
      vec3 N = normalize(vec3(u0, -v0, sqrt(max(0.0, 1.0 - r2))));
      gl_FragColor = vec4(applyColorGain(shadedNormalColor(N, uLightDir)), 1.0);
    } else if (uRenderMode == 3) {
      float den = 4.0 * a0 * a1 - a2 * a2;
      float u0 = (a2 * a4 - 2.0 * a1 * a3) / (den + 0.000001);
      float v0 = (a2 * a3 - 2.0 * a0 * a4) / (den + 0.000001);
      float r2 = u0*u0 + v0*v0;
      if (r2 > 1.0) r2 = 1.0;
      float nz = sqrt(max(0.0, 1.0 - r2));
      vec3 N = normalize(vec3(u0, -v0, nz));
      gl_FragColor = vec4(applyColorGain(slopeHeatmap(N)), 1.0);
    } else if (uRenderMode == 4) {
      float u2 = -uLightDir.x;
      float v2 = -uLightDir.y;
      float lum2 = a0*(u2*u2) + a1*(v2*v2) + a2*(u2*v2) + a3*u2 + a4*v2 + a5;
      vec3 dualColor = color * (vec3(1.0, 0.3, 0.1) * max(0.0, lum) + vec3(0.1, 0.5, 1.0) * max(0.0, lum2));
      gl_FragColor = vec4(applyColorGain(dualColor), 1.0);
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
    if (outsideBounds(vWorldPos, uBounds)) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec4 latent = texture2D(tex0, vUv);
    vec3 color = evaluateMLP(uLightDir, latent);

    if (uRenderMode == 0) {
      gl_FragColor = vec4(applyColorGain(color), 1.0);
    } else if (uRenderMode == 5) {
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
        gl_FragColor = vec4(applyColorGain(color + vec3(specular * 0.8)), 1.0);
      } else if (uRenderMode == 2) {
        gl_FragColor = vec4(applyColorGain(shadedNormalColor(N, uLightDir)), 1.0);
      } else if (uRenderMode == 3) {
        gl_FragColor = vec4(applyColorGain(slopeHeatmap(N)), 1.0);
      } else if (uRenderMode == 4) {
        vec3 color2 = evaluateMLP(vec3(-uLightDir.x, -uLightDir.y, uLightDir.z), latent);
        vec3 dualColor = (max(vec3(0.0), color) * vec3(1.0, 0.3, 0.1)) + (max(vec3(0.0), color2) * vec3(0.1, 0.5, 1.0));
        gl_FragColor = vec4(applyColorGain(dualColor), 1.0);
      }
    }
  }
`);

function defaultColorGain(colorGain: THREE.Vector3) {
  return colorGain?.clone?.() ?? new THREE.Vector3(1, 1, 1);
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
    tex1: { value: textures[1] || null },
    tex2: { value: textures[2] || null },
    tex3: { value: textures[3] || null },
    uBias: { value: new THREE.Vector4(bias[0] || 0, bias[1] || 0, bias[2] || 0, bias[3] || 0) },
    uScale: { value: new THREE.Vector4(scale[0] || 0, scale[1] || 0, scale[2] || 0, scale[3] || 0) },
    uBounds: { value: bounds },
    uRenderMode: { value: 0 },
    uSpecularExponent: { value: 10.0 },
    uColorGain: { value: defaultColorGain(colorGain) },
  },
  vertexShader: RTI_VERTEX_SHADER,
  fragmentShader: HSH_FRAGMENT,
  transparent: true,
});

export const LrgbPtmMaterial = (
  textures: THREE.Texture[],
  lightDir: THREE.Vector3,
  bias: number[],
  scale: number[],
  bounds: THREE.Vector4,
  colorGain: THREE.Vector3,
) => {
  while (bias.length < 6) bias.push(0);
  while (scale.length < 6) scale.push(1);

  return new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: lightDir },
      tex0: { value: textures[0] || null },
      tex1: { value: textures[1] || null },
      tex2: { value: textures[2] || null },
      uBias: { value: new THREE.Vector3(bias[0], bias[1], bias[2]) },
      uBias2: { value: new THREE.Vector3(bias[3], bias[4], bias[5]) },
      uScale: { value: new THREE.Vector3(scale[0], scale[1], scale[2]) },
      uScale2: { value: new THREE.Vector3(scale[3], scale[4], scale[5]) },
      uBounds: { value: bounds },
      uRenderMode: { value: 0 },
      uSpecularExponent: { value: 10.0 },
      uColorGain: { value: defaultColorGain(colorGain) },
    },
    vertexShader: RTI_VERTEX_SHADER,
    fragmentShader: LRGB_PTM_FRAGMENT,
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
    },
    vertexShader: RTI_VERTEX_SHADER,
    fragmentShader: NEURAL_RTI_FRAGMENT,
    transparent: true,
  });
};
