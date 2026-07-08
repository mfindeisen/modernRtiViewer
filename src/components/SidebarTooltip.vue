<template>
  <div
    ref="anchorEl"
    v-bind="$attrs"
    @pointerenter="show"
    @pointerleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
  </div>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed z-[9999] px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-white text-xs font-medium whitespace-nowrap shadow-2xl flex flex-col items-start text-left pointer-events-none"
      :style="{ top: `${coords.top}px`, left: `${coords.left}px`, transform: 'translateY(-50%)' }"
      role="tooltip"
    >
      <span class="text-white font-bold mb-0.5">{{ title }}</span>
      <span v-if="description" class="text-white/60">{{ description }}</span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

defineProps<{
  title: string;
  description?: string;
}>();

const visible = ref(false);
const coords = ref({ top: 0, left: 0 });
const anchorEl = ref<HTMLElement | null>(null);

function show() {
  const el = anchorEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  coords.value = {
    top: rect.top + rect.height / 2,
    left: rect.right + 16,
  };
  visible.value = true;
}

function hide() {
  visible.value = false;
}
</script>
