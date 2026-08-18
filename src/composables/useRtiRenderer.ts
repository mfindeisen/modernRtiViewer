import { ref, shallowRef } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { QuadtreeManager } from '../lib/QuadtreeManager';
import { computeFitToViewZoom, computeZoomLimits, viewportHasLayout } from '../lib/cameraFit.js';
import { parseViewHash } from '../lib/viewerUrl.js';
import { loadRtiInfo, normalizeTileFormat } from '../lib/rtiInfoLoader.js';
import { openTiffDataset } from '../lib/openTiffDataset.js';
import { createTextureCache } from '../lib/textureCache.js';
import { createMeshUniformSync } from '../lib/meshUniforms.js';
import { createTileMeshLoader } from '../lib/tileMeshLoader.js';
import { clampExportSize, pixelsToPngDataUrl, recordCanvasWebm } from '../lib/exportView.js';
import { createLineDrawingPass } from '../lib/lineDrawingPass.js';
import { FRONT_LIGHT } from '../lib/lightDirection.js';
import {
  PACKED_NORMAL_RENDER_MODE,
  RENDER_MODE_LINE_DRAWING,
  RENDER_MODE_NORMAL_BUFFER,
  supportsMeshExport,
} from '../lib/rtiEnhancements.js';
import {
  MAX_MESH_DIMENSION,
  buildSurfaceFromPackedNormals,
  pixelSizeFromCalibration,
  type MeshScale,
  type ReconstructedSurface,
} from '../lib/surfaceFromNormals.js';
import type { QuadtreeNode, RtiInfo, ParsedViewHash, WorldBox } from '../types/rti.js';
import type { TiffTileLoader } from '../lib/TiffTileLoader.js';
import type { UseRtiRendererOptions } from './types.js';

