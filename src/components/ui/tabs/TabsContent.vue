<script setup lang="ts">
import { computed } from 'vue';
import { TabsContent } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
  value: string;
}>();

const classes = computed(() =>
  cn(
    'h-full mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    props.class,
  ),
);
</script>

<template>
  <tabs-content :class="classes" :value="value">
    <slot ></slot>
  </tabs-content>
</template>
