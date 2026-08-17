<template>
  <div
    v-if="visible"
    class="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1.5rem,env(safe-area-inset-right,0px))] z-20 flex items-center gap-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 px-3 py-2 text-xs text-white/90 shadow-xl pointer-events-auto"
  >
    <div class="flex flex-col leading-tight tabular-nums" aria-live="polite">
      <span class="text-[10px] uppercase tracking-wide text-white/50">Zoom</span>
      <span>{{ zoomPercent }}%</span>
    </div>
    <div class="w-px h-7 bg-white/10" />
    <div class="flex flex-col leading-tight tabular-nums">
      <span class="text-[10px] uppercase tracking-wide text-white/50">Light</span>
      <span>{{ lightX }} {{ lightY }}</span>
    </div>
    <button
      type="button"
      class="ml-1 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide text-white/80 hover:bg-white/10 hover:text-white transition-colors"
      aria-label="Fit image to view"
      title="Fit (F)"
      @click="emit('fit')"
    >
      Fit
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps({
  visible: { type: Boolean, default: false },
  zoomPercent: { type: Number, default: 100 },
  lightX: { type: String, default: '0.00' },
  lightY: { type: String, default: '0.00' },
});

const emit = defineEmits(['fit']);
</script>