export function useRtiRenderer({
  containerWrapper,
  container,
  url,
  tileFormat,
  lightDir,
  renderMode,
  specularExponent,
  specularIntensity,
  diffuseGain,
  unsharpAmount,
  dualLinked,
  lightDir2,
  colorGainVector,
  ridgeThreshold,
  valleyThreshold,
  lineWidth,
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
  const pendingTileCount = ref(0);

  let animationFrameId: number | null = null;
  let renderLoopActive = false;
  let needsRender = true;
  let containerResizeObserver: ResizeObserver | null = null;
  const loadingTileIds = new Set<number>();
  const tileMeshes = new Map<number, THREE.Mesh<THREE.PlaneGeometry, THREE.Material>>();
  const textureLoader = new THREE.TextureLoader();
  const textureCache = createTextureCache();
  let contextLost = false;
  let glCanvas: HTMLCanvasElement | null = null;
  let tileCameraOverride: THREE.OrthographicCamera | null = null;
  let tileScreenHeightOverride: number | null = null;
  const lineDrawingPass = createLineDrawingPass();

  const meshUniforms = createMeshUniformSync({
    tileMeshes,
    lightDir,
    renderMode,
    specularExponent,
    colorGainVector,
    enhancements: (diffuseGain && unsharpAmount && specularIntensity && lightDir2 && dualLinked)
      ? { diffuseGain, unsharpAmount, specularIntensity, lightDir2, dualLinked }
      : undefined,
  });

    const {
      syncMeshUniforms,
      forEachMeshUniform,
      setRenderModeOnMeshes: setRenderModeOnMeshesBase,
      updateSpecularOnMeshes: updateSpecularOnMeshesBase,
      updateEnhancementsOnMeshes: updateEnhancementsOnMeshesBase,
      updateColorGainOnMeshes: updateColorGainOnMeshesBase,
      setReferenceLightOnMeshes,
      setNeutralColorGainOnMeshes,
      restoreLightOnMeshes,
    } = meshUniforms;

    function setRenderModeOnMeshes(mode: number) {
      setRenderModeOnMeshesBase(mode);
      requestRender();
    }

    function updateSpecularOnMeshes() {
      updateSpecularOnMeshesBase();
      requestRender();
    }

    function updateEnhancementsOnMeshes() {
      updateEnhancementsOnMeshesBase();
      requestRender();
    }

    function updateColorGainOnMeshes() {
      updateColorGainOnMeshesBase();
      requestRender();
    }

  let loadTileMesh: (node: QuadtreeNode, worldBox: WorldBox) => void = () => {};
  let disposeTileLoader = () => {};

  function handleContextLost(event: Event) {
    event.preventDefault();
    contextLost = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    renderLoopActive = false;
  }

  function clearGpuMeshes() {
    const currentScene = scene.value;
    for (const mesh of tileMeshes.values()) {
      currentScene?.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    tileMeshes.clear();
    loadingTileIds.clear();
    textureCache.dispose();
    activeMeshesCount.value = 0;
  }

  function handleContextRestored() {
    contextLost = false;
    clearGpuMeshes();
    if (renderer.value && containerWrapper.value && rtiInfo.value) {
      const width = containerWrapper.value.clientWidth;
      const height = containerWrapper.value.clientHeight;
      if (viewportHasLayout(width, height)) {
        renderer.value.setSize(width, height);
        renderer.value.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      }
    }
    requestRender();
  }

  async function fetchRtiInfo() {
    const info = await loadRtiInfo(url.value, {
      openTiff: async (tifUrl: string) => {
        const { loader, info } = await openTiffDataset(tifUrl);
        if (!info) throw new Error(`Failed to open TIFF: ${tifUrl}`);
        tiffLoader.value = loader;
        return info;
      },
    });
    if (!info.format && tileFormat?.value) {
      info.format = normalizeTileFormat(tileFormat.value);
    }
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
    const width = Math.max(1, wrapper.clientWidth);
    const height = Math.max(1, wrapper.clientHeight);

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
    newRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.value = newRenderer;
    mountContainer.appendChild(newRenderer.domElement);
    glCanvas = newRenderer.domElement;
    glCanvas.addEventListener('webglcontextlost', handleContextLost);
    glCanvas.addEventListener('webglcontextrestored', handleContextRestored);

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
    applyZoomLimits(newCamera, newControls, rti, width, height);

    ({ loadTileMesh, dispose: disposeTileLoader } = createTileMeshLoader({
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
      onTileReady: requestRender,
      debug,
    }));

    window.addEventListener('resize', resize);
    containerResizeObserver = new ResizeObserver(() => resize());
    containerResizeObserver.observe(wrapper);

    newControls.addEventListener('change', requestRender);
    requestRender();

    return urlView;
  }

  function requestRender() {
    needsRender = true;
    if (renderLoopActive) return;
    renderLoopActive = true;
    animationFrameId = requestAnimationFrame(tick);
  }

  function tick() {
    animationFrameId = null;
    if (contextLost) {
      renderLoopActive = false;
      return;
    }
    const currentControls = controls.value;
    const damping = currentControls ? currentControls.update() : false;
    pendingTileCount.value = loadingTileIds.size;
    const shouldDraw = needsRender || damping || loadingTileIds.size > 0;
    needsRender = false;

    if (shouldDraw && renderer.value && scene.value && camera.value) {
      updateTiles();
      onFrame?.();
      drawFrame(camera.value);
    }

    if (damping || loadingTileIds.size > 0 || needsRender) {
      animationFrameId = requestAnimationFrame(tick);
      return;
    }
    renderLoopActive = false;
  }

  function dispose() {
    window.removeEventListener('resize', resize);
    containerResizeObserver?.disconnect();
    containerResizeObserver = null;
    if (glCanvas) {
      glCanvas.removeEventListener('webglcontextlost', handleContextLost);
      glCanvas.removeEventListener('webglcontextrestored', handleContextRestored);
      glCanvas = null;
    }
    contextLost = false;
    disposeTileLoader();
    lineDrawingPass.dispose();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    renderLoopActive = false;
    needsRender = false;
    clearGpuMeshes();
    if (renderer.value) {
      renderer.value.dispose();
      renderer.value.domElement.parentNode?.removeChild(renderer.value.domElement);
    }
    if (controls.value) {
      controls.value.removeEventListener('change', requestRender);
      controls.value.dispose();
    }
    activeMeshesCount.value = 0;
    scene.value = null;
    camera.value = null;
    renderer.value = null;
    controls.value = null;
    quadtree.value = null;
    tiffLoader.value = null;
    rtiInfo.value = null;
  }

  function applyZoomLimits(
    cam = camera.value,
    orbit = controls.value,
    rti = rtiInfo.value,
    width = containerWrapper.value?.clientWidth ?? 0,
    height = containerWrapper.value?.clientHeight ?? 0,
  ) {
    if (!cam || !orbit || !rti) return;
    const { minZoom, maxZoom } = computeZoomLimits(width, height, rti.width, rti.height);
    orbit.minZoom = minZoom;
    orbit.maxZoom = maxZoom;
    const zoom = Number.isFinite(cam.zoom) ? cam.zoom : minZoom;
    cam.zoom = Math.min(maxZoom, Math.max(minZoom, zoom));
    cam.updateProjectionMatrix();
  }

  function resize() {
    if (!containerWrapper.value || !camera.value || !renderer.value || !rtiInfo.value) return;
    const width = containerWrapper.value.clientWidth;
    const height = containerWrapper.value.clientHeight;
    if (!viewportHasLayout(width, height)) return;
    const aspect = width / height;
    const viewSize = Math.max(rtiInfo.value.width, rtiInfo.value.height) / 2;

    camera.value.left = -viewSize * aspect;
    camera.value.right = viewSize * aspect;
    camera.value.top = viewSize;
    camera.value.bottom = -viewSize;
    applyZoomLimits(camera.value, controls.value, rtiInfo.value, width, height);

    renderer.value.setSize(width, height);
    onResize?.();
    requestRender();
  }

  function setControlsEnabled(enabled: boolean) {
    if (controls.value) controls.value.enabled = enabled;
  }

  function setControlMode(mode: import('./types.js').ViewerMode) {
    const c = controls.value;
    if (!c) return;
    c.enabled = true;
    c.enableZoom = true;
    c.enablePan = mode === 'pan';
  }

  function fitToView() {
    if (!camera.value || !controls.value || !rtiInfo.value || !containerWrapper.value) return;
    const width = containerWrapper.value.clientWidth;
    const height = containerWrapper.value.clientHeight;
    camera.value.position.set(0, 0, 10);
    camera.value.zoom = computeFitToViewZoom(width, height, rtiInfo.value.width, rtiInfo.value.height);
    controls.value.target.set(0, 0, 0);
    applyZoomLimits(camera.value, controls.value, rtiInfo.value, width, height);
    controls.value.update();
    requestRender();
  }

  function zoomBy(factor: number) {
    if (!camera.value || !controls.value) return;
    camera.value.zoom = Math.min(
      controls.value.maxZoom,
      Math.max(controls.value.minZoom, camera.value.zoom * factor),
    );
    camera.value.updateProjectionMatrix();
    requestRender();
  }

  function updateTiles() {
    if (!quadtree.value || !camera.value || !renderer.value || !scene.value) return;

    const cam = tileCameraOverride || camera.value;
    const currentScene = scene.value;
    const currentRenderer = renderer.value;
    if (!cam || !currentScene || !currentRenderer) return;
    const frustumBounds = {
      minX: cam.position.x + cam.left / cam.zoom,
      maxX: cam.position.x + cam.right / cam.zoom,
      minY: cam.position.y + cam.bottom / cam.zoom,
      maxY: cam.position.y + cam.top / cam.zoom,
    };

    const worldHeight = (cam.top - cam.bottom) / cam.zoom;
    const screenHeight = tileScreenHeightOverride ?? currentRenderer.domElement.clientHeight;
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

    for (const [id, mesh] of tileMeshes.entries()) {
      if (!visibleIds.has(id) && !loadingTileIds.has(id)) {
        currentScene.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material) {
          mesh.material.dispose();
        }
        tileMeshes.delete(id);
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
    pendingTileCount.value = loadingTileIds.size;
  }

  function lineDrawingParams() {
    return {
      ridgeThreshold: ridgeThreshold?.value ?? 0.14,
      valleyThreshold: valleyThreshold?.value ?? 0.1,
      lineWidth: lineWidth?.value ?? 1.5,
    };
  }

  function renderLineDrawing(
    cam: THREE.Camera,
    outputTarget: THREE.WebGLRenderTarget | null = null,
    size?: { width: number; height: number },
  ) {
    if (!renderer.value || !scene.value) return;
    const restoreMode = renderMode.value;
    lineDrawingPass.render(renderer.value, scene.value, cam, {
      ...lineDrawingParams(),
      setEncodeNormals: (enabled) => {
        setRenderModeOnMeshesBase(enabled ? RENDER_MODE_NORMAL_BUFFER : restoreMode);
      },
      outputTarget,
      width: size?.width,
      height: size?.height,
    });
  }

  function drawFrame(
    cam: THREE.Camera,
    options?: { lineDrawing?: boolean; skipLineDrawing?: boolean; outputTarget?: THREE.WebGLRenderTarget | null; width?: number; height?: number },
  ) {
    if (!renderer.value || !scene.value) return;
    const useDrawing = !options?.skipLineDrawing
      && (options?.lineDrawing || renderMode.value === RENDER_MODE_LINE_DRAWING);
    if (useDrawing) {
      renderLineDrawing(
        cam,
        options?.outputTarget ?? null,
        options?.width != null && options?.height != null
          ? { width: options.width, height: options.height }
          : undefined,
      );
      return;
    }
    renderer.value.setRenderTarget(options?.outputTarget ?? null);
    renderer.value.render(scene.value, cam);
    if (options?.outputTarget) renderer.value.setRenderTarget(null);
  }

  function renderFrame() {
    if (!renderer.value || !scene.value || !camera.value) return;
    drawFrame(camera.value);
  }

  function exportPng() {
    if (!renderer.value) return null;
    renderFrame();
    return renderer.value.domElement.toDataURL('image/png');
  }

  function readPixelAtScreen(clientX: number, clientY: number) {
    if (!renderer.value) return null;
    renderFrame();
    const pixel = new Uint8Array(4);
    const canvas = renderer.value.domElement;
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = renderer.value.getPixelRatio();
    const x = Math.floor((clientX - rect.left) * pixelRatio);
    const y = Math.floor((rect.bottom - clientY) * pixelRatio);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    const gl = renderer.value.getContext();
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    if (pixel[3] < 8) return null;
    return { r: pixel[0] / 255, g: pixel[1] / 255, b: pixel[2] / 255 };
  }

  async function waitForTiles(timeoutMs = 20000) {
    const started = Date.now();
    requestRender();
    while (Date.now() - started < timeoutMs) {
      pendingTileCount.value = loadingTileIds.size;
      if (loadingTileIds.size === 0) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (loadingTileIds.size === 0) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
      requestRender();
    }
  }

  async function captureFullResolutionPixels(options?: {
    maxDim?: number;
    renderMode?: number;
    light?: { x: number; y: number; z: number };
    neutralizeLook?: boolean;
    clearAlpha?: number;
    rawColor?: boolean;
    lineDrawing?: boolean;
  }) {
    if (!renderer.value || !scene.value || !camera.value || !rtiInfo.value) return null;
    const rti = rtiInfo.value;
    const { width, height } = clampExportSize(rti.width, rti.height, options?.maxDim);
    const viewSize = Math.max(rti.width, rti.height) / 2;
    const aspect = width / height;
    const exportCam = camera.value.clone();
    exportCam.left = -viewSize * aspect;
    exportCam.right = viewSize * aspect;
    exportCam.top = viewSize;
    exportCam.bottom = -viewSize;
    exportCam.position.set(0, 0, 10);
    exportCam.zoom = computeFitToViewZoom(width, height, rti.width, rti.height);
    exportCam.updateProjectionMatrix();

    tileCameraOverride = exportCam;
    tileScreenHeightOverride = height;
    updateTiles();
    await waitForTiles();
    updateTiles();

    const savedLight = lightDir.value.clone();
    const prevClear = new THREE.Color();
    renderer.value.getClearColor(prevClear);
    const prevAlpha = renderer.value.getClearAlpha();

    try {
      if (options?.renderMode !== undefined) setRenderModeOnMeshesBase(options.renderMode);
      if (options?.light) {
        restoreLightOnMeshes(new THREE.Vector3(options.light.x, options.light.y, options.light.z));
      }
      if (options?.neutralizeLook) {
        setNeutralColorGainOnMeshes();
        forEachMeshUniform((uniforms) => {
          if (uniforms.uDiffuseGain) uniforms.uDiffuseGain.value = 1;
          if (uniforms.uUnsharpAmount) uniforms.uUnsharpAmount.value = 0;
          if (uniforms.uSpecularIntensity) uniforms.uSpecularIntensity.value = 0;
        });
      }
      renderer.value.setClearColor(0x000000, options?.clearAlpha ?? 1);

      const target = new THREE.WebGLRenderTarget(width, height, options?.rawColor
        ? { colorSpace: THREE.NoColorSpace }
        : undefined);
      const useDrawing = !!options?.lineDrawing
        || (options?.renderMode === undefined && renderMode.value === RENDER_MODE_LINE_DRAWING);
      if (useDrawing) {
        drawFrame(exportCam, {
          lineDrawing: true,
          outputTarget: target,
          width,
          height,
        });
      } else {
        renderer.value.setRenderTarget(target);
        renderer.value.render(scene.value, exportCam);
      }
      const pixels = new Uint8Array(width * height * 4);
      renderer.value.readRenderTargetPixels(target, 0, 0, width, height, pixels);
      renderer.value.setRenderTarget(null);
      target.dispose();
      return { pixels, width, height };
    } finally {
      renderer.value.setClearColor(prevClear, prevAlpha);
      setRenderModeOnMeshesBase(renderMode.value);
      restoreLightOnMeshes(savedLight);
      updateColorGainOnMeshesBase();
      updateEnhancementsOnMeshesBase();
      tileCameraOverride = null;
      tileScreenHeightOverride = null;
      requestRender();
    }
  }

  async function exportFullResolution(options?: { lineDrawing?: boolean }) {
    const captured = await captureFullResolutionPixels({ lineDrawing: options?.lineDrawing });
    if (!captured) return null;
    return pixelsToPngDataUrl(captured.pixels, captured.width, captured.height, true);
  }

  async function reconstructSurface(scale?: MeshScale | null): Promise<ReconstructedSurface> {
    if (!supportsMeshExport(rtiInfo.value?.type)) {
      throw new Error('3D export needs PTM, HSH or Neural RTI data');
    }
    const normals = await captureFullResolutionPixels({
      maxDim: MAX_MESH_DIMENSION,
      renderMode: PACKED_NORMAL_RENDER_MODE,
      light: FRONT_LIGHT,
      neutralizeLook: true,
      clearAlpha: 0,
      rawColor: true,
    });
    if (!normals) throw new Error('Could not capture RTI normals');
    const color = await captureFullResolutionPixels({
      maxDim: MAX_MESH_DIMENSION,
      renderMode: 0,
      light: FRONT_LIGHT,
      neutralizeLook: true,
      clearAlpha: 0,
    });
    const meshScale = scale ?? pixelSizeFromCalibration(null);
    return buildSurfaceFromPackedNormals(
      normals.pixels,
      color?.pixels ?? null,
      normals.width,
      normals.height,
      meshScale,
    );
  }

  function recordOrbitVideo(durationMs: number, onTick: (elapsedMs: number) => void) {
    if (!renderer.value) return Promise.reject(new Error('Renderer not ready'));
    return recordCanvasWebm(renderer.value.domElement, durationMs, (elapsed) => {
      onTick(elapsed);
      renderFrame();
    });
  }

  function sampleColorAtScreen(clientX: number, clientY: number) {
    if (!renderer.value || !scene.value || !camera.value) return null;

    const savedLight = lightDir.value.clone();
    setReferenceLightOnMeshes();
    setNeutralColorGainOnMeshes();
    setRenderModeOnMeshes(0);

    const pixel = new Uint8Array(4);
    try {
      drawFrame(camera.value, { skipLineDrawing: true });

      const canvas = renderer.value.domElement;
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = renderer.value.getPixelRatio();
      const x = Math.floor((clientX - rect.left) * pixelRatio);
      const y = Math.floor((rect.bottom - clientY) * pixelRatio);

      const gl = renderer.value.getContext();
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    } finally {
      restoreLightOnMeshes(savedLight);
      setRenderModeOnMeshes(renderMode.value);
      updateColorGainOnMeshes();
    }

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
    if (urlView.specularExponent !== undefined) {
      specularExponent.value = urlView.specularExponent;
    }
    if (urlView.specularIntensity !== undefined && specularIntensity) {
      specularIntensity.value = urlView.specularIntensity;
    }
    if (urlView.diffuseGain !== undefined && diffuseGain) {
      diffuseGain.value = urlView.diffuseGain;
    }
    if (urlView.unsharpAmount !== undefined && unsharpAmount) {
      unsharpAmount.value = urlView.unsharpAmount;
    }
    if (urlView.dualLinked !== undefined && dualLinked) {
      dualLinked.value = urlView.dualLinked;
    }
    if (urlView.lightDir2 && lightDir2) {
      lightDir2.value.set(urlView.lightDir2.x, urlView.lightDir2.y, urlView.lightDir2.z).normalize();
    }
    if (urlView.colorGain) {
      colorGainVector.set(urlView.colorGain.r, urlView.colorGain.g, urlView.colorGain.b);
      requestRender();
      return urlView.colorGain;
    }
    requestRender();
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
    pendingTileCount,
    fetchRtiInfo,
    initQuadtree,
    init,
    dispose,
    resize,
    setControlsEnabled,
    setControlMode,
    setRenderModeOnMeshes,
    updateSpecularOnMeshes,
    updateEnhancementsOnMeshes,
    updateColorGainOnMeshes,
    setReferenceLightOnMeshes,
    setNeutralColorGainOnMeshes,
    restoreLightOnMeshes,
    renderFrame,
    exportPng,
    exportFullResolution,
    reconstructSurface,
    recordOrbitVideo,
    sampleColorAtScreen,
    readPixelAtScreen,
    applyUrlView,
    requestRender,
    fitToView,
    zoomBy,
  };
}
