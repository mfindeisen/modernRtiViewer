<template>
  <ViewerToolSheet
    :open="open && !loading"
    title="Enhancements"
    :narrow="narrow"
    :expanded="expanded"
    :above-chrome="aboveChrome"
    :desktop-class="desktopClass"
    @update:expanded="emit('update:expanded', $event)"
  >
    <template #actions>
      <button
        type="button"
        class="text-[10px] font-medium text-slate-400 hover:text-white transition-colors"
        @click="emit('reset')"
      >
        Reset
      </button>
    </template>

    <div class="flex flex-col gap-3 text-xs text-slate-400">
      <template v-if="lineDrawingMode">
        <p class="text-[10px] text-slate-500 leading-snug -mt-1 flex flex-wrap items-center gap-1.5">
          <ExperimentalBadge />
          Clean contours from ridges, valleys, and silhouettes. Sketch adds hatching and ink.
        </p>
        <div class="grid grid-cols-2 rounded-lg bg-black/35 p-0.5 border border-white/10">
          <button
            v-for="option in styleOptions"
            :key="option.id"
            type="button"
            class="px-1.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-colors"
            :class="lineDrawingStyle === option.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'"
            :aria-pressed="lineDrawingStyle === option.id"
            @click="emit('update:lineDrawingStyle', option.id)"
          >
            {{ option.label }}
          </button>
        </div>
        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between">
            <span>Ridge threshold</span>
            <span class="text-slate-300 tabular-nums">{{ ridgeThreshold.toFixed(2) }}</span>
          </span>
          <input
            type="range"
            :min="ridgeLimits.min"
            :max="ridgeLimits.max"
            :step="ridgeLimits.step"
            :value="ridgeThreshold"
            class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-slate-200"
            @input="emitNumber('update:ridgeThreshold', $event)"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between">
            <span>Valley threshold</span>
            <span class="text-slate-300 tabular-nums">{{ valleyThreshold.toFixed(2) }}</span>
          </span>
          <input
            type="range"
            :min="valleyLimits.min"
            :max="valleyLimits.max"
            :step="valleyLimits.step"
            :value="valleyThreshold"
            class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-slate-200"
            @input="emitNumber('update:valleyThreshold', $event)"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between">
            <span>Line width</span>
            <span class="text-slate-300 tabular-nums">{{ lineWidth.toFixed(1) }}</span>
          </span>
          <input
            type="range"
            :min="lineWidthLimits.min"
            :max="lineWidthLimits.max"
            :step="lineWidthLimits.step"
            :value="lineWidth"
            class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-slate-200"
            @input="emitNumber('update:lineWidth', $event)"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between">
            <span>Outline</span>
            <span class="text-slate-300 tabular-nums">{{ lineOutline.toFixed(2) }}</span>
          </span>
          <input
            type="range"
            :min="outlineLimits.min"
            :max="outlineLimits.max"
            :step="outlineLimits.step"
            :value="lineOutline"
            class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-slate-200"
            @input="emitNumber('update:lineOutline', $event)"
          />
        </label>
        <label v-if="lineDrawingStyle === 'sketch'" class="flex flex-col gap-1">
          <span class="flex items-center justify-between">
            <span>Hatch</span>
            <span class="text-slate-300 tabular-nums">{{ lineHatch.toFixed(2) }}</span>
          </span>
          <input
            type="range"
            :min="hatchLimits.min"
            :max="hatchLimits.max"
            :step="hatchLimits.step"
            :value="lineHatch"
            class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-slate-200"
            @input="emitNumber('update:lineHatch', $event)"
          />
        </label>
      </template>

      <template v-else>
      <label class="flex flex-col gap-1">
        <span class="flex items-center justify-between">
          <span>Exposure</span>
          <span class="text-slate-300 tabular-nums">{{ exposure.toFixed(2) }}</span>
        </span>
        <input
          type="range"
          :min="exposureLimits.min"
          :max="exposureLimits.max"
          :step="exposureLimits.step"
          :value="exposure"
          class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          @input="emitNumber('update:exposure', $event)"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="flex items-center justify-between">
          <span>Diffuse Gain</span>
          <span class="text-slate-300 tabular-nums">{{ diffuseGain.toFixed(1) }}</span>
        </span>
        <input
          type="range"
          :min="gainLimits.min"
          :max="gainLimits.max"
          :step="gainLimits.step"
          :value="diffuseGain"
          class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          @input="emitNumber('update:diffuseGain', $event)"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="flex items-center justify-between">
          <span>Unsharp Mask</span>
          <span class="text-slate-300 tabular-nums">{{ unsharpAmount.toFixed(2) }}</span>
        </span>
        <input
          type="range"
          :min="unsharpLimits.min"
          :max="unsharpLimits.max"
          :step="unsharpLimits.step"
          :value="unsharpAmount"
          class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          @input="emitNumber('update:unsharpAmount', $event)"
        />
      </label>

      <div
        class="flex flex-col gap-3 pt-1 border-t border-white/10"
        :class="glossyMode ? '' : 'opacity-50'"
      >
        <p class="text-[10px] leading-snug" :class="glossyMode ? 'text-amber-300/80' : 'text-slate-500'">
          Specular sliders apply only in Glossy mode (sparkle icon in the sidebar).
        </p>
        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between">
            <span>Specular exponent</span>
            <span class="text-slate-300 tabular-nums">{{ specularExponent }}</span>
          </span>
          <input
            type="range"
            :min="specExpLimits.min"
            :max="specExpLimits.max"
            :step="specExpLimits.step"
            :value="specularExponent"
            :disabled="!glossyMode"
            class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:cursor-not-allowed"
            @input="emitNumber('update:specularExponent', $event)"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="flex items-center justify-between">
            <span>Specular intensity</span>
            <span class="text-slate-300 tabular-nums">{{ specularIntensity.toFixed(2) }}</span>
          </span>
          <input
            type="range"
            :min="specIntLimits.min"
            :max="specIntLimits.max"
            :step="specIntLimits.step"
            :value="specularIntensity"
            :disabled="!glossyMode"
            class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:cursor-not-allowed"
            @input="emitNumber('update:specularIntensity', $event)"
          />
        </label>
      </div>

      <label v-if="dualMode" class="flex items-center justify-between gap-2 pt-1 border-t border-white/10 cursor-pointer select-none">
        <span>Link dual lights</span>
        <ViewerCheckbox :checked="dualLinked" @update:checked="emit('update:dualLinked', $event)" />
      </label>
      <p v-if="dualMode && !dualLinked" class="text-[10px] text-slate-500 leading-snug">
        Drag the blue compass dot or Shift-drag to move the second light.
      </p>
      </template>
    </div>
  </ViewerToolSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ViewerCheckbox from './ViewerCheckbox.vue';
