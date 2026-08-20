<template>
  <div
    v-if="open"
    class="pointer-events-auto"
    :class="narrow ? mobileClass : desktopClass"
    @pointerdown.stop
  >
    <div
      class="flex items-center gap-2"
      :class="narrow ? 'px-3.5 py-2 min-h-11' : 'mb-3'"
    >
      <h3 class="text-sm font-semibold text-white shrink-0">{{ title }}</h3>
      <span
        v-if="narrow && !expanded && summary"
        class="text-[11px] text-slate-400 tabular-nums truncate min-w-0 flex-1"
      >{{ summary }}</span>
      <span v-else class="min-w-0 flex-1" />
      <slot name="actions" />
      <button
        v-if="narrow && collapsible"
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 transition-colors"
        :aria-label="expanded ? 'Collapse panel' : 'Expand panel'"
        :aria-expanded="expanded"
        @click="emit('update:expanded', !expanded)"
      >
        <ChevronDownIcon
          class="w-4 h-4 transition-transform"
          :class="expanded ? '' : '-rotate-180'"
        />
      </button>
    </div>
    <p
      v-if="subtitle && (!narrow || expanded)"
      class="text-[11px] text-slate-400 leading-snug"
      :class="narrow ? 'px-3.5 -mt-1 mb-2' : '-mt-2 mb-3'"
    >
      {{ subtitle }}
    </p>
    <div
      v-if="!narrow || expanded"
      data-testid="tool-sheet-body"
      :class="narrow ? 'px-3.5 pb-3 max-h-[42vh] overflow-y-auto' : ''"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown as ChevronDownIcon } from '@lucide/vue';
import { MOBILE_CHROME_DOCK } from '../lib/viewport.js';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  summary: { type: String, default: '' },
  narrow: { type: Boolean, default: false },
  expanded: { type: Boolean, default: true },
  collapsible: { type: Boolean, default: true },
  aboveChrome: { type: Boolean, default: false },
  desktopClass: {
    type: String,
    default: 'absolute top-4 right-4 z-40 w-56 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl p-4',
  },
});

const emit = defineEmits<{
  'update:expanded': [value: boolean];
}>();

const mobileClass = computed(() => {
  const dock = props.aboveChrome
    ? `bottom-[calc(${MOBILE_CHROME_DOCK}+env(safe-area-inset-bottom,0px))]`
    : 'bottom-0 pb-[env(safe-area-inset-bottom,0px)]';
  return [
    'absolute inset-x-0 z-40 rounded-t-2xl bg-slate-900/94 backdrop-blur-md border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]',
    dock,
  ];
});
</script>
