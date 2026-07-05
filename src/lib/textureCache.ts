import type * as THREE from 'three';

export const DEFAULT_TEXTURE_CACHE_SIZE = 100;

export function createTextureCache(maxSize = DEFAULT_TEXTURE_CACHE_SIZE) {
  const cache = new Map<string, THREE.Texture[]>();

  function get(key: string) {
    if (!cache.has(key)) return null;
    const textures = cache.get(key)!;
    cache.delete(key);
    cache.set(key, textures);
    return textures;
  }

  function set(key: string, textures: THREE.Texture[]) {
    cache.set(key, textures);
    while (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) break;
      const oldestTextures = cache.get(oldestKey);
      if (oldestTextures) oldestTextures.forEach((tex) => tex.dispose?.());
      cache.delete(oldestKey);
    }
  }

  function dispose() {
    for (const textures of cache.values()) {
      textures.forEach((tex) => tex.dispose?.());
    }
    cache.clear();
  }

  return { get, set, dispose, size: () => cache.size };
}
