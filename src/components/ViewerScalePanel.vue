<template>
  <ViewerToolSheet
    :open="open"
    title="Measure"
    :subtitle="hint"
    :summary="ready ? distanceLabel : ''"
    :narrow="narrow"
    :expanded="expanded"
    :above-chrome="aboveChrome"
    desktop-class="absolute left-4 top-4 z-40 w-72 rounded-xl bg-slate-900/92 backdrop-blur-md border border-white/10 shadow-2xl p-4"
    @update:expanded="emit('update:expanded', $event)"
  >
    <template #actions>
      <span v-if="hasScale" class="text-[10px] font-medium uppercase tracking-wide text-sky-300">
        {{ unitLabel }}
      </span>
    </template>

    <p v-if="!ready" class="text-xs text-sky-200/90 bg-sky-500/10 border border-sky-400/20 rounded-lg px-2.5 py-2">
      {{ narrow ? 'Drag to draw a line.' : 'Click and drag to draw a line.' }}
    </p>

    <div v-else class="flex flex-col gap-3">
      <p class="text-lg font-semibold text-white tabular-nums leading-none">{{ distanceLabel }}</p>
      <p v-if="pixelLabel && hasScale" class="text-[11px] text-slate-500 tabular-nums -mt-2">{{ pixelLabel }}</p>

      <form v-if="scaleEditable" class="flex flex-col gap-2 pt-2 border-t border-white/10" @submit.prevent="submit">
        <p class="text-[11px] text-slate-400">
          {{ hasScale ? 'Recalibrate from this line' : 'This line is a known length on the scale' }}
        </p>
        <div class="flex gap-2">
          <input
            ref="lengthInput"
            v-model="knownLength"
            type="number"
            min="0.001"
            step="any"
            required
            class="flex-1 rounded-lg bg-black/40 border border-white/15 px-2.5 py-1.5 text-sm text-white tabular-nums outline-none focus:border-sky-400"
            aria-label="Known length"
          />
          <select
            v-model="unit"
            class="w-[4.75rem] rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-400"
            aria-label="Unit"
          >
            <option v-for="option in MEASURE_UNITS" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </div>
        <button
          type="submit"
          class="px-3 py-1.5 rounded-lg bg-sky-500 text-white text-sm font-semibold hover:bg-sky-400 disabled:opacity-40"
          :disabled="!canSave"
        >
          {{ hasScale ? 'Update scale' : 'Save scale' }}
        </button>
      </form>
    </div>
  </ViewerToolSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { MEASURE_UNITS, type MeasureUnit } from '../lib/measureDistance.js';
import ViewerToolSheet from './ViewerToolSheet.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  ready: { type: Boolean, default: false },
  distanceLabel: { type: String, default: '' },
  pixelLabel: { type: String, default: '' },
  defaultUnit: { type: String, default: 'mm' },
  hasScale: { type: Boolean, default: false },
  scaleEditable: { type: Boolean, default: true },
  narrow: { type: Boolean, default: false },
  expanded: { type: Boolean, default: true },
  aboveChrome: { type: Boolean, default: false },
});

const emit = defineEmits<{
  save: [payload: { knownLength: number; unit: MeasureUnit }];
  'update:expanded': [value: boolean];
}>();

const knownLength = ref('');
const unit = ref<MeasureUnit>('mm');
const lengthInput = ref<HTMLInputElement | null>(null);

const canSave = computed(() => Number(knownLength.value) > 0);
const unitLabel = computed(() => {
  const match = MEASURE_UNITS.find((item) => item.id === props.defaultUnit);
  return match ? `in ${match.label}` : 'scaled';
});
const hint = computed(() => {
  if (!props.scaleEditable) return 'Draw a line to measure distance.';
  if (props.hasScale) return 'Draw a line to measure. You can recalibrate from a known length.';
  return 'Draw along the photographed scale, then enter its real length.';
});

watch(
  () => props.defaultUnit,
  (defaultUnit) => {
    const parsed = MEASURE_UNITS.some((item) => item.id === defaultUnit)
      ? (defaultUnit as MeasureUnit)
      : 'mm';
    unit.value = parsed;
  },
  { immediate: true },
);

function submit() {
  const length = Number(knownLength.value);
  if (!(length > 0)) return;
  emit('save', { knownLength: length, unit: unit.value });
}
</script>
