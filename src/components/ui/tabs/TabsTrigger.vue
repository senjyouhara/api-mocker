<script setup lang="ts">
import { computed } from 'vue';
import { TabsTrigger } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
  value: string;
  disabled?: boolean;
  variant?: 'default' | 'underline';
}>();

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';

  const variants = {
    default:
      'rounded-md px-3 py-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
    underline:
      'px-4 py-2 border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary',
  };

  return cn(base, variants[props.variant ?? 'default'], props.class);
});
</script>

<template>
  <tabs-trigger :class="classes" :value="value" :disabled="disabled">
    <slot ></slot>
  </tabs-trigger>
</template>
