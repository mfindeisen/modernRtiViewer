import * as THREE from 'three';
import type { SurfaceMesh } from './surfaceFromNormals.js';

export function vertexColorsToFloats(colors: Uint8Array) {
  const rgb = new Float32Array(colors.length);
  for (let i = 0; i < colors.length; i++) rgb[i] = colors[i] / 255;
  return rgb;
}

export function surfaceMeshRadius(mesh: SurfaceMesh) {
  let maxSq = 0;
  const { positions, vertexCount } = mesh;
  for (let i = 0; i < vertexCount; i++) {
    const o = i * 3;
    const sq = positions[o] * positions[o]
      + positions[o + 1] * positions[o + 1]
      + positions[o + 2] * positions[o + 2];
    if (sq > maxSq) maxSq = sq;
  }
  return Math.sqrt(maxSq) || 1;
}

export function createSurfaceGeometry(mesh: SurfaceMesh) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(vertexColorsToFloats(mesh.colors), 3));
  geometry.setIndex(new THREE.Uint32BufferAttribute(mesh.indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Map an RTI hemisphere light (image-right, image-up, toward camera)
 * into world space for the preview mesh (rotated -90° around X, Y-up).
 */
export function rtiLightToPreviewWorld(
  light: { x: number; y: number; z: number },
  distance = 1,
) {
  const len = Math.hypot(light.x, light.y, light.z) || 1;
  return {
    x: (light.x / len) * distance,
    y: (light.z / len) * distance,
    z: (light.y / len) * distance,
  };
}

export function frameSurfaceCamera(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  radius: number,
) {
  const dist = Math.max(radius * 2.2, 1);
  camera.position.set(radius * 0.4, dist * 0.85, dist * 0.75);
  camera.near = Math.max(dist / 200, 0.001);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  target.set(0, 0, 0);
  camera.lookAt(target);
}
