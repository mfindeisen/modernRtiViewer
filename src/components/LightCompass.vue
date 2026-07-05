<template>
  <div
    ref="compassEl"
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
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps({
  lightDir: { type: Object, required: true },
});

const compassEl = ref(null);
defineExpose({ compassEl });
</script>
