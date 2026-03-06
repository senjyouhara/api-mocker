<script setup lang="ts">
import { computed } from 'vue';
import { TabsList } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
}>();

const classes = computed(() =>
  cn(
    'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
    props.class,
  ),
);
</script>

<template>
  <tabs-list :class="classes">
    <slot ></slot>
  </tabs-list>
</template>
