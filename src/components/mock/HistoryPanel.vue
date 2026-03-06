<script setup lang="ts">
import { ref, computed } from 'vue';
import { Trash2, Clock, Upload } from 'lucide-vue-next';
import { useHistoryStore } from '@/stores/mock/history';
import { useRequestStore } from '@/stores/mock/request';
import { useCollectionStore } from '@/stores/mock/collection';
import { Button } from '@/components/ui/button';
import HistoryDetailDialog from '@/components/mock/HistoryDetailDialog.vue';
import type { RequestHistory } from '@/types/mock';

const historyStore = useHistoryStore();
const requestStore = useRequestStore();
const collectionStore = useCollectionStore();

// 详情对话框
const showDetailDialog = ref(false);
const selectedHistory = ref<RequestHistory | null>(null);

// 当前接口的历史记录（按日期分组）
const currentHistories = computed(() => {
  return historyStore.getGroupedByEndpoint(collectionStore.activeEndpointId).value;
});

// 当前接口的历史记录数量
const currentCount = computed(() => {
  return historyStore.getCountByEndpoint(collectionStore.activeEndpointId);
});

// 查看详情
const viewDetail = (history: RequestHistory) => {
  selectedHistory.value = history;
  showDetailDialog.value = true;
};

// HTTP 方法颜色
const methodColors: Record<string, string> = {
  GET: 'text-green-500',
  POST: 'text-yellow-500',
  PUT: 'text-blue-500',
  DELETE: 'text-red-500',
  PATCH: 'text-purple-500',
};

// 加载历史记录到请求面板
const loadHistory = (history: RequestHistory) => {
  requestStore.method = history.method;
  requestStore.url = history.url;
  requestStore.response = history.response || null;
};

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-border">
      <div class="flex items-center gap-2 text-sm font-medium">
        <Clock :size="14" />
        请求历史
        <span v-if="collectionStore.activeEndpointId" class="text-xs text-muted-foreground">
          (当前接口)
        </span>
      </div>
      <Button
        v-if="currentCount > 0"
        size="sm"
        variant="ghost"
        class="text-muted-foreground"
        @click="historyStore.clearHistories"
      >
        清空
      </Button>
    </div>

    <!-- 历史列表 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 空状态 -->
      <div v-if="currentCount === 0" class="text-center text-muted-foreground text-sm py-8">
        {{ collectionStore.activeEndpointId ? '当前接口暂无请求历史' : '暂无请求历史' }}
      </div>

      <!-- 分组列表 -->
      <template v-else>
        <div v-for="(items, date) in currentHistories" :key="date">
          <div class="px-3 py-1.5 text-xs text-muted-foreground bg-muted/50">
            {{ date }}
          </div>
          <div
            v-for="item in items"
            :key="item.id"
            class="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer group"
            @click="viewDetail(item)"
          >
            <span class="text-xs font-mono font-semibold w-12" :class="methodColors[item.method]">
              {{ item.method }}
            </span>
            <span class="flex-1 text-sm truncate">{{ item.url }}</span>
            <span class="text-xs text-muted-foreground">{{ formatTime(item.createdAt) }}</span>
            <button
              class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent"
              title="加载到请求面板"
              @click.stop="loadHistory(item)"
            >
              <Upload :size="12" class="text-muted-foreground" />
            </button>
            <button
              class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent"
              title="删除"
              @click.stop="historyStore.deleteHistory(item.id)"
            >
              <Trash2 :size="12" class="text-muted-foreground" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- 详情对话框 -->
    <HistoryDetailDialog v-model:open="showDetailDialog" :history="selectedHistory" />
  </div>
</template>
