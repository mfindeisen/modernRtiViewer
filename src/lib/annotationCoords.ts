/** World ↔ normalized image coordinates (0–1 within valid imgBox). */

import type * as THREE from 'three';
import type { QuadtreeManager } from './QuadtreeManager.js';

export function getImageWorldBounds(quadtree: QuadtreeManager | null) {
  if (!quadtree) return null;
  const { imgBox, maxSize } = quadtree;
  return {
    minX: (imgBox.minX - 0.5) * maxSize,
    maxX: (imgBox.maxX - 0.5) * maxSize,
    minY: (imgBox.minY - 0.5) * maxSize,
    maxY: (imgBox.maxY - 0.5) * maxSize,
    width: (imgBox.maxX - imgBox.minX) * maxSize,
    height: (imgBox.maxY - imgBox.minY) * maxSize,
  };
}

export function worldToImageNorm(wx: number, wy: number, quadtree: QuadtreeManager) {
  const b = getImageWorldBounds(quadtree);
  if (!b || b.width <= 0 || b.height <= 0) return null;
  return {
    x: (wx - b.minX) / b.width,
    y: (wy - b.minY) / b.height,
  };
}

export function imageNormToWorld(nx: number, ny: number, quadtree: QuadtreeManager) {
  const b = getImageWorldBounds(quadtree);
  if (!b) return null;
  return {
    x: b.minX + nx * b.width,
    y: b.minY + ny * b.height,
  };
}

export function worldToScreen(
  wx: number,
  wy: number,
  camera: THREE.OrthographicCamera,
  domElement: HTMLElement,
) {
  if (!camera || !domElement) return null;
  const w = domElement.clientWidth;
  const h = domElement.clientHeight;
  const worldW = (camera.right - camera.left) / camera.zoom;
  const worldH = (camera.top - camera.bottom) / camera.zoom;
  const originX = camera.position.x + camera.left / camera.zoom;
  const originY = camera.position.y + camera.bottom / camera.zoom;
  return {
    x: ((wx - originX) / worldW) * w,
    y: h - ((wy - originY) / worldH) * h,
  };
}

export function screenToWorld(
  sx: number,
  sy: number,
  camera: THREE.OrthographicCamera,
  domElement: HTMLElement,
) {
  if (!camera || !domElement) return null;
  const w = domElement.clientWidth;
  const h = domElement.clientHeight;
  const worldW = (camera.right - camera.left) / camera.zoom;
  const worldH = (camera.top - camera.bottom) / camera.zoom;
  const originX = camera.position.x + camera.left / camera.zoom;
  const originY = camera.position.y + camera.bottom / camera.zoom;
  return {
    x: originX + (sx / w) * worldW,
    y: originY + ((h - sy) / h) * worldH,
  };
}

export function imageNormRadiusToScreen(
  radiusNorm: number,
  quadtree: QuadtreeManager,
  camera: THREE.OrthographicCamera,
  domElement: HTMLElement,
) {
  const center = imageNormToWorld(0.5, 0.5, quadtree);
  const edge = imageNormToWorld(0.5 + radiusNorm, 0.5, quadtree);
  if (!center || !edge) return 0;
  const cScreen = worldToScreen(center.x, center.y, camera, domElement);
  const eScreen = worldToScreen(edge.x, edge.y, camera, domElement);
  if (!cScreen || !eScreen) return 0;
  return Math.abs(eScreen.x - cScreen.x);
}
