<template>
  <div
    v-if="(currentMode === 'whitebalance' || whiteBalanceActive) && !loading"
    class="absolute top-4 right-4 z-40 w-56 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl p-4 pointer-events-auto"
    @pointerdown.stop
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-white">White Balance</h3>
      <button
        type="button"
        @click="emit('reset')"
        class="text-[10px] font-medium text-slate-400 hover:text-white transition-colors"
      >
        Reset
      </button>
    </div>
    <div class="flex flex-col gap-2.5 text-xs text-slate-400">
      <label v-for="channel in channels" :key="channel.key" class="flex flex-col gap-1">
        <span class="flex items-center justify-between">
          <span>{{ channel.label }}</span>
          <span class="text-slate-300 tabular-nums">{{ colorGain[channel.key].toFixed(2) }}</span>
        </span>
        <input
          type="range"
          :min="gainMin"
          :max="gainMax"
          step="0.01"
          :value="colorGain[channel.key]"
          class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          @input="onChannelInput(channel.key, $event)"
        />
      </label>
    </div>
  </div>

  <div
    v-if="currentMode === 'whitebalance' && !loading"
    class="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-sm font-medium shadow-lg backdrop-blur-sm pointer-events-none"
  >
    {{ pickFeedback || 'Click a white or gray patch on the color chart' }}
  </div>
</template>

<script setup lang="ts">
const channels = [
  { key: 'r', label: 'Red' },
  { key: 'g', label: 'Green' },
  { key: 'b', label: 'Blue' },
] as const;

const props = defineProps({
  currentMode: { type: String, required: true },
  loading: { type: Boolean, default: false },
  whiteBalanceActive: { type: Boolean, default: false },
  colorGain: { type: Object, required: true },
  gainMin: { type: Number, required: true },
  gainMax: { type: Number, required: true },
  pickFeedback: { type: String, default: '' },
});

const emit = defineEmits(['update:colorGain', 'reset']);

function onChannelInput(key: typeof channels[number]['key'], event: Event) {
  const target = event.target as HTMLInputElement;
  const value = parseFloat(target.value);
  emit('update:colorGain', { ...props.colorGain, [key]: value });
}
</script>
