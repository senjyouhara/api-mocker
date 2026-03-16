<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Bot } from 'lucide-vue-next';
import IconBar from '@/components/mock/sidebar/IconBar.vue';
import CollectionTree from '@/components/mock/sidebar/CollectionTree.vue';
import ImportExport from '@/components/mock/ImportExport.vue';
import HistorySidebar from '@/components/mock/sidebar/HistorySidebar.vue';
import SettingsSidebar from '@/components/mock/sidebar/SettingsSidebar.vue';
import AiChatDialog from '@/components/mock/AiChatDialog.vue';
import { useMockServerStore } from '@/stores/mock/server';
import { useEnvStore } from '@/stores/mock/env';
import { useSettingsStore } from '@/stores/mock/settings';
import { useCollectionStore } from '@/stores/mock/collection';
import { useRequestStore } from '@/stores/mock/request';

const serverStore = useMockServerStore();
const envStore = useEnvStore();
const settingsStore = useSettingsStore();
const collectionStore = useCollectionStore();
const requestStore = useRequestStore();

// 侧边栏宽度
const sidebarWidth = ref(240);
const isResizing = ref(false);
const minWidth = 200;
const maxWidth = 400;

// 当前激活的图标栏项
const activeIcon = ref('api');

// AI 聊天对话框
const showAiChat = ref(false);

// 是否显示 AI 按钮（仅在 Mock 规则面板且选中了接口时显示）
const showAiButton = computed(
  () => settingsStore.activeMainTab === 'mock' && !!collectionStore.activeEndpointId,
);

// 启动时自动启动 Mock 服务并初始化默认环境
onMounted(async () => {
  // 初始化默认环境（dev, test, prod）
  envStore.initDefaultEnvironments();

  // 恢复上次选中的接口
  if (collectionStore.activeEndpointId) {
    const endpoint = collectionStore.activeEndpoint;
    if (endpoint) {
      await requestStore.loadFromEndpoint(endpoint);
    }
  }

  if (!serverStore.running) {
    try {
      await serverStore.start();
    } catch (e) {
      console.error('自动启动 Mock 服务失败:', e);
    }
  }
});

// 拖拽调整侧边栏宽度
const startResize = (e: MouseEvent) => {
  isResizing.value = true;
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
};

const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return;
  const newWidth = e.clientX - 48;
  sidebarWidth.value = Math.min(maxWidth, Math.max(minWidth, newWidth));
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
};
</script>

<template>
  <div class="flex h-screen bg-background text-foreground">
    <!-- 图标栏 -->
    <icon-bar v-model="activeIcon" />

    <!-- 侧边栏 -->
    <div
      class="relative flex-shrink-0 bg-card border-r border-border"
      :style="{ width: `${sidebarWidth}px` }"
    >
      <collection-tree v-if="activeIcon === 'api'" />
      <history-sidebar v-else-if="activeIcon === 'history'" />
      <settings-sidebar v-else-if="activeIcon === 'settings'" />
      <import-export v-else-if="activeIcon === 'import'" />

      <!-- 拖拽调整手柄 -->
      <div
        class="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50"
        :class="{ 'bg-primary': isResizing }"
        @mousedown="startResize"
      ></div>
    </div>

    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col overflow-hidden bg-background">
      <router-view />
    </div>

    <!-- AI 悬浮按钮 -->
    <transition name="fade">
      <button
        v-if="showAiButton"
        class="fixed bottom-4 left-20 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-40"
        title="AI 助手"
        @click="showAiChat = !showAiChat"
      >
        <bot :size="20" />
      </button>
    </transition>

    <!-- AI 聊天对话框 -->
    <ai-chat-dialog v-model:open="showAiChat" />
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
