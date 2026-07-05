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

      <div class="relative bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-slate-300">
        <button @click="emit('close')" class="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
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
            :value="shareLink"
            class="flex-1 bg-transparent text-white px-3 py-2 outline-none text-sm font-mono selection:bg-blue-500/30"
            @focus="(e) => (e.target as HTMLInputElement).select()"
          />
          <button
            @click="emit('copy')"
            :class="['px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2', copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-600 hover:bg-blue-500 text-white']"
          >
            <component :is="copied ? CheckIcon : CopyIcon" class="w-4 h-4" />
            <span>{{ copied ? 'Copied' : 'Copy' }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { Copy as CopyIcon, Check as CheckIcon } from '@lucide/vue';

defineProps({
  open: { type: Boolean, default: false },
  shareLink: { type: String, default: '' },
  copied: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'copy']);
</script>
