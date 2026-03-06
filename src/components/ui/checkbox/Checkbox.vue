<script setup lang="ts">
import { computed } from 'vue';
import { CheckboxRoot, CheckboxIndicator } from 'reka-ui';
import { Check } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
  modelValue?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const classes = computed(() =>
  cn(
    'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
    props.class,
  ),
);

const handleUpdate = (value: boolean | 'indeterminate') => {
  emit('update:modelValue', value === true);
};
</script>

<template>
  <checkbox-root
    :class="classes"
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="handleUpdate"
  >
    <checkbox-indicator class="flex items-center justify-center text-current">
      <check class="h-3.5 w-3.5" />
    </checkbox-indicator>
  </checkbox-root>
</template>
