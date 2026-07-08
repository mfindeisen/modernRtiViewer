<template>
  <div
    v-if="visible && !loading"
    :class="[
      'absolute right-4 z-40 w-56 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl p-4 pointer-events-auto',
      stackBelowWhiteBalance ? 'top-52' : 'top-4',
    ]"
    @pointerdown.stop
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-white">Glossy Mode</h3>
      <span class="text-xs text-slate-300 tabular-nums">{{ specularExponent }}</span>
    </div>
    <label class="flex flex-col gap-1 text-xs text-slate-400">
      <span>Specular Intensity</span>
      <input
        type="range"
        min="2"
        max="50"
        step="1"
        :value="specularExponent"
        class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        @input="onInput"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  visible: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  specularExponent: { type: Number, required: true },
  stackBelowWhiteBalance: { type: Boolean, default: false },
});

const emit = defineEmits(['update:specularExponent']);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:specularExponent', parseFloat(target.value));
}
</script>
