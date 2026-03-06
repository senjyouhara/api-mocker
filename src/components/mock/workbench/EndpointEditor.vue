<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { Save, AlertCircle } from 'lucide-vue-next';
import { useCollectionStore } from '@/stores/mock/collection';
import { useRequestStore } from '@/stores/mock/request';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HttpMethod } from '@/types/mock';

const collectionStore = useCollectionStore();
const requestStore = useRequestStore();

// URL 重复错误提示
const urlError = ref('');

// HTTP 方法列表
const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

// 本地编辑状态
const localName = ref('');
const localMethod = ref<HttpMethod>('GET');
const localPath = ref('');
const localDescription = ref('');

// 当前接口
const currentEndpoint = computed(() => collectionStore.activeEndpoint);

// 监听接口切换，同步数据
watch(
  () => currentEndpoint.value,
  (endpoint) => {
    if (endpoint) {
      localName.value = endpoint.name;
      localMethod.value = endpoint.method;
      localPath.value = endpoint.path;
      localDescription.value = endpoint.description || '';
      urlError.value = '';
    }
  },
  { immediate: true }
);

// 监听 method 或 path 变化，清除错误提示
watch([localMethod, localPath], () => {
  urlError.value = '';
});

// 校验 URL 唯一性
const validateUrl = () => {
  if (!currentEndpoint.value) return;
  const path = localPath.value.trim();
  const duplicate = collectionStore.getDuplicateEndpoint(
    localMethod.value,
    path,
    currentEndpoint.value.id
  );
  if (duplicate) {
    const groupPath = collectionStore.getGroupFullPath(duplicate.groupId);
    urlError.value = `URL 已存在：${groupPath}/${duplicate.name} (${duplicate.method} ${duplicate.path || '空路径'})`;
  }
};

// 保存修改
const saveChanges = () => {
  if (!currentEndpoint.value) return;

  // 校验 URL 唯一性（method + path 组合）
  const path = localPath.value.trim();
  const duplicate = collectionStore.getDuplicateEndpoint(
    localMethod.value,
    path,
    currentEndpoint.value.id
  );
  if (duplicate) {
    const groupPath = collectionStore.getGroupFullPath(duplicate.groupId);
    urlError.value = `URL 已存在：${groupPath}/${duplicate.name} (${duplicate.method} ${duplicate.path || '空路径'})`;
    return;
  }

  urlError.value = '';
  collectionStore.updateEndpoint(currentEndpoint.value.id, {
    name: localName.value,
    method: localMethod.value,
    path: path,
    description: localDescription.value || undefined,
  });

  // 同步到请求面板
  requestStore.method = localMethod.value;
  requestStore.url = path;
};

// 方法颜色
const methodColors: Record<HttpMethod, string> = {
  GET: 'text-green-500',
  POST: 'text-yellow-500',
  PUT: 'text-blue-500',
  DELETE: 'text-red-500',
  PATCH: 'text-purple-500',
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 无接口选中 -->
    <div
      v-if="!currentEndpoint"
      class="flex-1 flex items-center justify-center text-muted-foreground text-sm"
    >
      请先选择一个接口
    </div>

    <!-- 编辑表单 -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- 接口名称 -->
      <div class="space-y-1">
        <label class="text-sm text-muted-foreground">接口名称</label>
        <Input v-model="localName" placeholder="接口名称" />
      </div>

      <!-- 方法和路径 -->
      <div class="space-y-1">
        <label class="text-sm text-muted-foreground">请求方法 & 路径</label>
        <div class="flex gap-2">
          <select
            v-model="localMethod"
            class="h-9 w-28 px-2 rounded-md bg-muted border border-input text-sm font-mono font-semibold"
            :class="methodColors[localMethod]"
            @change="validateUrl"
          >
            <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
          </select>
          <Input
            v-model="localPath"
            placeholder="/api/example"
            class="flex-1 font-mono"
            @blur="validateUrl"
          />
        </div>
        <!-- URL 重复错误提示 -->
        <div v-if="urlError" class="flex items-center gap-1 text-destructive text-xs mt-1">
          <AlertCircle :size="12" />
          <span>{{ urlError }}</span>
        </div>
      </div>

      <!-- 描述 -->
      <div class="space-y-1">
        <label class="text-sm text-muted-foreground">描述（可选）</label>
        <textarea
          v-model="localDescription"
          placeholder="接口描述..."
          class="w-full h-24 p-3 rounded-md bg-muted border border-input text-sm resize-none outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <!-- 保存按钮 -->
      <Button class="w-full" @click="saveChanges">
        <Save :size="14" />
        保存修改
      </Button>
    </div>
  </div>
</template>
