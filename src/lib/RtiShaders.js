import * as THREE from 'three';

export const HshShaderMaterial = (textures, lightDir, bias, scale, bounds) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: { value: lightDir },
      tex0: { value: textures[0] || null },
      tex1: { value: textures[1] || null },
      tex2: { value: textures[2] || null },
      tex3: { value: textures[3] || null },
      uBias: { value: new THREE.Vector4(bias[0]||0, bias[1]||0, bias[2]||0, bias[3]||0) },
      uScale: { value: new THREE.Vector4(scale[0]||0, scale[1]||0, scale[2]||0, scale[3]||0) },
      uBounds: { value: bounds },
      uRenderMode: { value: 0 },
      uSpecularExponent: { value: 10.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec2 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = wPos.xy;
        gl_Position = projectionMatrix * viewMatrix * wPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uLightDir;
      uniform sampler2D tex0;
      uniform sampler2D tex1;
      uniform sampler2D tex2;
      uniform sampler2D tex3;
      uniform vec4 uBias;
      uniform vec4 uScale;
      uniform vec4 uBounds;
      uniform int uRenderMode;
      uniform float uSpecularExponent;

      varying vec2 vUv;
      varying vec2 vWorldPos;

      void main() {
        if (vWorldPos.x < uBounds.x || vWorldPos.x > uBounds.y || vWorldPos.y < uBounds.z || vWorldPos.y > uBounds.w) {
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
          gl_FragColor = vec4(color, 1.0);
        } else if (uRenderMode == 1) {
          float lum = dot(color, vec3(0.299, 0.587, 0.114));
          float specular = pow(max(0.0, lum), uSpecularExponent);
          gl_FragColor = vec4(color + vec3(specular * 0.8), 1.0);
        } else if (uRenderMode == 2) {
          // Calculate pseudo-normals from first-order HSH coefficients
          float nx = dot(c1, vec3(0.299, 0.587, 0.114));
          float ny = -dot(c3, vec3(0.299, 0.587, 0.114)); // Y is often flipped
          float nz = dot(c2, vec3(0.299, 0.587, 0.114));
          
          vec3 N = normalize(vec3(nx, ny, abs(nz) + 0.1));
          vec3 L = normalize(uLightDir);
          
          float diffuse = max(0.0, dot(N, L));
          
          vec3 normalColor = N * 0.5 + 0.5;
          gl_FragColor = vec4(normalColor * (diffuse * 0.8 + 0.2), 1.0);
        } else if (uRenderMode == 3) {
          // Slope Heatmap
          float nx = dot(c1, vec3(0.299, 0.587, 0.114));
          float ny = -dot(c3, vec3(0.299, 0.587, 0.114));
          float nz = dot(c2, vec3(0.299, 0.587, 0.114));
          vec3 N = normalize(vec3(nx, ny, abs(nz) + 0.1));
          
          float steepness = 1.0 - N.z;
          vec3 heat = mix(vec3(0.0, 0.0, 0.8), vec3(0.0, 0.8, 0.2), clamp(steepness * 3.0, 0.0, 1.0));
          heat = mix(heat, vec3(1.0, 0.0, 0.0), clamp(steepness * 3.0 - 1.0, 0.0, 1.0));
          gl_FragColor = vec4(heat, 1.0);
        } else if (uRenderMode == 4) {
          // Dual Light (Red/Blue Raking Light)
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
          gl_FragColor = vec4(dualColor, 1.0);
        }
      }
    `,
    transparent: true
  });
};

// 2 = LRGB PTM
export const LrgbPtmMaterial = (textures, lightDir, bias, scale, bounds) => {
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
      uSpecularExponent: { value: 10.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec2 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = wPos.xy;
        gl_Position = projectionMatrix * viewMatrix * wPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uLightDir;
      uniform sampler2D tex0;
      uniform sampler2D tex1;
      uniform sampler2D tex2;
      
      uniform vec3 uBias;
      uniform vec3 uBias2;
      uniform vec3 uScale;
      uniform vec3 uScale2;
      uniform vec4 uBounds;
      uniform int uRenderMode;
      uniform float uSpecularExponent;

      varying vec2 vUv;
      varying vec2 vWorldPos;

      void main() {
        if (vWorldPos.x < uBounds.x || vWorldPos.x > uBounds.y || vWorldPos.y < uBounds.z || vWorldPos.y > uBounds.w) {
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
          // Default RTI
          gl_FragColor = vec4(color * lum, 1.0);
        } else if (uRenderMode == 1) {
          // Specular Enhancement (Glossy)
          float specular = pow(max(0.0, lum), uSpecularExponent);
          gl_FragColor = vec4(color * lum + vec3(specular * 0.8), 1.0);
        } else if (uRenderMode == 2) {
          // Normals Mode (Shaded)
          // Compute peak luminance direction (u0, v0) using derivatives
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
          vec3 L = normalize(uLightDir);
          
          // Calculate pure structural lighting (Diffuse + Specular on the normal)
          float diffuse = max(0.0, dot(N, L));
          
          // Wir geben die Normalen in RGB aus, aber beleuchten sie mit dem aktuellen Licht!
          vec3 normalColor = N * 0.5 + 0.5;
          gl_FragColor = vec4(normalColor * (diffuse * 0.8 + 0.2), 1.0);
        } else if (uRenderMode == 3) {
          // Slope Heatmap
          float den = 4.0 * a0 * a1 - a2 * a2;
          float u0 = (a2 * a4 - 2.0 * a1 * a3) / (den + 0.000001);
          float v0 = (a2 * a3 - 2.0 * a0 * a4) / (den + 0.000001);
          float r2 = u0*u0 + v0*v0;
          if (r2 > 1.0) r2 = 1.0;
          
          float nz = sqrt(max(0.0, 1.0 - r2));
          float steepness = 1.0 - nz;
          
          vec3 heat = mix(vec3(0.0, 0.0, 0.8), vec3(0.0, 0.8, 0.2), clamp(steepness * 3.0, 0.0, 1.0));
          heat = mix(heat, vec3(1.0, 0.0, 0.0), clamp(steepness * 3.0 - 1.0, 0.0, 1.0));
          gl_FragColor = vec4(heat, 1.0);
        } else if (uRenderMode == 4) {
          // Dual Light (Red/Blue Raking Light)
          float u2 = -uLightDir.x;
          float v2 = -uLightDir.y;
          float lum2 = a0*(u2*u2) + a1*(v2*v2) + a2*(u2*v2) + a3*u2 + a4*v2 + a5;
          
          vec3 dualColor = color * (vec3(1.0, 0.3, 0.1) * max(0.0, lum) + vec3(0.1, 0.5, 1.0) * max(0.0, lum2));
          gl_FragColor = vec4(dualColor, 1.0);
        }
      }
    `,
    transparent: true
  });
};
