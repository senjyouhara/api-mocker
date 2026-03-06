<script setup lang="ts">
import { ref, computed, useSlots, onMounted, onUnmounted, nextTick } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const slots = useSlots();
const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref({ top: '0px', left: '0px', width: '0px' });

// 解析 slot 中的 option 元素
const options = computed(() => {
  const defaultSlot = slots.default?.();
  if (!defaultSlot) return [];

  const result: { value: string; label: string }[] = [];

  const extractOptions = (vnodes: any[]) => {
    for (const vnode of vnodes) {
      if (vnode.type === 'option') {
        result.push({
          value: vnode.props?.value ?? '',
          label: vnode.children ?? vnode.props?.value ?? '',
        });
      } else if (Array.isArray(vnode.children)) {
        extractOptions(vnode.children);
      }
    }
  };

  extractOptions(defaultSlot);
  return result;
});

// 当前选中的标签
const selectedLabel = computed(() => {
  const opt = options.value.find((o) => o.value === props.modelValue);
  return opt?.label ?? props.modelValue ?? '';
});

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value && triggerRef.value) {
    nextTick(() => {
      const rect = triggerRef.value!.getBoundingClientRect();
      dropdownStyle.value = {
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      };
    });
  }
};

const selectOption = (value: string) => {
  emit('update:modelValue', value);
  isOpen.value = false;
};

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const triggerClasses = computed(() =>
  cn(
    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
  ),
);

const containerClasses = computed(() => cn('relative', props.class));
</script>

<template>
  <div ref="selectRef" :class="containerClasses">
    <!-- 触发器 -->
    <div ref="triggerRef" :class="triggerClasses" @click="toggleOpen">
      <span class="truncate">{{ selectedLabel }}</span>
      <chevron-down
        :size="14"
        class="text-muted-foreground transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </div>

    <!-- 下拉菜单 (Teleport 到 body) -->
    <teleport to="body">
      <div
        v-if="isOpen"
        class="fixed z-[9999] rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        :style="dropdownStyle"
      >
        <div class="max-h-60 overflow-auto p-1">
          <div
            v-for="opt in options"
            :key="opt.value"
            class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            :class="{ 'bg-accent/50': opt.value === modelValue }"
            @click="selectOption(opt.value)"
          >
            {{ opt.label }}
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
