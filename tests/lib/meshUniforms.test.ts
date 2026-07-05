import { describe, it, expect, vi } from 'vitest';
import type { Ref } from 'vue';
import type * as THREE from 'three';
import { createMeshUniformSync } from '@/lib/meshUniforms.js';
import { mockVector3 } from '../testUtils.js';

describe('createMeshUniformSync', () => {
  it('syncs light, render mode, specular, and color gain onto mesh uniforms', () => {
    const lightDir = { value: { x: 0.1, y: 0.2, z: 0.97 } } as unknown as Ref<THREE.Vector3>;
    const renderMode = { value: 2 } as unknown as Ref<number>;
    const specularExponent = { value: 15 } as unknown as Ref<number>;
    const colorGainVector = mockVector3(1.1, 0.9, 1);

    const uniforms = {
      uLightDir: { value: { copy: vi.fn() } },
      uRenderMode: { value: 0 },
      uSpecularExponent: { value: 10 },
      uColorGain: { value: { copy: vi.fn() } },
    };
    const tileMeshes = new Map([[1, { material: { uniforms } }]]) as unknown as Parameters<typeof createMeshUniformSync>[0]['tileMeshes'];

    const { syncMeshUniforms } = createMeshUniformSync({
      tileMeshes,
      lightDir,
      renderMode,
      specularExponent,
      colorGainVector,
    });

    syncMeshUniforms(tileMeshes.get(1));

    expect(uniforms.uLightDir.value.copy).toHaveBeenCalledWith(lightDir.value);
    expect(uniforms.uRenderMode.value).toBe(2);
    expect(uniforms.uSpecularExponent.value).toBe(15);
    expect(uniforms.uColorGain.value.copy).toHaveBeenCalledWith(colorGainVector);
  });
});
