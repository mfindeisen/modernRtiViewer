<template>
  <div
    class="w-[11.5rem] h-24 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.55)] px-2.5 py-2 flex flex-col justify-between pointer-events-auto"
    @pointerdown.stop
  >
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border border-white/15 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        :class="playing ? 'bg-yellow-400/25 text-yellow-100 border-yellow-300/40' : ''"
        :aria-label="playing ? 'Pause light animation' : 'Play light animation'"
        :aria-pressed="playing"
        :title="playing ? 'Pause (Space)' : 'Play (Space)'"
        @click="emit('toggle')"
      >
        <component :is="playing ? PauseIcon : PlayIcon" class="w-3.5 h-3.5" />
      </button>
      <div class="flex-1 grid grid-cols-2 rounded-lg bg-black/35 p-0.5 border border-white/10">
        <button
          v-for="option in modes"
          :key="option.id"
          type="button"
          class="px-1.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-colors"
          :class="mode === option.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'"
          :aria-pressed="mode === option.id"
          @click="emit('update:mode', option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <label class="flex flex-col gap-1">
      <span class="flex items-center justify-between text-[10px] uppercase tracking-wide text-white/50">
        <span>Speed</span>
        <span class="text-white/80 tabular-nums normal-case tracking-normal">{{ formatLightAnimSpeed(speed) }}</span>
      </span>
      <input
        type="range"
        :min="limits.min"
        :max="limits.max"
        :step="limits.step"
        :value="speed"
        class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-400"
        aria-label="Light animation speed"
        @input="onSpeedInput"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { Play as PlayIcon, Pause as PauseIcon } from '@lucide/vue';
import { LIGHT_ANIM_SPEED, formatLightAnimSpeed, type LightAnimationMode } from '../composables/useLightAnimation.js';

defineProps({
  playing: { type: Boolean, default: false },
  mode: { type: String, default: 'orbit' },
  speed: { type: Number, default: LIGHT_ANIM_SPEED.default },
});

const emit = defineEmits<{
  toggle: [];
  'update:mode': [mode: LightAnimationMode];
  'update:speed': [speed: number];
}>();

const limits = LIGHT_ANIM_SPEED;
const modes: { id: LightAnimationMode; label: string }[] = [
  { id: 'orbit', label: 'Orbit' },
  { id: 'raking', label: 'Raking' },
];

function onSpeedInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  emit('update:speed', Number(target.value));
}
</script>
