<script setup lang="ts">
import { DialogTitle } from 'reka-ui';
import { cn } from '@/lib/utils';
import { computed } from 'vue';

const props = defineProps<{
  class?: string;
}>();

const classes = computed(() =>
  cn('text-lg font-semibold leading-none tracking-tight text-foreground', props.class),
);
</script>

<template>
  <dialog-title :class="classes">
    <slot ></slot>
  </dialog-title>
</template>
