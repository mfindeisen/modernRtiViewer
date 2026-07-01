<template>
  <div ref="rootWrapper" class="flex flex-row w-full h-full min-h-[600px] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
    
    <!-- Sidebar Toolbar (Outside the image) -->
    <div class="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 relative z-50 shrink-0">
      
      <!-- Interaction Modes -->
      <button @click="setMode('pan')" :class="['group relative p-3 rounded-xl transition-all mb-2', currentMode === 'pan' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
        <HandIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Pan & Zoom</span>
          <span class="text-white/60">Navigate the image</span>
        </div>
      </button>
      <button @click="setMode('light')" :class="['group relative p-3 rounded-xl transition-all', currentMode === 'light' ? 'bg-yellow-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
        <LightbulbIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Light Direction</span>
          <span class="text-white/60">Move the light source</span>
        </div>
      </button>

      <div class="w-8 h-px bg-slate-700 my-4"></div>

      <!-- Render Modes -->
      <button @click="setRenderMode(0)" :class="['group relative p-3 rounded-xl transition-all mb-2', renderMode === 0 ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
        <ImageIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Default Mode</span>
          <span class="text-white/60">Standard diffuse rendering</span>
        </div>
      </button>
      <button @click="setRenderMode(1)" :class="['group relative p-3 rounded-xl transition-all mb-2', renderMode === 1 ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
        <SparklesIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Glossy Mode</span>
          <span class="text-white/60">Enhance surface scratches</span>
        </div>
      </button>
      <button @click="setRenderMode(2)" :class="['group relative p-3 rounded-xl transition-all mb-2', renderMode === 2 ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
        <LayersIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Normals Mode</span>
          <span class="text-white/60">View structural geometry</span>
        </div>
      </button>
      <button @click="setRenderMode(3)" :class="['group relative p-3 rounded-xl transition-all mb-2', renderMode === 3 ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
        <MapIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Slope Heatmap</span>
          <span class="text-white/60">Visualize surface steepness</span>
        </div>
      </button>
      <button @click="setRenderMode(4)" :class="['group relative p-3 rounded-xl transition-all', renderMode === 4 ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
        <SunIcon class="w-5 h-5" />
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Dual Light</span>
          <span class="text-white/60">Red & Blue opposing lights</span>
        </div>
      </button>

      <!-- Glossy Slider -->
      <div v-if="renderMode === 1" class="group relative mt-4 flex flex-col items-center w-full px-2">
        <input type="range" min="2" max="50" v-model.number="specularExponent" @input="updateSpecular" class="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500" style="writing-mode: bt-lr; transform: rotate(270deg); width: 60px; margin-top: 30px; margin-bottom: 30px;">
        <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
          <span class="text-white font-bold mb-0.5">Specular Intensity</span>
          <span class="text-white/60">Adjust surface wetness</span>
        </div>
      </div>

      <div class="mt-auto flex flex-col items-center w-full">
        <div class="w-8 h-px bg-slate-700 my-4"></div>
        <!-- Fullscreen -->
        <button @click="toggleFullscreen" class="group relative p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
          <component :is="isFullscreen ? MinimizeIcon : MaximizeIcon" class="w-5 h-5" />
          <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
            <span class="text-white font-bold mb-0.5">{{ isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen' }}</span>
            <span class="text-white/60">Maximize workspace</span>
          </div>
        </button>
        <!-- Export & Share -->
        <button @click="exportImage" class="group relative p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
          <DownloadIcon class="w-5 h-5" />
          <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
            <span class="text-white font-bold mb-0.5">Download Render</span>
            <span class="text-white/60">Save current view as PNG</span>
          </div>
        </button>
        <button @click="copyLink" class="group relative p-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all mb-2">
          <LinkIcon class="w-5 h-5" />
          <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
            <span class="text-white font-bold mb-0.5">Copy Link</span>
            <span class="text-white/60">Share view with exact angles</span>
          </div>
        </button>
        <button @click="showInfo = !showInfo" :class="['group relative p-3 rounded-xl transition-all', showInfo ? 'bg-white/20 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white']">
          <InfoIcon class="w-5 h-5" />
          <div class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 pointer-events-none z-50 shadow-2xl flex flex-col items-start text-left">
            <span class="text-white font-bold mb-0.5">About</span>
            <span class="text-white/60">Project credits</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Info Modal -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showInfo" class="absolute inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showInfo = false"></div>
        
        <!-- Modal Content -->
        <div class="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full text-slate-300">
          <button @click="showInfo = false" class="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div class="flex items-center space-x-3 mb-6">
            <h2 class="text-2xl font-bold text-white">About RTI Viewer</h2>
            <span class="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">v1.0.0</span>
          </div>
          
          <div class="space-y-4 mb-8">
            <div>
              <h3 class="text-white font-semibold mb-1">Technology</h3>
              <p class="text-sm text-slate-400">Powered by Vue 3 and Three.js. This viewer utilizes custom WebGL shaders to reconstruct reflectance fields (PTM/HSH) in real-time directly on the GPU.</p>
            </div>
            
            <div>
              <h3 class="text-white font-semibold mb-1">Performance</h3>
              <p class="text-sm text-slate-400">Large RTI datasets are seamlessly loaded using an intelligent Frustum-Culling Quadtree, ensuring only visible tiles are kept in VRAM.</p>
            </div>
          </div>
          
          <div class="pt-6 border-t border-slate-700 text-center">
            <div class="text-sm font-medium tracking-wide">
              built with <span class="text-red-500/90 text-[16px] mx-1">❤️</span> by <a href="https://github.com/mfindeisen" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors">Matthias Findeisen</a>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Share Modal -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showShareModal" class="absolute inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showShareModal = false"></div>
        
        <!-- Modal Content -->
        <div class="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-slate-300">
          <button @click="showShareModal = false" class="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <h2 class="text-2xl font-bold text-white mb-2">Share this View</h2>
          <p class="text-sm text-slate-400 mb-6">This link contains the exact camera angle, zoom level, and light direction you are currently viewing.</p>
          
          <div class="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl p-2">
            <input 
              type="text" 
              readonly 
              :value="generatedShareLink" 
              class="flex-1 bg-transparent text-white px-3 py-2 outline-none text-sm font-mono selection:bg-blue-500/30"
              @focus="$event.target.select()"
            />
            <button 
              @click="executeCopyLink" 
              :class="['px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2', isCopied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-600 hover:bg-blue-500 text-white']"
            >
              <component :is="isCopied ? CheckIcon : CopyIcon" class="w-4 h-4" />
              <span>{{ isCopied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- WebGL Canvas Container -->
    <div class="flex-1 relative overflow-hidden" ref="containerWrapper">
      <div ref="container" class="absolute inset-0"></div>
      
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-white font-medium">Loading RTI Data...</p>
      </div>

    <!-- Light Widget Compass -->
    <div 
      ref="compassRef"
      class="absolute bottom-6 left-6 w-24 h-24 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center z-20 shadow-xl overflow-hidden cursor-crosshair touch-none"
    >
      <div class="absolute inset-0 rounded-full border-2 border-white/5 m-2 pointer-events-none"></div>
      <div class="absolute w-full h-px bg-white/10 pointer-events-none"></div>
      <div class="absolute h-full w-px bg-white/10 pointer-events-none"></div>
      <div 
        class="absolute top-1/2 left-1/2 -mt-1.5 -ml-1.5 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)] transition-transform duration-75 pointer-events-none"
        :style="{ transform: `translate(${lightDir.x * (40 / 0.95)}px, ${-lightDir.y * (40 / 0.95)}px)` }"
      ></div>
    </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Hand as HandIcon, Lightbulb as LightbulbIcon, Download as DownloadIcon, Link as LinkIcon, Image as ImageIcon, Sparkles as SparklesIcon, Layers as LayersIcon, Info as InfoIcon, Maximize as MaximizeIcon, Minimize as MinimizeIcon, Copy as CopyIcon, Check as CheckIcon, Map as MapIcon, Sun as SunIcon } from '@lucide/vue';
import { QuadtreeManager } from '../lib/QuadtreeManager';
import { HshShaderMaterial, LrgbPtmMaterial } from '../lib/RtiShaders';

const props = defineProps({
  url: {
    type: String,
    required: true,
    default: '/mock'
  },
  shareUrl: {
    type: String,
    required: false,
    default: ''
  },
  debug: {
    type: String,
    required: false,
    default: 'false'
  }
});

const rootWrapper = ref(null);
const containerWrapper = ref(null);
const container = ref(null);
const compassRef = ref(null);
const loading = ref(true);
const error = ref('');
const showInfo = ref(false);
const showShareModal = ref(false);
const generatedShareLink = ref('');
const isCopied = ref(false);
const isFullscreen = ref(false);
const activeMeshesCount = ref(0);
const currentMode = ref('pan');
const renderMode = ref(0);
const specularExponent = ref(10.0);

const rtiInfo = ref(null);
const lightDir = ref(new THREE.Vector3(0, 0, 1));

const scene = shallowRef(null);
const camera = shallowRef(null);
const controls = shallowRef(null);
const renderer = shallowRef(null);
let animationFrameId = null;
const isDebug = true;
const quadtree = shallowRef(null);
const loadingTileIds = new Set(); // Track tiles currently being loaded
const tileMeshes = new Map(); // node.id -> THREE.Mesh
const textureLoader = new THREE.TextureLoader();

onMounted(async () => {
  try {
    parseUrlParams();
    await fetchRtiInfo();
    quadtree.value = new QuadtreeManager(rtiInfo.value.width, rtiInfo.value.height, rtiInfo.value.tileSize);
    initThreeJs();
    setupInteraction();
    loading.value = false;
  } catch (err) {
    error.value = err.message;
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (renderer.value) {
    renderer.value.dispose();
    container.value.removeChild(renderer.value.domElement);
  }
  if (controls.value) controls.value.dispose();
});

const fetchRtiInfo = async () => {
  const response = await fetch(`${props.url}/info.xml`);
  if (!response.ok) throw new Error(`Could not fetch info.xml from ${props.url}`);
  const xmlText = await response.text();
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  const getValue = (tag) => {
    const el = xmlDoc.getElementsByTagName(tag)[0];
    return el ? el.textContent : null;
  };

  // Support both new <rti> format and old <MultiRes> format
  const contentEl = xmlDoc.getElementsByTagName('Content')[0];
  const sizeEl = xmlDoc.getElementsByTagName('Size')[0];
  
  if (contentEl && sizeEl) {
    // Old Format (e.g. LRGB_PTM)
    const contentType = contentEl.getAttribute('type');
    const typeMap = { 'HSH': 1, 'HSH_RTI': 1, 'LRGB_PTM': 2, 'RGB_PTM': 3, 'IMAGE': 4 };
    
    // Attempt to extract tile size from <Tree> block (usually 2nd line)
    const treeEl = xmlDoc.getElementsByTagName('Tree')[0];
    let tileSize = 256;
    if (treeEl) {
      const treeLines = treeEl.textContent.trim().split('\n');
      if (treeLines.length > 1) tileSize = parseInt(treeLines[1]);
    }

    // Extract Bias and Scale vectors for PTM materials
    const biasEl = xmlDoc.getElementsByTagName('Bias')[0];
    const scaleEl = xmlDoc.getElementsByTagName('Scale')[0];
    const bias = biasEl ? biasEl.textContent.trim().split(/\s+/).map(parseFloat) : [];
    const scale = scaleEl ? scaleEl.textContent.trim().split(/\s+/).map(parseFloat) : [];

    const ordlen = parseInt(sizeEl.getAttribute('coefficients')) || 3;
    const parsedType = typeMap[contentType] || 2;
    let numLayers = ordlen;
    if (parsedType === 2) numLayers = 3; // LRGB_PTM always has 3 layers

    rtiInfo.value = {
      type: parsedType,
      width: parseInt(sizeEl.getAttribute('width')),
      height: parseInt(sizeEl.getAttribute('height')),
      tileSize: tileSize,
      layerCount: numLayers,
      bias: bias,
      scale: scale
    };
  } else {
    // New Format
    rtiInfo.value = {
      type: parseInt(getValue('type')), 
      width: parseInt(getValue('width')),
      height: parseInt(getValue('height')),
      tileSize: parseInt(getValue('tileSize')),
      layerCount: parseInt(getValue('layerCount')) || 1
    };
  }
  
  console.log("Parsed RTI Info:", rtiInfo.value);
};

const initThreeJs = () => {
  const width = containerWrapper.value.clientWidth;
  const height = containerWrapper.value.clientHeight;

  scene.value = new THREE.Scene();
  scene.value.background = new THREE.Color(0x0f172a);

  const aspect = width / height;
  const viewSize = Math.max(rtiInfo.value.width, rtiInfo.value.height) / 2;
  
  // Set camera to look at the center of the padded maxSize quadtree
  camera.value = new THREE.OrthographicCamera(
    -viewSize * aspect, viewSize * aspect,
    viewSize, -viewSize,
    0.1, 1000
  );
  // Restore from URL if available
  const urlParams = new URLSearchParams(window.location.hash.slice(1));
  const cx = parseFloat(urlParams.get('cx'));
  const cy = parseFloat(urlParams.get('cy'));
  const z = parseFloat(urlParams.get('z'));
  const lx = parseFloat(urlParams.get('lx'));
  const ly = parseFloat(urlParams.get('ly'));
  const mode = parseInt(urlParams.get('mode'));
  
  if (!isNaN(cx) && !isNaN(cy) && !isNaN(z)) {
    camera.value.position.set(cx, cy, 10);
    camera.value.zoom = z;
    camera.value.updateProjectionMatrix();
  } else {
    camera.value.position.set(0, 0, 10);
  }

  if (!isNaN(lx) && !isNaN(ly)) {
    const nz = Math.sqrt(Math.max(0, 1.0 - (lx * lx + ly * ly)));
    lightDir.value.set(lx, ly, nz).normalize();
  }
  if (!isNaN(mode)) {
    renderMode.value = mode;
  }

  renderer.value = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.value.setSize(width, height);
  renderer.value.setPixelRatio(window.devicePixelRatio);
  container.value.appendChild(renderer.value.domElement);

  controls.value = new OrbitControls(camera.value, renderer.value.domElement);
  if (!isNaN(cx) && !isNaN(cy)) {
    controls.value.target.set(cx, cy, 0);
  }
  controls.value.enableRotate = false;
  controls.value.screenSpacePanning = true;
  controls.value.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.NONE
  };
  controls.value.enableDamping = true;
  controls.value.dampingFactor = 0.05;
  controls.value.enabled = (currentMode.value === 'pan');

  window.addEventListener('resize', onWindowResize);

  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    controls.value.update();
    updateTiles();
    renderer.value.render(scene.value, camera.value);
  };
  animate();
};

const updateTiles = () => {
  if (!quadtree.value || !camera.value) return;

  // 1. Calculate Frustum in world space
  const cam = camera.value;
  const frustumBounds = {
    minX: cam.position.x + cam.left / cam.zoom,
    maxX: cam.position.x + cam.right / cam.zoom,
    minY: cam.position.y + cam.bottom / cam.zoom,
    maxY: cam.position.y + cam.top / cam.zoom
  };

  // 2. Calculate projected tile size
  // The root tile size in world units is quadtree.maxSize.
  // We need to find how many pixels the root tile takes up on screen.
  const worldHeight = (cam.top - cam.bottom) / cam.zoom;
  const screenHeight = renderer.value.domElement.clientHeight;
  const pixelsPerWorldUnit = screenHeight / worldHeight;
  const projectedTileSize = quadtree.value.maxSize * pixelsPerWorldUnit;
  
  if (!window._debugLoggedOnce) {
    console.log('[RTI Viewer] isDebug evaluated to:', isDebug, 'from props.debug:', props.debug);
    window._debugLoggedOnce = true;
  }
  
  if (isDebug) {
    const currentZoom = camera.value.zoom.toFixed(2);
    if (!window._lastLoggedZoom || window._lastLoggedZoom !== currentZoom) {
      console.log(`[RTI Viewer] Zoom: ${currentZoom} | Projected Tile: ${projectedTileSize.toFixed(1)}px | Active Meshes: ${activeMeshesCount.value}`);
      window._lastLoggedZoom = currentZoom;
    }
  }

  // 3. Get visible nodes
  const visibleNodes = quadtree.value.getVisibleNodes(frustumBounds, projectedTileSize);
  const visibleIds = new Set(visibleNodes.map(v => v.node.id));

  // 4. Get newly visible nodes that aren't loaded yet
  const newlyVisible = visibleNodes.filter(n => !tileMeshes.has(n.node.id));
  
  if (isDebug && newlyVisible.length > 0) {
    const logInfo = newlyVisible.map(n => `[ID:${n.node.id} L:${n.node.level}]`).join(', ');
    console.log(`[RTI Viewer] Loading ${newlyVisible.length} new tiles: ${logInfo}`);
  }

  // 5. Remove meshes that are no longer visible, BUT ONLY if we aren't currently loading new tiles.
  // This prevents the screen from turning black while zooming in and waiting for high-res tiles.
  if (loadingTileIds.size === 0) {
    for (const [id, mesh] of tileMeshes.entries()) {
      if (!visibleIds.has(id)) {
        scene.value.remove(mesh);
        mesh.material.dispose();
        // Dispose textures? In a real app we'd keep a texture cache.
        tileMeshes.delete(id);
      }
    }
  }

  for (const { node, worldBox } of visibleNodes) {
    if (!tileMeshes.has(node.id)) {
      loadTileMesh(node, worldBox);
    } else {
      // Ensure existing mesh gets updated lightDir
      const mesh = tileMeshes.get(node.id);
      if (mesh && mesh.material.uniforms) {
        mesh.material.uniforms.uLightDir.value.copy(lightDir.value);
        if (mesh.material.uniforms.uRenderMode) {
          mesh.material.uniforms.uRenderMode.value = renderMode.value;
        }
        if (mesh.material.uniforms.uSpecularExponent) {
          mesh.material.uniforms.uSpecularExponent.value = specularExponent.value;
        }
      }
    }
  }
  
  activeMeshesCount.value = tileMeshes.size;
};

const loadTileMesh = (node, worldBox) => {
  const width = worldBox.maxX - worldBox.minX;
  const height = worldBox.maxY - worldBox.minY;
  const centerX = worldBox.minX + width / 2;
  const centerY = worldBox.minY + height / 2;

  const geometry = new THREE.PlaneGeometry(width, height);
  
  // We need to fetch multiple layers if HSH
  const textures = [];
  let loadedCount = 0;
  
  // Create an empty mesh first to prevent duplicate loading requests
  // but keep loadingTileIds tracked to prevent parent deletion
  loadingTileIds.add(node.id);
  const placeholderMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
  const mesh = new THREE.Mesh(geometry, placeholderMat);
  
  // Set Z position based on level so higher detail tiles render IN FRONT of lower detail tiles
  mesh.position.set(centerX, centerY, node.level * 0.1);
  
  scene.value.add(mesh);
  tileMeshes.set(node.id, mesh);

  // Load textures based on layer count
  for (let l = 0; l < rtiInfo.value.layerCount; l++) {
    // The old exporter outputs 1-based layer indices: 1_1.jpg, 1_2.jpg, 1_3.jpg
    const url = `${props.url}/${node.id}_${l + 1}.jpg`; 
    
    if (isDebug) {
      console.log(`[RTI Viewer] Requesting image: ${url}`);
    }
    
    // Fallback error handling if image doesn't exist during dev
    textureLoader.load(url, (tex) => {
      textures[l] = tex;
      tex.colorSpace = THREE.NoColorSpace; // crucial for mathematical data!
      loadedCount++;
      
      if (loadedCount === rtiInfo.value.layerCount) {
        // All layers loaded, swap material!
        let material;
        
        const boundsMinX = (quadtree.value.imgBox.minX - 0.5) * quadtree.value.maxSize;
        const boundsMaxX = (quadtree.value.imgBox.maxX - 0.5) * quadtree.value.maxSize;
        const boundsMinY = (quadtree.value.imgBox.minY - 0.5) * quadtree.value.maxSize;
        const boundsMaxY = (quadtree.value.imgBox.maxY - 0.5) * quadtree.value.maxSize;
        const bounds = new THREE.Vector4(boundsMinX, boundsMaxX, boundsMinY, boundsMaxY);

        if (rtiInfo.value.type === 1) { // HSH
          material = HshShaderMaterial(textures, lightDir.value, rtiInfo.value.bias, rtiInfo.value.scale, bounds);
        } else if (rtiInfo.value.type === 2) { // LRGB PTM
          material = LrgbPtmMaterial(textures, lightDir.value, rtiInfo.value.bias, rtiInfo.value.scale, bounds);
        } else {
          material = new THREE.MeshBasicMaterial({ map: textures[0] });
        }

        if (material.uniforms) {
          material.uniforms.uRenderMode.value = renderMode.value;
          material.uniforms.uSpecularExponent.value = specularExponent.value;
        }

        mesh.material = material;
        mesh.geometry = new THREE.PlaneGeometry(width, height);
        loadingTileIds.delete(node.id); // Done loading this tile!
      }
    }, undefined, (err) => {
      console.error(`Error loading tile ${node.id}_${l + 1}:`, err);
      loadingTileIds.delete(node.id); // Stop blocking cleanup if error
    });
  }
};

const onWindowResize = () => {
  if (!containerWrapper.value || !camera.value || !renderer.value) return;
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
};

const setMode = (mode) => {
  currentMode.value = mode;
  if (controls.value) {
    controls.value.enabled = (mode === 'pan');
  }
};

const setRenderMode = (mode) => {
  renderMode.value = mode;
  for (const mesh of tileMeshes.values()) {
    if (mesh && mesh.material.uniforms && mesh.material.uniforms.uRenderMode) {
      mesh.material.uniforms.uRenderMode.value = mode;
    }
  }
};

const updateSpecular = () => {
  for (const mesh of tileMeshes.values()) {
    if (mesh && mesh.material.uniforms && mesh.material.uniforms.uSpecularExponent) {
      mesh.material.uniforms.uSpecularExponent.value = specularExponent.value;
    }
  }
};

const parseUrlParams = () => {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const params = new URLSearchParams(hash);
  
  if (params.has('lx') && params.has('ly')) {
    const lx = parseFloat(params.get('lx'));
    const ly = parseFloat(params.get('ly'));
    const r2 = lx*lx + ly*ly;
    const lz = r2 <= 1.0 ? Math.sqrt(1.0 - r2) : 0;
    lightDir.value.set(lx, ly, lz).normalize();
  }
  
  if (params.has('mode')) {
    renderMode.value = parseInt(params.get('mode'));
  }
};

// Removed live update UrlParams to keep history clean

const setupInteraction = () => {
  let isDraggingLight = false;
  let isDraggingCompass = false;

  // Main Canvas Interaction
  container.value.addEventListener('mousedown', () => {
    if (currentMode.value === 'light') isDraggingLight = true;
  });

  window.addEventListener('mouseup', () => {
    isDraggingLight = false;
    isDraggingCompass = false;
  });

  container.value.addEventListener('mousemove', (e) => {
    if (currentMode.value !== 'light' || !isDraggingLight) return;

    const rect = container.value.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Map to [0, 1] relative to the inscribed square
    const x = ((e.clientX - rect.left - centerX) / size) + 0.5;
    const y = ((e.clientY - rect.top - centerY) / size) + 0.5;

    updateLightFromNormalized(x, y);
  });

  // Compass Interaction
  if (compassRef.value) {
    compassRef.value.addEventListener('mousedown', (e) => {
      isDraggingCompass = true;
      handleCompassMove(e);
    });
    
    window.addEventListener('mousemove', (e) => {
      if (isDraggingCompass) {
        handleCompassMove(e);
      }
    });
  }
};

const handleCompassMove = (e) => {
  if (!compassRef.value) return;
  const rect = compassRef.value.getBoundingClientRect();
  // x, y mapped from 0 to 1 over the compass bounding box
  let x = (e.clientX - rect.left) / rect.width;
  let y = (e.clientY - rect.top) / rect.height;
  
  // Clamp to compass box so we don't blow up calculations if dragged outside
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));

  updateLightFromNormalized(x, y);
};

