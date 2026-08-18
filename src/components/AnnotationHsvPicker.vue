<template>
  <div class="space-y-2">
    <div
      ref="areaEl"
      class="relative h-24 w-full rounded-md cursor-crosshair touch-none overflow-hidden border border-white/15"
      :style="areaStyle"
      @pointerdown="onAreaPointerDown"
      @pointermove="onAreaPointerMove"
      @pointerup="onAreaPointerUp"
    >
      <span
        class="absolute size-3 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2"
        :style="thumbStyle"
      />
    </div>
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      :value="hsv.h"
      class="annotation-hue-slider w-full h-3.5 rounded-full appearance-none cursor-pointer"
      :style="{ background: HUE_SLIDER_GRADIENT }"
      aria-label="Hue"
      @input="onHueInput"
    />
    <p class="text-[10px] font-mono tabular-nums text-slate-400">{{ modelValue }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { hexToHsv, hsvToHex, HUE_SLIDER_GRADIENT } from '../lib/annotationColors.js';

const props = defineProps({
  modelValue: { type: String, required: true },
});

const emit = defineEmits(['update:modelValue']);

const areaEl = ref<HTMLElement | null>(null);
const dragging = ref(false);
const hsv = computed(() => hexToHsv(props.modelValue));
const hueColor = computed(() => hsvToHex(hsv.value.h, 1, 1));

const areaStyle = computed(() => ({
  background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor.value})`,
}));

const thumbStyle = computed(() => ({
  left: `${hsv.value.s * 100}%`,
  top: `${(1 - hsv.value.v) * 100}%`,
  backgroundColor: props.modelValue,
}));

function emitHsv(h: number, s: number, v: number) {
  emit('update:modelValue', hsvToHex(h, s, v));
}

function setFromArea(event: PointerEvent) {
  const el = areaEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const s = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const v = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
  emitHsv(hsv.value.h, s, v);
}

function onAreaPointerDown(event: PointerEvent) {
  dragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  setFromArea(event);
}

function onAreaPointerMove(event: PointerEvent) {
  if (!dragging.value) return;
  setFromArea(event);
}

function onAreaPointerUp() {
  dragging.value = false;
}

function onHueInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  emitHsv(Number(target.value), hsv.value.s, hsv.value.v);
}
</script>

<style scoped>
.annotation-hue-slider {
  -webkit-appearance: none;
  appearance: none;
}
.annotation-hue-slider::-webkit-slider-runnable-track {
  height: 14px;
  border-radius: 9999px;
}
.annotation-hue-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.4);
}
.annotation-hue-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.4);
}
</style>
