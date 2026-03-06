<script setup lang="ts">
import { computed } from 'vue';
import { DialogContent, DialogOverlay, DialogPortal } from 'reka-ui';
import { X } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
}>();

const contentClass = computed(() =>
  cn(
    'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-card text-card-foreground p-6 shadow-lg duration-200 sm:rounded-lg',
    props.class,
  ),
);
</script>

<template>
  <dialog-portal>
    <dialog-overlay class="fixed inset-0 z-50 bg-black/50" />
    <dialog-content :class="contentClass">
      <slot ></slot>
    </dialog-content>
  </dialog-portal>
</template>
