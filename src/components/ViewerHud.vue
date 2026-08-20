<template>
  <div
    v-if="visible"
    class="flex items-center gap-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white/90 shadow-xl pointer-events-auto"
    :class="compact ? 'px-1.5 py-1' : 'gap-3 px-3 py-2'"
  >
    <template v-if="!compact">
      <div class="flex flex-col leading-tight tabular-nums w-[4.5ch]" aria-live="polite">
        <span class="text-[10px] uppercase tracking-wide text-white/50">Zoom</span>
        <span>{{ zoomPercent }}%</span>
      </div>
      <div class="w-px h-7 bg-white/10" />
      <div class="flex flex-col leading-tight tabular-nums w-[9ch]">
        <span class="text-[10px] uppercase tracking-wide text-white/50">Light</span>
        <span>{{ lightX }} {{ lightY }}</span>
      </div>
      <div class="w-px h-7 bg-white/10" />
      <div class="flex flex-col leading-tight tabular-nums" title="Color under the cursor">
        <span class="text-[10px] uppercase tracking-wide text-white/50">RGB</span>
        <span class="whitespace-pre w-[11ch]">{{ probeRgb || '000 000 000' }}</span>
      </div>
    </template>
    <div class="flex items-center" :class="compact ? 'gap-0.5' : 'gap-1 ml-1'">
      <button
        type="button"
        class="rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        :class="compact ? 'w-8 h-8 flex items-center justify-center' : 'px-2 py-1 text-[10px] font-semibold uppercase tracking-wide'"
        aria-label="Fit image to view"
        title="Fit (F)"
        @click="emit('fit')"
      >
        <ScanIcon v-if="compact" class="w-4 h-4" />
        <span v-else>Fit</span>
      </button>
      <button
        type="button"
        class="rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        :class="compact ? 'w-8 h-8 flex items-center justify-center' : 'px-2 py-1 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap'"
        aria-label="Reset light to front"
        title="Center light (R)"
        @click="emit('reset-light')"
      >
        <LocateFixedIcon v-if="compact" class="w-4 h-4" />
        <span v-else>Center light</span>
      </button>
      <button
        v-if="!compact"
        type="button"
        class="w-7 h-7 rounded-lg text-[12px] font-semibold text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        :class="shortcutsOpen ? 'bg-white/15 text-white' : ''"
        aria-label="Keyboard shortcuts"
        :aria-pressed="shortcutsOpen"
        title="Keys (?)"
        @click="emit('toggle-shortcuts')"
      >
        ?
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Scan as ScanIcon, LocateFixed as LocateFixedIcon } from '@lucide/vue';

defineProps({
  visible: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  zoomPercent: { type: Number, default: 100 },
  lightX: { type: String, default: '0.00' },
  lightY: { type: String, default: '0.00' },
  probeRgb: { type: String, default: '' },
  shortcutsOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['fit', 'reset-light', 'toggle-shortcuts']);
</script>
