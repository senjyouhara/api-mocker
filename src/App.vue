<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from './stores/app';
import { Toaster } from '@/components/ui/toast';
import { parseMockTemplate } from '@/utils/mockjs';

const store = useAppStore();

let unlisten: UnlistenFn | null = null;

onMounted(async () => {
  // 监听 Mock 请求事件
  unlisten = await listen('mock-request', async (event) => {
    const { rule_id, template } = event.payload as { rule_id: string; template: string };
    try {
      const processedBody = parseMockTemplate(template);
      await invoke('update_rule_body', { ruleId: rule_id, body: processedBody });
    } catch (e) {
      // 解析失败时返回错误 JSON
      const errorBody = JSON.stringify({
        error: 'Mock 模板解析失败',
        message: (e as Error).message,
      });
      await invoke('update_rule_body', { ruleId: rule_id, body: errorBody });
    }
  });
});

onUnmounted(() => {
  if (unlisten) {
    unlisten();
  }
});
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-background text-foreground">
    <router-view />
    <Toaster />
  </div>
</template>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background-color: hsl(var(--background));
}

::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted));
  border-radius: 9999px;
  transition: background-color 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground));
}

.prose {
  max-width: none;
}

.prose h1 {
  margin-bottom: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
