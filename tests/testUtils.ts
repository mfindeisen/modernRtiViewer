import { vi } from 'vitest';
import type * as THREE from 'three';

/** Minimal THREE.Vector3 stand-in for composable tests. */
export function mockVector3(x = 1, y = 1, z = 1): THREE.Vector3 {
  const vector = {
    x,
    y,
    z,
    set(rx: number, ry: number, rz: number) {
      this.x = rx;
      this.y = ry;
      this.z = rz;
      return this;
    },
    copy() {
      return this;
    },
    clone() {
      return mockVector3(this.x, this.y, this.z);
    },
    normalize() {
      return this;
    },
  };
  return vector as unknown as THREE.Vector3;
}

/** Texture mock with optional dispose spy for cache tests. */
export function mockTexture(dispose = vi.fn()): THREE.Texture {
  return { dispose } as unknown as THREE.Texture;
}

export function mockPointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    pointerId: 1,
    ...overrides,
  } as PointerEvent;
}
