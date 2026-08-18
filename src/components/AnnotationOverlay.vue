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
        :stroke-width="strokeWidthFor(shape)"
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
        :stroke-width="strokeWidthFor(shape)"
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
        :stroke-width="strokeWidthFor(shape)"
        vector-effect="non-scaling-stroke"
        :stroke-dasharray="shape.draft ? '6 4' : undefined"
        class="pointer-events-none"
      />

      <g v-if="interactive && isSelected(shape) && !shape.draft">
        <circle
          v-if="shape.kind === 'circle'"
          :cx="shape.cx + shape.r"
          :cy="shape.cy"
          r="5"
          fill="#fff"
          :stroke="shape.color"
          stroke-width="1.5"
          class="cursor-ew-resize"
          @pointerdown.stop="emit('handle-down', shape, 'radius', $event)"
        />
        <template v-else-if="shape.kind === 'rect'">
          <rect
            v-for="handle in rectHandles(shape)"
            :key="handle.id"
            :x="handle.x - 4"
            :y="handle.y - 4"
            width="8"
            height="8"
            fill="#fff"
            :stroke="shape.color"
            stroke-width="1.5"
            :class="handle.cursor"
            @pointerdown.stop="emit('handle-down', shape, handle.id, $event)"
          />
        </template>
      </g>

      <g v-if="shape.label" class="pointer-events-none">
        <rect
          :x="(shape.labelX ?? 0) - labelPadX"
          :y="(shape.labelY ?? 0) - labelBoxOffsetY"
          :width="(shape.labelWidth ?? 0) + labelPadX * 2"
          :height="shape.labelHeight ?? (labelPadY * 2 + labelLineHeight)"
          rx="4"
          :fill="isSelected(shape) ? 'rgba(30, 58, 138, 0.95)' : 'rgba(15, 23, 42, 0.92)'"
          stroke="rgba(255, 255, 255, 0.15)"
          stroke-width="1"
        />
        <text
          :x="shape.labelX ?? 0"
          :y="(shape.labelY ?? 0) - labelBoxOffsetY + labelPadY + labelLineHeight / 2"
          fill="#f8fafc"
          :font-size="labelFontSize"
          font-family="system-ui, sans-serif"
          font-weight="500"
          dominant-baseline="central"
        >
          <tspan
            v-for="(line, index) in annotationLabelLines(shape)"
            :key="index"
            :x="shape.labelX ?? 0"
            :dy="index === 0 ? 0 : labelLineHeight"
          >{{ line || '\u00a0' }}</tspan>
        </text>
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { OverlayShape } from '../types/annotations.js';
import {
  ANNOTATION_LABEL_BOX_OFFSET_Y,
  ANNOTATION_LABEL_FONT_SIZE,
  ANNOTATION_LABEL_LINE_HEIGHT,
  ANNOTATION_LABEL_PAD_X,
  ANNOTATION_LABEL_PAD_Y,
  annotationLabelLines,
} from '../types/annotations.js';
import { rectHandlePositions, type AnnotationEditHandle } from '../lib/annotationEdit.js';

const labelFontSize = ANNOTATION_LABEL_FONT_SIZE;
const labelLineHeight = ANNOTATION_LABEL_LINE_HEIGHT;
const labelPadX = ANNOTATION_LABEL_PAD_X;
const labelPadY = ANNOTATION_LABEL_PAD_Y;
const labelBoxOffsetY = ANNOTATION_LABEL_BOX_OFFSET_Y;

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
  'handle-down': [shape: OverlayShape, handle: AnnotationEditHandle, event: PointerEvent];
  wheel: [event: WheelEvent];
}>();

const overlayEl = ref(null);
defineExpose({ overlayEl });

function isSelected(shape: OverlayShape) {
  return props.selectedId != null
    && shape.annotationId != null
    && String(props.selectedId) === String(shape.annotationId);
}

function strokeWidthFor(shape: OverlayShape) {
  return isSelected(shape) ? shape.strokeWidth + 1 : shape.strokeWidth;
}

const HANDLE_CURSORS: Record<string, string> = {
  n: 'cursor-ns-resize',
  s: 'cursor-ns-resize',
  e: 'cursor-ew-resize',
  w: 'cursor-ew-resize',
  ne: 'cursor-nesw-resize',
  sw: 'cursor-nesw-resize',
  nw: 'cursor-nwse-resize',
  se: 'cursor-nwse-resize',
};

function rectHandles(shape: Extract<OverlayShape, { kind: 'rect' }>) {
  const positions = rectHandlePositions(shape);
  return (Object.keys(positions) as Array<keyof typeof positions>).map((id) => ({
    id,
    x: positions[id].x,
    y: positions[id].y,
    cursor: HANDLE_CURSORS[id],
  }));
}
</script>
