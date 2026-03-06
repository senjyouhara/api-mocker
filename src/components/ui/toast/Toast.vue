<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const props = defineProps<{
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
}>();

const emit = defineEmits<{
  close: [];
}>();

const classes = computed(() =>
  cn(
    'pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-lg transition-all',
    props.variant === 'destructive'
      ? 'border-destructive bg-destructive text-destructive-foreground'
      : 'border-border bg-background text-foreground',
  ),
);
</script>

<template>
  <div :class="classes">
    <div class="flex-1">
      <div v-if="title" class="text-sm font-semibold">{{ title }}</div>
      <div class="text-sm opacity-90">{{ description }}</div>
    </div>
    <button class="rounded-md p-1 opacity-70 hover:opacity-100" @click="emit('close')">
      <x :size="14" />
    </button>
  </div>
</template>
