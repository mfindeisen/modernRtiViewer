<template>
  <svg
    v-if="visible"
    ref="overlayEl"
    class="absolute inset-0 z-20 touch-none w-full h-full"
    :class="interactive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'"
    :viewBox="`0 0 ${overlaySize.w} ${overlaySize.h}`"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    @pointerdown="emit('pointerdown', $event)"
    @pointermove="emit('pointermove', $event)"
    @pointerup="emit('pointerup', $event)"
    @pointercancel="emit('pointerup', $event)"
    @wheel="emit('wheel', $event)"
  >
    <g
      v-for="shape in shapes"
      :key="shape.key"
      :class="interactionClass(shape)"
      @click.stop="emit('shape-click', shape)"
    >
      <circle
        v-if="!shape.draft && shape.annotationId && shape.kind !== 'rect'"
        :cx="shape.cx"
        :cy="shape.cy"
        :r="Math.max(shape.r, 16)"
        fill="transparent"
      />
      <rect
        v-if="!shape.draft && shape.annotationId && shape.kind === 'rect'"
        :x="shape.x - 6"
        :y="shape.y - 6"
        :width="shape.w + 12"
        :height="shape.h + 12"
        fill="transparent"
      />

      <circle
        v-if="shape.kind === 'circle'"
        :cx="shape.cx"
        :cy="shape.cy"
        :r="shape.r"
        fill="none"
        :stroke="shape.color"
        :stroke-width="selectedId === shape.annotationId ? 3 : 2"
        vector-effect="non-scaling-stroke"
        :stroke-dasharray="shape.draft ? '6 4' : undefined"
        class="pointer-events-none"
      />
      <circle
        v-else-if="shape.kind === 'point'"
        :cx="shape.cx"
        :cy="shape.cy"
        :r="shape.r"
        :fill="shape.color"
        fill-opacity="0.9"
        :stroke="shape.color"
        :stroke-width="selectedId === shape.annotationId ? 3 : 2"
        vector-effect="non-scaling-stroke"
        class="pointer-events-none"
      />
      <rect
        v-else-if="shape.kind === 'rect'"
        :x="shape.x"
        :y="shape.y"
        :width="shape.w"
        :height="shape.h"
        fill="none"
        :stroke="shape.color"
        :stroke-width="selectedId === shape.annotationId ? 3 : 2"
        vector-effect="non-scaling-stroke"
        :stroke-dasharray="shape.draft ? '6 4' : undefined"
        class="pointer-events-none"
      />

      <g v-if="shape.label" class="pointer-events-none">
        <rect
          :x="(shape.labelX ?? 0) - 6"
          :y="(shape.labelY ?? 0) - 16"
          :width="(shape.labelWidth ?? 0) + 12"
          height="22"
          rx="4"
          :fill="selectedId === shape.annotationId ? 'rgba(30, 58, 138, 0.95)' : 'rgba(15, 23, 42, 0.92)'"
          stroke="rgba(255, 255, 255, 0.15)"
          stroke-width="1"
        />
        <text
          :x="shape.labelX ?? 0"
          :y="shape.labelY ?? 0"
          fill="#f8fafc"
          font-size="11"
          font-family="system-ui, sans-serif"
          font-weight="500"
        >{{ shape.label }}</text>
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { OverlayShape } from '../types/annotations.js';

const props = defineProps<{
  visible?: boolean;
  interactive?: boolean;
  shapes?: OverlayShape[];
  overlaySize: { w: number; h: number };
  selectedId?: string | number | null;
  interactionClass: (shape: OverlayShape) => string;
}>();

const emit = defineEmits<{
  pointerdown: [event: PointerEvent];
  pointermove: [event: PointerEvent];
  pointerup: [event: PointerEvent];
  'shape-click': [shape: OverlayShape];
  wheel: [event: WheelEvent];
}>();

const overlayEl = ref(null);
defineExpose({ overlayEl });
</script>
