<template>
  <svg
    v-if="visible"
    class="absolute inset-0 z-[21] pointer-events-none w-full h-full"
    :viewBox="`0 0 ${overlaySize.w} ${overlaySize.h}`"
    preserveAspectRatio="none"
  >
    <line
      v-if="start && end"
      :x1="start.x"
      :y1="start.y"
      :x2="end.x"
      :y2="end.y"
      stroke="#38bdf8"
      stroke-width="2"
      stroke-dasharray="6 4"
      vector-effect="non-scaling-stroke"
    />
    <circle v-if="start" :cx="start.x" :cy="start.y" r="4" fill="#38bdf8" />
    <circle v-if="end" :cx="end.x" :cy="end.y" r="4" fill="#38bdf8" />
    <text
      v-if="label && end"
      :x="end.x + 8"
      :y="end.y - 8"
      fill="#e0f2fe"
      font-size="12"
      font-family="system-ui, sans-serif"
    >{{ label }}</text>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  overlaySize: { w: number; h: number };
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  label: string;
}>();
</script>
