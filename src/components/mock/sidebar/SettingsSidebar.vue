<script setup lang="ts">
import { ref } from 'vue';
import { Settings, Server, Bot, Eye, EyeOff } from 'lucide-vue-next';
import { useMockServerStore } from '@/stores/mock/server';
import { useSettingsStore } from '@/stores/mock/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const serverStore = useMockServerStore();
const settingsStore = useSettingsStore();

// 密钥显示状态
const showApiKey = ref(false);

// 重启服务器
const restartServer = async () => {
  if (serverStore.running) {
    await serverStore.stop();
  }
  await serverStore.start();
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 头部 -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border">
      <Settings :size="16" class="text-muted-foreground" />
      <span class="text-sm font-medium">设置</span>
    </div>

    <!-- 设置内容 -->
    <div class="flex-1 overflow-y-auto p-3 space-y-4">
      <!-- AI API 设置 -->
      <div class="space-y-3">
        <div class="flex items-center gap-2 text-sm font-medium text-foreground">
          <Bot :size="14" />
          AI API (OpenAI 兼容)
        </div>

        <!-- Base URL -->
        <div class="space-y-1.5">
          <label class="text-xs text-muted-foreground">Base URL</label>
          <Input
            :model-value="settingsStore.apiConfig.baseUrl"
            placeholder="https://api.deepseek.com"
            class="h-8 font-mono text-sm"
            @update:model-value="settingsStore.updateApiConfig({ baseUrl: $event })"
          />
        </div>

        <!-- API Key -->
        <div class="space-y-1.5">
          <label class="text-xs text-muted-foreground">API Key</label>
          <div class="relative">
            <Input
              :model-value="settingsStore.apiConfig.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="sk-..."
              class="h-8 font-mono text-sm pr-9"
              @update:model-value="settingsStore.updateApiConfig({ apiKey: $event })"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              @click="showApiKey = !showApiKey"
            >
              <Eye v-if="showApiKey" :size="14" />
              <EyeOff v-else :size="14" />
            </button>
          </div>
        </div>

        <!-- Model -->
        <div class="space-y-1.5">
          <label class="text-xs text-muted-foreground">模型</label>
          <Input
            :model-value="settingsStore.apiConfig.model"
            placeholder="deepseek-chat"
            class="h-8 font-mono text-sm"
            @update:model-value="settingsStore.updateApiConfig({ model: $event })"
          />
        </div>

        <p class="text-xs text-muted-foreground">
          支持 DeepSeek、OpenAI、Moonshot 等兼容 OpenAI 规范的 API
        </p>
      </div>
    </div>
  </div>
</template>
