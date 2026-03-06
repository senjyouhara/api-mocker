<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus, Trash2, FileUp, Type } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import type { FormDataItem } from '@/stores/mock/request';

const props = withDefaults(
  defineProps<{
    modelValue: FormDataItem[];
    keyPlaceholder?: string;
    valuePlaceholder?: string;
  }>(),
  {
    keyPlaceholder: '字段名',
    valuePlaceholder: '字段值',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: FormDataItem[]];
}>();

// 生成唯一 ID
const generateId = () => `fd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// 本地数据
const items = ref<FormDataItem[]>([...props.modelValue]);

// 文件输入引用
const fileInputRefs = ref<Record<string, HTMLInputElement | null>>({});

// 同步外部数据
watch(
  () => props.modelValue,
  (newVal) => {
    items.value = [...newVal];
  },
  { deep: true }
);

// 同步到父组件
const syncToParent = () => {
  emit('update:modelValue', [...items.value]);
};

// 添加新行
const addRow = () => {
  items.value.push({
    id: generateId(),
    key: '',
    value: '',
    type: 'text',
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
const updateRow = (id: string, field: keyof FormDataItem, value: any) => {
  const item = items.value.find((i) => i.id === id);
  if (item) {
    (item as any)[field] = value;
    // 切换类型时清空值
    if (field === 'type') {
      item.value = '';
      item.file = undefined;
    }
    syncToParent();
  }
};

// 处理文件选择
const handleFileSelect = (id: string, event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const item = items.value.find((i) => i.id === id);
  if (item && file) {
    item.file = file;
    item.value = file.name;
    syncToParent();
  }
};

// 触发文件选择
const triggerFileSelect = (id: string) => {
  fileInputRefs.value[id]?.click();
};

// 初始化时如果为空，添加一行
if (items.value.length === 0) {
  addRow();
}
</script>

<template>
  <div class="w-full h-full">
    <!-- 表头 -->
    <div
      class="flex items-center gap-2 px-2 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground font-medium"
    >
      <div class="w-8 text-center">启用</div>
      <div class="w-20">类型</div>
      <div class="flex-1">{{ keyPlaceholder }}</div>
      <div class="flex-1">{{ valuePlaceholder }}</div>
      <div class="w-8"></div>
    </div>

    <!-- 数据行 -->
    <div class="max-h-60 overflow-y-auto overflow-x-visible">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-2 px-2 py-1 border-b border-border/50 hover:bg-muted/30 group"
      >
        <!-- 启用复选框 -->
        <div class="w-8 flex justify-center">
          <Checkbox
            :model-value="item.enabled"
            @update:model-value="updateRow(item.id, 'enabled', $event)"
          />
        </div>

        <!-- 类型选择 -->
        <div class="w-20 flex items-center">
          <Select
            :model-value="item.type"
            @update:model-value="updateRow(item.id, 'type', $event)"
            class="flex w-full items-center h-7 text-xs"
          >
            <option value="text">Text</option>
            <option value="file">File</option>
          </Select>
        </div>

        <!-- Key 输入 -->
        <Input
          type="text"
          :model-value="item.key"
          :placeholder="keyPlaceholder"
          class="flex-1 h-7 bg-transparent border-transparent focus:border-primary"
          @update:model-value="updateRow(item.id, 'key', $event)"
        />

        <!-- Value 输入 (文本类型) -->
        <Input
          v-if="item.type === 'text'"
          type="text"
          :model-value="item.value"
          :placeholder="valuePlaceholder"
          class="flex-1 h-7 bg-transparent border-transparent focus:border-primary"
          @update:model-value="updateRow(item.id, 'value', $event)"
        />

        <!-- 文件选择 (文件类型) -->
        <div v-else class="flex-1 flex items-center gap-1">
          <input
            :ref="(el) => (fileInputRefs[item.id] = el as HTMLInputElement)"
            type="file"
            class="hidden"
            @change="handleFileSelect(item.id, $event)"
          />
          <Button
            variant="outline"
            size="sm"
            class="h-7 text-xs"
            @click="triggerFileSelect(item.id)"
          >
            <FileUp :size="12" />
            选择文件
          </Button>
          <span v-if="item.file" class="text-xs text-muted-foreground truncate max-w-32">
            {{ item.file.name }}
          </span>
          <span v-else class="text-xs text-muted-foreground"> 未选择文件 </span>
        </div>

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
