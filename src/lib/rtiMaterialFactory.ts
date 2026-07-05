import * as THREE from 'three';
import { HshShaderMaterial, LrgbPtmMaterial, NeuralRtiMaterial } from './RtiShaders.js';
import { ImageShaderMaterial } from './ImageShaderMaterial.js';
import type { QuadtreeManager } from './QuadtreeManager.js';
import type { RtiInfo } from '../types/rti.js';

export function quadtreeToBounds(quadtree: QuadtreeManager) {
  const boundsMinX = (quadtree.imgBox.minX - 0.5) * quadtree.maxSize;
  const boundsMaxX = (quadtree.imgBox.maxX - 0.5) * quadtree.maxSize;
  const boundsMinY = (quadtree.imgBox.minY - 0.5) * quadtree.maxSize;
  const boundsMaxY = (quadtree.imgBox.maxY - 0.5) * quadtree.maxSize;
  return new THREE.Vector4(boundsMinX, boundsMaxX, boundsMinY, boundsMaxY);
}

interface CreateRtiMaterialOptions {
  rtiInfo: RtiInfo;
  textures: THREE.Texture[];
  lightDir: THREE.Vector3;
  bounds: THREE.Vector4;
  colorGain: THREE.Vector3;
}

export function createRtiMaterial({ rtiInfo, textures, lightDir, bounds, colorGain }: CreateRtiMaterialOptions) {
  if (rtiInfo.type === 5 && rtiInfo.weights) {
    return NeuralRtiMaterial(textures, lightDir, rtiInfo.weights, bounds, colorGain);
  }
  if (rtiInfo.type === 1) {
    return HshShaderMaterial(textures, lightDir, rtiInfo.bias ?? [], rtiInfo.scale ?? [], bounds, colorGain);
  }
  if (rtiInfo.type === 2) {
    return LrgbPtmMaterial(textures, lightDir, rtiInfo.bias ?? [], rtiInfo.scale ?? [], bounds, colorGain);
  }
  return ImageShaderMaterial(textures[0], bounds, colorGain);
}