const updateLightFromNormalized = (x, y) => {
  let nx = (x * 2.0) - 1.0;
  let ny = -((y * 2.0) - 1.0);

  let r2 = nx * nx + ny * ny;
  
  // Prevent light from grazing parallel to the surface (which causes the image to go black)
  // by limiting the maximum mathematical radius to slightly less than 1.0.
  const MAX_RADIUS = 0.95;
  const MAX_R2 = MAX_RADIUS * MAX_RADIUS;
  
  if (r2 > MAX_R2) {
    const len = Math.sqrt(r2);
    nx = (nx / len) * MAX_RADIUS;
    ny = (ny / len) * MAX_RADIUS;
    r2 = MAX_R2;
  }
  
  const nz = Math.sqrt(1.0 - r2);
  lightDir.value.set(nx, ny, nz).normalize();
};

const exportImage = () => {
  if (!renderer.value) return;
  // Trigger a render to ensure drawing buffer is up to date
  renderer.value.render(scene.value, camera.value);
  const dataURL = renderer.value.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `rti_export_${Date.now()}.png`;
  link.click();
};

const copyLink = () => {
  if (!camera.value) return;
  const params = new URLSearchParams();
  params.set('cx', camera.value.position.x.toFixed(4));
  params.set('cy', camera.value.position.y.toFixed(4));
  params.set('z', camera.value.zoom.toFixed(4));
  params.set('lx', lightDir.value.x.toFixed(4));
  params.set('ly', lightDir.value.y.toFixed(4));
  params.set('mode', renderMode.value);
  
  const baseUrl = props.shareUrl || `${window.location.origin}${window.location.pathname}`;
  generatedShareLink.value = `${baseUrl}#${params.toString()}`;
  isCopied.value = false;
  showShareModal.value = true;
};

const executeCopyLink = async () => {
  try {
    await navigator.clipboard.writeText(generatedShareLink.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
    alert('Failed to copy link. Please select the text and copy it manually.');
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    if (rootWrapper.value.requestFullscreen) {
      rootWrapper.value.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};
</script>
