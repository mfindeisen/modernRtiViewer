import type { Ref, ShallowRef } from 'vue';
import * as THREE from 'three';
import { quadtreeToBounds, createRtiMaterial } from './rtiMaterialFactory.js';
import type { QuadtreeManager } from './QuadtreeManager.js';
import type { TiffTileLoader } from './TiffTileLoader.js';
import type { RtiInfo, QuadtreeNode, WorldBox } from '../types/rti.js';
import { createTextureCache } from './textureCache.js';

type TextureCache = ReturnType<typeof createTextureCache>;

interface CreateTileMeshLoaderOptions {
  scene: ShallowRef<THREE.Scene | null>;
  quadtree: ShallowRef<QuadtreeManager | null>;
  rtiInfo: Ref<RtiInfo | null>;
  url: Ref<string>;
  tiffLoader: ShallowRef<TiffTileLoader | null>;
  textureCache: TextureCache;
  textureLoader: THREE.TextureLoader;
  tileMeshes: Map<number, THREE.Mesh<THREE.PlaneGeometry, THREE.Material>>;
  loadingTileIds: Set<number>;
  syncMeshUniforms: (mesh: { material?: THREE.Material }) => void;
  getLightDir: () => THREE.Vector3;
  getColorGain: () => THREE.Vector3;
  debug?: boolean;
}

export function createTileMeshLoader({
  scene,
  quadtree,
  rtiInfo,
  url,
  tiffLoader,
  textureCache,
  textureLoader,
  tileMeshes,
  loadingTileIds,
  syncMeshUniforms,
  getLightDir,
  getColorGain,
  debug = false,
}: CreateTileMeshLoaderOptions) {
  function loadTileMesh(node: QuadtreeNode, worldBox: WorldBox) {
    if (!scene.value || !quadtree.value || !rtiInfo.value) return;

    const width = worldBox.maxX - worldBox.minX;
    const height = worldBox.maxY - worldBox.minY;
    const centerX = worldBox.minX + width / 2;
    const centerY = worldBox.minY + height / 2;

    loadingTileIds.add(node.id);
    const placeholderMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
    const mesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(
      new THREE.PlaneGeometry(width, height),
      placeholderMat,
    );
    mesh.position.set(centerX, centerY, node.level * 0.1);
    scene.value.add(mesh);
    tileMeshes.set(node.id, mesh);

    const applyTextures = (textures: THREE.Texture[]) => {
      if (!quadtree.value || !rtiInfo.value) return;
      const bounds = quadtreeToBounds(quadtree.value);
      const material = createRtiMaterial({
        rtiInfo: rtiInfo.value,
        textures,
        lightDir: getLightDir(),
        bounds,
        colorGain: getColorGain(),
      });

      syncMeshUniforms({ material });
      mesh.material = material;
      mesh.geometry = new THREE.PlaneGeometry(width, height);
      loadingTileIds.delete(node.id);
    };

    const cacheKey = `${url.value}_${node.id}`;
    const cachedTextures = textureCache.get(cacheKey);
    if (cachedTextures) {
      applyTextures(cachedTextures);
      return;
    }

    const cacheAndApplyTextures = (textures: THREE.Texture[]) => {
      textureCache.set(cacheKey, textures);
      applyTextures(textures);
    };

    if (tiffLoader.value) {
      tiffLoader.value.loadTileTextures(node, quadtree.value.nLevels, rtiInfo.value.tileSize)
        .then((textures) => {
          if (!textures || textures.length === 0) {
            loadingTileIds.delete(node.id);
            return;
          }
          cacheAndApplyTextures(textures);
        })
        .catch((err: unknown) => {
          console.error(`[TiffTileLoader] Error loading tile for node ${node.id}:`, err);
          loadingTileIds.delete(node.id);
        });
      return;
    }

    const textures: THREE.Texture[] = [];
    let loadedCount = 0;
    const layerCount = rtiInfo.value.layerCount;
    for (let l = 0; l < layerCount; l++) {
      const tileUrl = `${url.value}/${node.id}_${l + 1}.jpg`;
      if (debug) console.log(`[RTI Viewer] Requesting image: ${tileUrl}`);
      textureLoader.load(tileUrl, (tex: THREE.Texture) => {
        textures[l] = tex;
        tex.colorSpace = THREE.NoColorSpace;
        loadedCount++;
        if (loadedCount === layerCount) {
          cacheAndApplyTextures(textures);
        }
      }, undefined, (err: unknown) => {
        console.error(`Error loading tile ${node.id}_${l + 1}:`, err);
        loadingTileIds.delete(node.id);
      });
    }
  }

  return { loadTileMesh };
}
