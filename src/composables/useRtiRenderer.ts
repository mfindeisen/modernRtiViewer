import { ref, shallowRef } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { QuadtreeManager } from '../lib/QuadtreeManager';
import { computeFitToViewZoom } from '../lib/cameraFit.js';
import { parseViewHash } from '../lib/viewerUrl.js';
import { loadRtiInfo } from '../lib/rtiInfoLoader.js';
import { openTiffDataset } from '../lib/openTiffDataset.js';
import { createTextureCache } from '../lib/textureCache.js';
import { createMeshUniformSync } from '../lib/meshUniforms.js';
import { createTileMeshLoader } from '../lib/tileMeshLoader.js';
import type { QuadtreeNode, RtiInfo, ParsedViewHash, WorldBox } from '../types/rti.js';
import type { TiffTileLoader } from '../lib/TiffTileLoader.js';
import type { UseRtiRendererOptions } from './types.js';

export function useRtiRenderer({
  containerWrapper,
  container,
  url,
  lightDir,
  renderMode,
  specularExponent,
  colorGainVector,
  getPanEnabled,
  onResize,
  onFrame,
  debug = false,
}: UseRtiRendererOptions) {
  const rtiInfo = ref<RtiInfo | null>(null);
  const scene = shallowRef<THREE.Scene | null>(null);
  const camera = shallowRef<THREE.OrthographicCamera | null>(null);
  const controls = shallowRef<OrbitControls | null>(null);
  const renderer = shallowRef<THREE.WebGLRenderer | null>(null);
  const quadtree = shallowRef<QuadtreeManager | null>(null);
  const tiffLoader = shallowRef<TiffTileLoader | null>(null);
  const activeMeshesCount = ref(0);

  let animationFrameId: number | null = null;
  let containerResizeObserver: ResizeObserver | null = null;
  const loadingTileIds = new Set<number>();
  const tileMeshes = new Map<number, THREE.Mesh<THREE.PlaneGeometry, THREE.Material>>();
  const textureLoader = new THREE.TextureLoader();
  const textureCache = createTextureCache();

  const meshUniforms = createMeshUniformSync({
    tileMeshes,
    lightDir,
    renderMode,
    specularExponent,
    colorGainVector,
  });

  const {
    syncMeshUniforms,
    setRenderModeOnMeshes,
    updateSpecularOnMeshes,
    updateColorGainOnMeshes,
    setReferenceLightOnMeshes,
    setNeutralColorGainOnMeshes,
    restoreLightOnMeshes,
  } = meshUniforms;

  let loadTileMesh: (node: QuadtreeNode, worldBox: WorldBox) => void = () => {};

  async function fetchRtiInfo() {
    const info = await loadRtiInfo(url.value, {
      openTiff: async (tifUrl: string) => {
        const { loader, info } = await openTiffDataset(tifUrl);
        if (!info) throw new Error(`Failed to open TIFF: ${tifUrl}`);
        tiffLoader.value = loader;
        return info;
      },
    });
    rtiInfo.value = info;
    return info;
  }

  function initQuadtree() {
    if (!rtiInfo.value) return;
    quadtree.value = new QuadtreeManager(
      rtiInfo.value.width,
      rtiInfo.value.height,
      rtiInfo.value.tileSize,
    );
  }

  function init(): ParsedViewHash {
    if (!containerWrapper.value || !container.value || !rtiInfo.value) {
      throw new Error('Cannot initialize renderer: missing container or RTI info');
    }

    const wrapper = containerWrapper.value;
    const mountContainer = container.value;
    const rti = rtiInfo.value;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;

    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color(0x0f172a);
    scene.value = newScene;

    const aspect = width / height;
    const viewSize = Math.max(rti.width, rti.height) / 2;

    const newCamera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      1000,
    );
    camera.value = newCamera;

    const urlView = parseViewHash(window.location.hash);
    const cx = urlView.camera?.cx;
    const cy = urlView.camera?.cy;
    const z = urlView.camera?.z;

    if (cx !== undefined && cy !== undefined && z !== undefined) {
      newCamera.position.set(cx, cy, 10);
      newCamera.zoom = z;
      newCamera.updateProjectionMatrix();
    } else {
      newCamera.position.set(0, 0, 10);
      newCamera.zoom = computeFitToViewZoom(width, height, rti.width, rti.height);
      newCamera.updateProjectionMatrix();
    }

    const newRenderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    newRenderer.setSize(width, height);
    newRenderer.setPixelRatio(window.devicePixelRatio);
    renderer.value = newRenderer;
    mountContainer.appendChild(newRenderer.domElement);

    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    controls.value = newControls;
    if (cx !== undefined && cy !== undefined) {
      newControls.target.set(cx, cy, 0);
    }
    newControls.enableRotate = false;
    newControls.screenSpacePanning = true;
    newControls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: null as unknown as THREE.MOUSE,
    };
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.enabled = getPanEnabled();

    ({ loadTileMesh } = createTileMeshLoader({
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
      getLightDir: () => lightDir.value,
      getColorGain: () => colorGainVector,
      debug,
    }));

    window.addEventListener('resize', resize);
    containerResizeObserver = new ResizeObserver(() => resize());
    containerResizeObserver.observe(wrapper);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      newControls.update();
      updateTiles();
      onFrame?.();
      newRenderer.render(newScene, newCamera);
    };
    animate();

    return urlView;
  }

  function dispose() {
    window.removeEventListener('resize', resize);
    containerResizeObserver?.disconnect();
    containerResizeObserver = null;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    if (renderer.value) {
      renderer.value.dispose();
      container.value?.removeChild(renderer.value.domElement);
    }
    if (controls.value) controls.value.dispose();
    textureCache.dispose();
    tileMeshes.clear();
    loadingTileIds.clear();
    activeMeshesCount.value = 0;
    scene.value = null;
    camera.value = null;
    renderer.value = null;
    controls.value = null;
    quadtree.value = null;
    tiffLoader.value = null;
    rtiInfo.value = null;
  }

  function resize() {
    if (!containerWrapper.value || !camera.value || !renderer.value || !rtiInfo.value) return;
    const width = containerWrapper.value.clientWidth;
    const height = containerWrapper.value.clientHeight;
    const aspect = width / height;
    const viewSize = Math.max(rtiInfo.value.width, rtiInfo.value.height) / 2;

    camera.value.left = -viewSize * aspect;
    camera.value.right = viewSize * aspect;
    camera.value.top = viewSize;
    camera.value.bottom = -viewSize;
    camera.value.updateProjectionMatrix();

    renderer.value.setSize(width, height);
    onResize?.();
  }

  function setControlsEnabled(enabled: boolean) {
    if (controls.value) controls.value.enabled = enabled;
  }

  function setControlMode(mode: import('./types.js').ViewerMode) {
    const c = controls.value;
    if (!c) return;
    if (mode === 'pan') {
      c.enabled = true;
      c.enablePan = true;
      c.enableZoom = true;
    } else if (mode === 'whitebalance') {
      c.enabled = true;
      c.enablePan = false;
      c.enableZoom = true;
    } else {
      c.enabled = false;
    }
  }

  function updateTiles() {
    if (!quadtree.value || !camera.value || !renderer.value || !scene.value) return;

    const cam = camera.value;
    const currentScene = scene.value;
    const currentRenderer = renderer.value;
    const frustumBounds = {
      minX: cam.position.x + cam.left / cam.zoom,
      maxX: cam.position.x + cam.right / cam.zoom,
      minY: cam.position.y + cam.bottom / cam.zoom,
      maxY: cam.position.y + cam.top / cam.zoom,
    };

    const worldHeight = (cam.top - cam.bottom) / cam.zoom;
    const screenHeight = currentRenderer.domElement.clientHeight;
    const pixelsPerWorldUnit = screenHeight / worldHeight;
    const projectedTileSize = quadtree.value.maxSize * pixelsPerWorldUnit;

    if (debug) {
      const currentZoom = camera.value.zoom.toFixed(2);
      if (!window._lastLoggedZoom || window._lastLoggedZoom !== currentZoom) {
        console.log(`[RTI Viewer] Zoom: ${currentZoom} | Projected Tile: ${projectedTileSize.toFixed(1)}px | Active Meshes: ${activeMeshesCount.value}`);
        window._lastLoggedZoom = currentZoom;
      }
    }

    const visibleNodes = quadtree.value.getVisibleNodes(frustumBounds, projectedTileSize);
    const visibleIds = new Set(visibleNodes.map((v) => v.node.id));

    if (debug) {
      const newlyVisible = visibleNodes.filter((n) => !tileMeshes.has(n.node.id));
      if (newlyVisible.length > 0) {
        const logInfo = newlyVisible.map((n) => `[ID:${n.node.id} L:${n.node.level}]`).join(', ');
        console.log(`[RTI Viewer] Loading ${newlyVisible.length} new tiles: ${logInfo}`);
      }
    }

    if (loadingTileIds.size === 0) {
      for (const [id, mesh] of tileMeshes.entries()) {
        if (!visibleIds.has(id)) {
          currentScene.remove(mesh);
          mesh.geometry.dispose();
          if (mesh.material) {
            mesh.material.dispose();
          }
          tileMeshes.delete(id);
        }
      }
    }

    for (const { node, worldBox } of visibleNodes) {
      if (!tileMeshes.has(node.id)) {
        loadTileMesh(node, worldBox);
      } else {
        syncMeshUniforms(tileMeshes.get(node.id));
      }
    }

    activeMeshesCount.value = tileMeshes.size;
  }

  function renderFrame() {
    if (!renderer.value || !scene.value || !camera.value) return;
    renderer.value.render(scene.value, camera.value);
  }

  function exportPng() {
    if (!renderer.value) return null;
    renderFrame();
    return renderer.value.domElement.toDataURL('image/png');
  }

  function sampleColorAtScreen(clientX: number, clientY: number) {
    if (!renderer.value || !scene.value || !camera.value) return null;

    const savedLight = lightDir.value.clone();
    setReferenceLightOnMeshes();
    setNeutralColorGainOnMeshes();
    renderFrame();

    const canvas = renderer.value.domElement;
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = renderer.value.getPixelRatio();
    const x = Math.floor((clientX - rect.left) * pixelRatio);
    const y = Math.floor((rect.bottom - clientY) * pixelRatio);

    const pixel = new Uint8Array(4);
    const gl = renderer.value.getContext();
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    restoreLightOnMeshes(savedLight);
    updateColorGainOnMeshes();

    const r = pixel[0] / 255;
    const g = pixel[1] / 255;
    const b = pixel[2] / 255;
    if (r + g + b < 0.03) return null;
    return { r, g, b };
  }

  function applyUrlView(urlView: ParsedViewHash) {
    if (urlView.lightDir) {
      lightDir.value.set(urlView.lightDir.x, urlView.lightDir.y, urlView.lightDir.z).normalize();
    }
    if (urlView.renderMode !== undefined) {
      renderMode.value = urlView.renderMode;
    }
    if (urlView.colorGain) {
      colorGainVector.set(urlView.colorGain.r, urlView.colorGain.g, urlView.colorGain.b);
      return urlView.colorGain;
    }
    return null;
  }

  return {
    rtiInfo,
    scene,
    camera,
    controls,
    renderer,
    quadtree,
    tiffLoader,
    activeMeshesCount,
    fetchRtiInfo,
    initQuadtree,
    init,
    dispose,
    resize,
    setControlsEnabled,
    setControlMode,
    setRenderModeOnMeshes,
    updateSpecularOnMeshes,
    updateColorGainOnMeshes,
    setReferenceLightOnMeshes,
    setNeutralColorGainOnMeshes,
    restoreLightOnMeshes,
    renderFrame,
    exportPng,
    sampleColorAtScreen,
    applyUrlView,
  };
}
