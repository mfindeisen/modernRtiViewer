<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="open" class="absolute inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="emit('close')"></div>

      <div class="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full text-slate-300">
        <button @click="emit('close')" class="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex items-center space-x-3 mb-6">
          <h2 class="text-2xl font-bold text-white">About RTI Viewer</h2>
          <span class="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">v{{ VIEWER_VERSION }}</span>
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
</template>

<script setup lang="ts">
import { VIEWER_VERSION } from '../version.js';

defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);
</script>
