<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus, Trash2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue: KeyValueItem[];
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    showEnabled?: boolean;
  }>(),
  {
    keyPlaceholder: 'Key',
    valuePlaceholder: 'Value',
    showEnabled: true,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: KeyValueItem[]];
}>();

// 生成唯一 ID
const generateId = () => `kv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// 本地数据
const items = ref<KeyValueItem[]>([...props.modelValue]);

// 标记是否正在同步，避免循环更新
let isSyncing = false;

// 同步外部数据
watch(
  () => props.modelValue,
  (newVal) => {
    if (isSyncing) return;
    items.value = [...newVal];
  },
  { deep: true }
);

// 同步到父组件
const syncToParent = () => {
  isSyncing = true;
  emit(
    'update:modelValue',
    items.value.map((item) => ({ ...item }))
  );
  // 下一个 tick 后重置标记
  setTimeout(() => {
    isSyncing = false;
  }, 0);
};

// 添加新行
const addRow = () => {
  items.value.push({
    id: generateId(),
    key: '',
    value: '',
    enabled: true,
  });
  syncToParent();
};

// 删除行
const removeRow = (id: string) => {
  const index = items.value.findIndex((item) => item.id === id);
  if (index > -1) {
    items.value.splice(index, 1);
    syncToParent();
  }
};

// 更新行
const updateRow = (id: string, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
  const item = items.value.find((i) => i.id === id);
  if (item) {
    (item as any)[field] = value;
    syncToParent();
  }
};

// 初始化时如果为空，添加一行
if (items.value.length === 0) {
  addRow();
}
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <!-- 表头 -->
    <div
      class="flex items-center gap-2 px-2 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground font-medium"
    >
      <div v-if="showEnabled" class="w-8 text-center">启用</div>
      <div class="flex-1">{{ keyPlaceholder }}</div>
      <div class="flex-1">{{ valuePlaceholder }}</div>
      <div class="w-8"></div>
    </div>

    <!-- 数据行 -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-2 px-2 py-1 border-b border-border/50 hover:bg-muted/30 group"
      >
        <!-- 启用复选框 -->
        <div v-if="showEnabled" class="w-8 flex justify-center">
          <Checkbox
            :model-value="item.enabled"
            @update:model-value="updateRow(item.id, 'enabled', $event)"
          />
        </div>

        <!-- Key 输入 -->
        <Input
          type="text"
          :model-value="item.key"
          :placeholder="keyPlaceholder"
          class="flex-1 h-7 bg-transparent border-transparent focus:border-primary"
          @update:model-value="updateRow(item.id, 'key', $event)"
        />

        <!-- Value 输入 -->
        <Input
          type="text"
          :model-value="item.value"
          :placeholder="valuePlaceholder"
          class="flex-1 h-7 bg-transparent border-transparent focus:border-primary"
          @update:model-value="updateRow(item.id, 'value', $event)"
        />

        <!-- 删除按钮 -->
        <Button
          variant="ghost"
          size="icon"
          class="w-8 h-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          @click="removeRow(item.id)"
        >
          <Trash2 :size="14" />
        </Button>
      </div>
    </div>

    <!-- 添加按钮 -->
    <Button
      variant="ghost"
      class="w-full h-8 text-muted-foreground hover:text-primary"
      @click="addRow"
    >
      <Plus :size="14" />
      添加
    </Button>
  </div>
</template>
