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
      <div class="relative bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-md w-full text-slate-300">
        <button type="button" class="absolute top-4 right-4 text-slate-500 hover:text-white" aria-label="Close export" @click="emit('close')">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 class="text-lg font-semibold text-white mb-4">Export</h2>
        <label class="flex items-center gap-2 text-sm mb-4 cursor-pointer select-none">
          <ViewerCheckbox :checked="includeAnnotations" @update:checked="emit('update:includeAnnotations', $event)" />
          Include annotations
        </label>
        <div class="flex flex-col gap-2">
          <button type="button" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500" :disabled="busy" @click="emit('snapshot')">
            Viewport PNG
          </button>
          <button type="button" class="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600" :disabled="busy" @click="emit('full-res')">
            Full resolution PNG
          </button>
          <button type="button" class="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600" :disabled="busy" @click="emit('clipboard')">
            Copy image
          </button>
          <button
            v-if="lightOrbitAvailable"
            type="button"
            class="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600"
            :disabled="busy"
            @click="emit('video')"
          >
            Record light orbit (webm format)
          </button>
          <button
            v-if="drawingAvailable"
            type="button"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600"
            :disabled="busy"
            @click="emit('drawing')"
          >
            Line drawing PNG
            <ExperimentalBadge v-if="drawingExperimental" />
          </button>
          <button
            v-if="meshAvailable"
            type="button"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600"
            :disabled="busy"
            @click="emit('mesh')"
          >
            View 3D surface
            <ExperimentalBadge v-if="meshExperimental" />
          </button>
        </div>
        <p v-if="meshAvailable" class="mt-3 text-xs text-slate-400 leading-relaxed">
          <span v-if="meshExperimental" class="text-amber-300/90">Experimental.</span>
          Reconstructs a one-sided mesh from RTI normals and opens it in a 3D view. Download PLY for MeshLab or Blender.
          Set a scale in measure mode if you want millimetres instead of pixels.
        </p>
        <p v-if="drawingAvailable" class="mt-3 text-xs text-slate-400 leading-relaxed">
          <span v-if="drawingExperimental" class="text-amber-300/90">Experimental.</span>
          Line drawing traces ridges and valleys from the surface normals. Adjust thresholds under Enhancements.
        </p>
        <p v-if="status" class="mt-3 text-xs text-slate-400">{{ status }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import ViewerCheckbox from './ViewerCheckbox.vue';
import ExperimentalBadge from './ExperimentalBadge.vue';

defineProps({
  open: { type: Boolean, default: false },
  includeAnnotations: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  status: { type: String, default: '' },
  meshAvailable: { type: Boolean, default: false },
  drawingAvailable: { type: Boolean, default: false },
  lightOrbitAvailable: { type: Boolean, default: true },
  drawingExperimental: { type: Boolean, default: true },
  meshExperimental: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'snapshot', 'full-res', 'clipboard', 'video', 'mesh', 'drawing', 'update:includeAnnotations']);
</script>
