<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Clock, Trash2, ChevronUp } from 'lucide-vue-next';
import { useHistoryStore } from '@/stores/mock/history';
import { useRequestStore } from '@/stores/mock/request';
import { useSettingsStore } from '@/stores/mock/settings';
import { useCollectionStore } from '@/stores/mock/collection';
import type { RequestHistory } from '@/types/mock';

const historyStore = useHistoryStore();
const requestStore = useRequestStore();
const settingsStore = useSettingsStore();
const collectionStore = useCollectionStore();

const histories = computed(() => historyStore.histories);

// 虚拟滚动相关
const containerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(0);
const itemHeight = 72; // 每项高度约 72px

// 显示返回顶部按钮
const showBackToTop = computed(() => scrollTop.value > 200);

// 计算可见区域
const visibleRange = computed(() => {
  // 容器高度未初始化时，只显示少量项目
  if (containerHeight.value === 0) {
    return { start: 0, end: Math.min(5, histories.value.length) };
  }
  const start = Math.floor(scrollTop.value / itemHeight);
  const visibleCount = Math.ceil(containerHeight.value / itemHeight) + 2;
  const end = Math.min(start + visibleCount, histories.value.length);
  return { start: Math.max(0, start - 1), end };
});

// 可见的历史记录
const visibleHistories = computed(() => {
  const { start, end } = visibleRange.value;
  return histories.value.slice(start, end).map((item, index) => ({
    ...item,
    _index: start + index,
  }));
});

// 总高度
const totalHeight = computed(() => histories.value.length * itemHeight);

// 偏移量
const offsetY = computed(() => visibleRange.value.start * itemHeight);

// 滚动处理
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
};

// 返回顶部
const scrollToTop = () => {
  containerRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

// 监听容器大小
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight;
    resizeObserver = new ResizeObserver((entries) => {
      containerHeight.value = entries[0].contentRect.height;
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

// 点击历史记录，加载到请求面板
const loadToRequest = (history: RequestHistory) => {
  requestStore.loadFromHistory(history);
  // 设置 activeEndpointId 以便 Mock 规则回显
  if (history.endpointId) {
    collectionStore.setActiveEndpoint(history.endpointId);
  }
  settingsStore.activeMainTab = 'request';
};

// 删除单条历史记录
const deleteHistory = (e: Event, id: string) => {
  e.stopPropagation();
  historyStore.deleteHistory(id);
};

// 方法颜色
const methodColors: Record<string, string> = {
  GET: 'text-success',
  POST: 'text-warning',
  PUT: 'text-info',
  DELETE: 'text-destructive',
  PATCH: 'text-accent',
};

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 获取接口名称
const getEndpointName = (endpointId?: string) => {
  if (!endpointId) return null;
  const endpoint = collectionStore.endpoints.find((e) => e.id === endpointId);
  return endpoint?.name || null;
};
</script>

<template>
  <div class="h-full flex flex-col relative">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-border">
      <div class="flex items-center gap-2">
        <Clock :size="16" class="text-muted-foreground" />
        <span class="text-sm font-medium">请求历史</span>
        <span
          v-if="histories.length > 0"
          class="text-xs text-muted-foreground"
        >({{ histories.length }})</span
        >
      </div>
      <button
        v-if="histories.length > 0"
        class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
        title="清空历史"
        @click="historyStore.clearHistory()"
      >
        <Trash2 :size="14" />
      </button>
    </div>

    <!-- 虚拟滚动历史列表 -->
    <div ref="containerRef" class="flex-1 overflow-y-auto" @scroll="handleScroll">
      <div :style="{ height: totalHeight + 'px', position: 'relative' }">
        <div :style="{ transform: `translateY(${offsetY}px)` }">
          <div
            v-for="item in visibleHistories"
            :key="item.id"
            class="relative px-3 py-2 border-b border-border cursor-pointer hover:bg-muted group"
            :style="{ height: itemHeight + 'px' }"
            @click="loadToRequest(item)"
          >
            <!-- 左侧内容 -->
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-mono font-semibold" :class="methodColors[item.method]">
                  {{ item.method }}
                </span>
                <span
                  v-if="item.response"
                  class="text-xs px-1 rounded"
                  :class="
                    item.response.statusCode < 400
                      ? 'bg-success/20 text-success'
                      : 'bg-destructive/20 text-destructive'
                  "
                >
                  {{ item.response.statusCode }}
                </span>
                <span class="flex-1 text-xs text-right text-muted-foreground/60">{{
                  formatTime(item.createdAt)
                }}</span>
              </div>
              <div
                v-if="getEndpointName(item.endpointId)"
                class="text-xs text-foreground truncate mb-1"
              >
                {{ getEndpointName(item.endpointId) }}
              </div>
              <div class="text-xs text-muted-foreground truncate">{{ item.url }}</div>
            </div>
            <!-- 删除按钮 -->
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              title="删除"
              @click="deleteHistory($event, item.id)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- 无数据提示 -->
      <div
        v-if="histories.length === 0"
        class="flex flex-col items-center justify-center h-full text-muted-foreground"
      >
        <Clock :size="32" class="mb-2 opacity-50" />
        <p class="text-sm">暂无请求历史</p>
        <p class="text-xs mt-1">发送请求后将自动记录</p>
      </div>
    </div>

    <!-- 返回顶部按钮 -->
    <Transition name="fade">
      <button
        v-if="showBackToTop"
        class="absolute bottom-3 right-3 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        title="返回顶部"
        @click="scrollToTop"
      >
        <ChevronUp :size="16" />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