import ViewerToolSheet from './ViewerToolSheet.vue';
import ExperimentalBadge from './ExperimentalBadge.vue';
import {
  DIFFUSE_GAIN_LIMITS,
  UNSHARP_LIMITS,
  EXPOSURE_LIMITS,
  SPECULAR_INTENSITY_LIMITS,
  SPECULAR_EXPONENT_LIMITS,
  RIDGE_THRESHOLD_LIMITS,
  VALLEY_THRESHOLD_LIMITS,
  LINE_WIDTH_LIMITS,
  LINE_OUTLINE_LIMITS,
  LINE_HATCH_LIMITS,
  LINE_DRAWING_STYLE_CONTOUR,
  LINE_DRAWING_STYLE_SKETCH,
  DEFAULT_LINE_OUTLINE,
  DEFAULT_LINE_HATCH,
  DEFAULT_LINE_DRAWING_STYLE,
  type LineDrawingStyle,
} from '../lib/rtiEnhancements.js';

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  diffuseGain: { type: Number, required: true },
  unsharpAmount: { type: Number, required: true },
  exposure: { type: Number, required: true },
  specularExponent: { type: Number, required: true },
  specularIntensity: { type: Number, required: true },
  glossyMode: { type: Boolean, default: false },
  dualMode: { type: Boolean, default: false },
  dualLinked: { type: Boolean, default: true },
  stackBelowWhiteBalance: { type: Boolean, default: false },
  narrow: { type: Boolean, default: false },
  expanded: { type: Boolean, default: true },
  aboveChrome: { type: Boolean, default: false },
  lineDrawingMode: { type: Boolean, default: false },
  ridgeThreshold: { type: Number, default: 0.14 },
  valleyThreshold: { type: Number, default: 0.1 },
  lineWidth: { type: Number, default: 1.5 },
  lineOutline: { type: Number, default: DEFAULT_LINE_OUTLINE },
  lineHatch: { type: Number, default: DEFAULT_LINE_HATCH },
  lineDrawingStyle: { type: String, default: DEFAULT_LINE_DRAWING_STYLE },
});

const emit = defineEmits([
  'update:diffuseGain',
  'update:unsharpAmount',
  'update:exposure',
  'update:specularExponent',
  'update:specularIntensity',
  'update:dualLinked',
  'update:ridgeThreshold',
  'update:valleyThreshold',
  'update:lineWidth',
  'update:lineOutline',
  'update:lineHatch',
  'update:lineDrawingStyle',
  'reset',
  'update:expanded',
]);

const desktopClass = computed(() => [
  'absolute right-4 z-40 w-64 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl p-4',
  props.stackBelowWhiteBalance ? 'top-52' : 'top-4',
].join(' '));

const gainLimits = DIFFUSE_GAIN_LIMITS;
const unsharpLimits = UNSHARP_LIMITS;
const exposureLimits = EXPOSURE_LIMITS;
const specIntLimits = SPECULAR_INTENSITY_LIMITS;
const specExpLimits = SPECULAR_EXPONENT_LIMITS;
const ridgeLimits = RIDGE_THRESHOLD_LIMITS;
const valleyLimits = VALLEY_THRESHOLD_LIMITS;
const lineWidthLimits = LINE_WIDTH_LIMITS;
const outlineLimits = LINE_OUTLINE_LIMITS;
const hatchLimits = LINE_HATCH_LIMITS;
const styleOptions: { id: LineDrawingStyle; label: string }[] = [
  { id: LINE_DRAWING_STYLE_CONTOUR, label: 'Contour' },
  { id: LINE_DRAWING_STYLE_SKETCH, label: 'Sketch' },
];

function emitNumber(
  event: 'update:diffuseGain' | 'update:unsharpAmount' | 'update:exposure' | 'update:specularExponent' | 'update:specularIntensity' | 'update:ridgeThreshold' | 'update:valleyThreshold' | 'update:lineWidth' | 'update:lineOutline' | 'update:lineHatch',
  e: Event,
) {
  const target = e.target as HTMLInputElement;
  emit(event, parseFloat(target.value));
}
</script>
