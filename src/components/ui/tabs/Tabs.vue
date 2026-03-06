<script setup lang="ts">
import { TabsRoot } from 'reka-ui';

const props = defineProps<{
  defaultValue?: string;
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <tabs-root
    :default-value="defaultValue"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <slot ></slot>
  </tabs-root>
</template>
