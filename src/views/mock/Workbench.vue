<script setup lang="ts">
import RequestPanel from '@/components/mock/workbench/RequestPanel.vue';
import ResponseViewer from '@/components/mock/workbench/ResponseViewer.vue';
import MockRuleEditor from '@/components/mock/workbench/MockRuleEditor.vue';
import MockServerControl from '@/components/mock/workbench/MockServerControl.vue';
import EnvManager from '@/components/mock/EnvManager.vue';
import HistoryPanel from '@/components/mock/HistoryPanel.vue';
import { useRequestStore } from '@/stores/mock/request';
import { useSettingsStore } from '@/stores/mock/settings';

const store = useRequestStore();
const settingsStore = useSettingsStore();

// Tab 配置
const tabs = [
  { id: 'request', label: '请求调试' },
  { id: 'mock', label: 'Mock 规则' },
  { id: 'env', label: '环境变量' },
  { id: 'history', label: '历史记录' },
];
</script>

<template>
  <div class="h-full flex flex-col bg-background">
    <!-- Tab 切换栏 -->
    <div class="border-b border-border">
      <div class="flex">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :class="[
            settingsStore.activeMainTab === tab.id
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="settingsStore.activeMainTab = tab.id"
        >
          {{ tab.label }}
          <span
            v-if="settingsStore.activeMainTab === tab.id"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          ></span>
        </button>
      </div>
    </div>

    <!-- 请求调试面板 -->
    <div v-show="settingsStore.activeMainTab === 'request'" class="flex-1 min-h-0 flex flex-col">
      <div class="h-[55%] min-h-0">
        <request-panel />
      </div>
      <div class="flex-1 min-h-0">
        <response-viewer :response="store.response ?? undefined" />
      </div>
    </div>

    <!-- Mock 规则面板 -->
    <div
      v-show="settingsStore.activeMainTab === 'mock'"
      class="flex-1 min-h-0 flex flex-col overflow-hidden"
    >
      <mock-server-control />
      <div class="flex-1 min-h-0 overflow-hidden">
        <mock-rule-editor />
      </div>
    </div>

    <!-- 环境变量面板 -->
    <div v-show="settingsStore.activeMainTab === 'env'" class="flex-1 min-h-0">
      <env-manager />
    </div>

    <!-- 历史记录面板 -->
    <div v-show="settingsStore.activeMainTab === 'history'" class="flex-1 min-h-0">
      <history-panel />
    </div>
  </div>
</template>
