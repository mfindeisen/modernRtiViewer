import { describe, it, expect, vi } from 'vitest';
import type * as THREE from 'three';
import type { QuadtreeManager } from '@/lib/QuadtreeManager.js';
import type { RtiInfo } from '@/types/rti.js';

vi.mock('@/lib/RtiShaders.js', () => ({
  HshShaderMaterial: vi.fn(() => ({ type: 'hsh' })),
  LrgbPtmMaterial: vi.fn(() => ({ type: 'lrgb' })),
  NeuralRtiMaterial: vi.fn(() => ({ type: 'neural' })),
}));

vi.mock('@/lib/ImageShaderMaterial.js', () => ({
  ImageShaderMaterial: vi.fn(() => ({ type: 'image' })),
}));

import { HshShaderMaterial, LrgbPtmMaterial, NeuralRtiMaterial } from '@/lib/RtiShaders.js';
import { ImageShaderMaterial } from '@/lib/ImageShaderMaterial.js';
import { quadtreeToBounds, createRtiMaterial } from '@/lib/rtiMaterialFactory.js';

describe('quadtreeToBounds', () => {
  it('converts normalized imgBox to world bounds', () => {
    const bounds = quadtreeToBounds({
      maxSize: 1024,
      imgBox: { minX: 0.1, maxX: 0.9, minY: 0.2, maxY: 0.8 },
    } as unknown as QuadtreeManager);

    expect(bounds.x).toBeCloseTo(-409.6);
    expect(bounds.y).toBeCloseTo(409.6);
    expect(bounds.z).toBeCloseTo(-307.2);
    expect(bounds.w).toBeCloseTo(307.2);
  });
});

describe('createRtiMaterial', () => {
  const base = {
    textures: ['t0', 't1'] as unknown as THREE.Texture[],
    lightDir: { x: 0, y: 0, z: 1 } as THREE.Vector3,
    bounds: { x: 0, y: 1, z: 0, w: 1 } as THREE.Vector4,
    colorGain: { x: 1, y: 1, z: 1 } as THREE.Vector3,
  };

  const stubInfo = {
    width: 1,
    height: 1,
    tileSize: 256,
    layerCount: 1,
  };

  it('selects material by RTI type', () => {
    createRtiMaterial({
      ...base,
      rtiInfo: {
        ...stubInfo,
        type: 5,
        weights: { w1: [], b1: [], w2: [], b2: [], w3: [], b3: [] },
      } as RtiInfo,
    });
    expect(NeuralRtiMaterial).toHaveBeenCalled();

    createRtiMaterial({ ...base, rtiInfo: { ...stubInfo, type: 1, bias: [], scale: [] } });
    expect(HshShaderMaterial).toHaveBeenCalled();

    createRtiMaterial({ ...base, rtiInfo: { ...stubInfo, type: 2, bias: [], scale: [] } });
    expect(LrgbPtmMaterial).toHaveBeenCalled();

    createRtiMaterial({ ...base, rtiInfo: { ...stubInfo, type: 4 } });
    expect(ImageShaderMaterial).toHaveBeenCalledWith(base.textures[0], base.bounds, base.colorGain);
  });
});
