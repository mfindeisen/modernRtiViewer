<template>
  <div
    ref="compassEl"
    class="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] left-[max(1.5rem,env(safe-area-inset-left,0px))] w-24 h-24 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/35 flex items-center justify-center z-20 shadow-[0_8px_24px_rgba(0,0,0,0.55)] overflow-hidden cursor-crosshair touch-none"
    title="Light direction"
  >
    <div class="absolute inset-[7px] rounded-full border border-white/45 pointer-events-none"></div>
    <div class="absolute inset-[18px] rounded-full border border-white/20 pointer-events-none"></div>
    <div class="absolute w-[calc(100%-14px)] h-px bg-white/50 pointer-events-none"></div>
    <div class="absolute h-[calc(100%-14px)] w-px bg-white/50 pointer-events-none"></div>
    <span class="absolute top-[5px] left-1/2 -translate-x-1/2 w-[2px] h-2 rounded-full bg-white/80 pointer-events-none"></span>
    <span class="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-[2px] h-2 rounded-full bg-white/55 pointer-events-none"></span>
    <span class="absolute left-[5px] top-1/2 -translate-y-1/2 w-2 h-[2px] rounded-full bg-white/55 pointer-events-none"></span>
    <span class="absolute right-[5px] top-1/2 -translate-y-1/2 w-2 h-[2px] rounded-full bg-white/55 pointer-events-none"></span>
    <div class="absolute w-1.5 h-1.5 rounded-full bg-white/70 pointer-events-none"></div>
    <div
      class="absolute top-1/2 left-1/2 -mt-1.5 -ml-1.5 w-3 h-3 bg-yellow-300 rounded-full ring-1 ring-black/40 shadow-[0_0_10px_rgba(253,224,71,0.95)] transition-transform duration-75 pointer-events-none"
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
