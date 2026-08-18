<template>
  <span class="relative inline-flex size-4 shrink-0">
    <input
      type="checkbox"
      class="peer absolute -inset-x-3 -inset-y-2 z-10 cursor-pointer opacity-0 outline-none disabled:cursor-not-allowed"
      :checked="checked"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @change="emit('update:checked', ($event.target as HTMLInputElement).checked)"
    />
    <span
      class="pointer-events-none flex size-4 items-center justify-center rounded-[4px] border border-white/20 bg-white/[0.14] text-white transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-focus-visible:border-blue-400 peer-focus-visible:ring-[3px] peer-focus-visible:ring-blue-500/50 peer-disabled:opacity-50"
      aria-hidden="true"
    >
      <CheckIcon v-if="checked" class="size-3.5" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { Check as CheckIcon } from '@lucide/vue';

defineProps({
  checked: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: undefined },
});

const emit = defineEmits<{
  'update:checked': [value: boolean];
}>();
</script>
