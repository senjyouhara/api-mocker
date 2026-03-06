<script setup lang="ts">
import { computed } from 'vue';
import { LabelRoot } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
}>();

const classes = computed(() =>
  cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    props.class,
  ),
);
</script>

<template>
  <label-root :class="classes">
    <slot ></slot>
  </label-root>
</template>
