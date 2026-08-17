import type * as THREE from 'three';

export const DEFAULT_TEXTURE_CACHE_SIZE = 100;

export type TextureCacheSetOptions = {
  /** Cache keys whose GPU textures must not be disposed (still on screen). */
  retain?: Iterable<string>;
};

export function createTextureCache(maxSize = DEFAULT_TEXTURE_CACHE_SIZE) {
  const cache = new Map<string, THREE.Texture[]>();

  function get(key: string) {
    if (!cache.has(key)) return null;
    const textures = cache.get(key)!;
    cache.delete(key);
    cache.set(key, textures);
    return textures;
  }

  function set(key: string, textures: THREE.Texture[], options?: TextureCacheSetOptions) {
    cache.set(key, textures);
    const retain = new Set(options?.retain);
    retain.add(key);

    while (cache.size > maxSize) {
      let evicted = false;
      for (const oldestKey of cache.keys()) {
        if (retain.has(oldestKey)) continue;
        const oldestTextures = cache.get(oldestKey);
        if (oldestTextures) oldestTextures.forEach((tex) => tex.dispose?.());
        cache.delete(oldestKey);
        evicted = true;
        break;
      }
      if (!evicted) break;
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
