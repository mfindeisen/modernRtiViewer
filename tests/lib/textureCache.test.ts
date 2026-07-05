import { describe, it, expect, vi } from 'vitest';
import type * as THREE from 'three';
import { createTextureCache } from '@/lib/textureCache.js';
import { mockTexture } from '../testUtils.js';

describe('createTextureCache', () => {
  it('returns cached textures and refreshes LRU order', () => {
    const cache = createTextureCache(2);
    const a = [mockTexture()];
    const b = [mockTexture()];

    cache.set('a', a);
    cache.set('b', b);
    expect(cache.get('a')).toBe(a);
    cache.set('c', [mockTexture()]);

    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toBe(a);
    expect(cache.size()).toBe(2);
  });

  it('disposes textures on eviction and clear', () => {
    const dispose = vi.fn();
    const cache = createTextureCache(1);
    cache.set('old', [mockTexture(dispose)]);
    cache.set('new', [mockTexture()]);

    expect(dispose).toHaveBeenCalledTimes(1);

    const dispose2 = vi.fn();
    cache.set('x', [mockTexture(dispose2)]);
    cache.dispose();
    expect(dispose2).toHaveBeenCalledTimes(1);
    expect(cache.size()).toBe(0);
  });
});
