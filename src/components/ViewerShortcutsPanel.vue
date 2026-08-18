<template>
  <div
    v-if="open"
    class="absolute bottom-[max(5.25rem,calc(env(safe-area-inset-bottom,0px)+4.25rem))] right-[max(1.5rem,env(safe-area-inset-right,0px))] z-30 w-[16.5rem] rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/20 px-3 py-2.5 text-white shadow-2xl pointer-events-auto"
    role="dialog"
    aria-label="Keyboard shortcuts"
  >
    <div class="flex items-start justify-between gap-2 mb-2">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wide text-white/50">Keys</p>
        <p class="text-[11px] text-white/55 leading-snug mt-0.5">Click the viewer first.</p>
      </div>
      <button
        type="button"
        class="text-white/45 hover:text-white transition-colors p-0.5"
        aria-label="Close keyboard shortcuts"
        @click="emit('close')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="space-y-2">
      <section v-for="group in groups" :key="group.title">
        <h3 class="text-[9px] font-semibold uppercase tracking-wider text-white/35 mb-1">{{ group.title }}</h3>
        <ul class="space-y-0.5">
          <li
            v-for="item in group.items"
            :key="item.label"
            class="flex items-center justify-between gap-2 py-0.5"
          >
            <span class="text-[11px] text-white/80">{{ item.label }}</span>
            <span class="flex items-center gap-0.5 shrink-0">
              <kbd
                v-for="key in item.keys"
                :key="key"
                class="min-w-[1.15rem] px-1 py-px rounded bg-white/12 border border-white/15 text-[10px] font-semibold text-white/90 text-center leading-4"
              >{{ key }}</kbd>
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { viewerShortcutGroups } from '../lib/viewerKeyboard.js';

const props = defineProps({
  open: { type: Boolean, default: false },
  annotationEnabled: { type: Boolean, default: false },
  maxRenderMode: { type: Number, default: 4 },
});

const emit = defineEmits(['close']);

const groups = computed(() => viewerShortcutGroups({
  annotationEnabled: props.annotationEnabled,
  maxRenderMode: props.maxRenderMode,
}));
</script>
