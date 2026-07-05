import { describe, it, expect } from 'vitest';
import type * as THREE from 'three';
import type { QuadtreeManager } from '@/lib/QuadtreeManager.js';
import {
  getImageWorldBounds,
  worldToImageNorm,
  imageNormToWorld,
  worldToScreen,
  screenToWorld,
  imageNormRadiusToScreen,
} from '@/lib/annotationCoords.js';

const quadtree = {
  imgBox: { minX: 0.1, maxX: 0.9, minY: 0.2, maxY: 0.8 },
  maxSize: 1000,
} as unknown as QuadtreeManager;

const camera = {
  position: { x: 0, y: 0 },
  left: -500,
  right: 500,
  top: 400,
  bottom: -400,
  zoom: 2,
} as unknown as THREE.OrthographicCamera;

const domElement = { clientWidth: 800, clientHeight: 600 } as HTMLElement;

describe('getImageWorldBounds', () => {
  it('converts normalized imgBox to world extents', () => {
    const bounds = getImageWorldBounds(quadtree)!;

    expect(bounds.minX).toBe(-400);
    expect(bounds.maxX).toBe(400);
    expect(bounds.minY).toBe(-300);
    expect(bounds.maxY).toBeCloseTo(300);
    expect(bounds.width).toBe(800);
    expect(bounds.height).toBeCloseTo(600);
  });

  it('returns null without quadtree', () => {
    expect(getImageWorldBounds(null)).toBeNull();
  });
});

describe('world ↔ image norm', () => {
  it('round-trips coordinates within the image', () => {
    const norm = worldToImageNorm(0, 0, quadtree)!;
    expect(norm.x).toBeCloseTo(0.5);
    expect(norm.y).toBeCloseTo(0.5);

    const world = imageNormToWorld(0, 0, quadtree)!;
    expect(world).toEqual({ x: -400, y: -300 });

    const back = worldToImageNorm(world.x, world.y, quadtree)!;
    expect(back.x).toBeCloseTo(0);
    expect(back.y).toBeCloseTo(0);
  });
});

describe('world ↔ screen', () => {
  it('round-trips through the orthographic camera', () => {
    const screen = worldToScreen(100, 50, camera, domElement)!;
    expect(screen).not.toBeNull();

    const world = screenToWorld(screen.x, screen.y, camera, domElement)!;
    expect(world.x).toBeCloseTo(100);
    expect(world.y).toBeCloseTo(50);
  });

  it('flips Y so screen origin is top-left', () => {
    const top = worldToScreen(0, 200, camera, domElement)!;
    const bottom = worldToScreen(0, -200, camera, domElement)!;
    expect(top.y).toBeLessThan(bottom.y);
  });
});

describe('imageNormRadiusToScreen', () => {
  it('scales a normalized radius to screen pixels', () => {
    const radius = imageNormRadiusToScreen(0.1, quadtree, camera, domElement);
    expect(radius).toBeGreaterThan(0);
  });
});
