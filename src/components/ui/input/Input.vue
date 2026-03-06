<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
  modelValue?: string | number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const classes = computed(() =>
  cn(
    'flex min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
    props.class,
  ),
);

const handleInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
};
</script>

<template>
  <input :class="classes" :value="modelValue" @input="handleInput" />
</template>
