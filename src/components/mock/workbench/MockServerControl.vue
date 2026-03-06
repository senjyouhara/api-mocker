<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Play, Square, Server, Settings } from 'lucide-vue-next';
import { useMockServerStore } from '@/stores/mock/server';
import { useSettingsStore } from '@/stores/mock/settings';
import { Button as UiButton } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogHeader as UiDialogHeader,
} from '@/components/ui/dialog';

const serverStore = useMockServerStore();
const settingsStore = useSettingsStore();

// 设置对话框
const showSettings = ref(false);
const tempPort = ref(settingsStore.mockServerPort);

// 打开设置
const openSettings = () => {
  tempPort.value = settingsStore.mockServerPort;
  showSettings.value = true;
};

// 保存设置
const saveSettings = () => {
  const port = Number(tempPort.value);
  if (port >= 1024 && port <= 65535) {
    settingsStore.setMockServerPort(port);
    showSettings.value = false;
  }
};

// 启动服务器
const handleStart = async () => {
  try {
    await serverStore.start(settingsStore.mockServerPort);
  } catch (e) {
    console.error('启动失败:', e);
  }
};

// 停止服务器
const handleStop = async () => {
  try {
    await serverStore.stop();
  } catch (e) {
    console.error('停止失败:', e);
  }
};

onMounted(() => {
  serverStore.fetchStatus();
});
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
    <server :size="16" class="text-muted-foreground" />
    <span class="text-sm font-medium">Mock 服务器</span>

    <div class="flex-1"></div>

    <!-- 状态显示 -->
    <div v-if="serverStore.running" class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
      <span class="text-xs text-muted-foreground"> 运行中: {{ serverStore.serverUrl }} </span>
    </div>
    <div v-else class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-muted-foreground"></span>
      <span class="text-xs text-muted-foreground"
      >已停止 (端口: {{ settingsStore.mockServerPort }})</span
      >
    </div>

    <!-- 设置按钮 -->
    <ui-button
      size="sm"
      variant="ghost"
      :disabled="serverStore.running"
      @click="openSettings">
      <settings :size="14" />
    </ui-button>

    <!-- 控制按钮 -->
    <ui-button
      v-if="!serverStore.running"
      size="sm"
      variant="default"
      :disabled="serverStore.loading"
      @click="handleStart"
    >
      <play :size="14" />
      启动
    </ui-button>

    <template v-else>
      <ui-button
        size="sm"
        variant="destructive"
        :disabled="serverStore.loading"
        @click="handleStop"
      >
        <square :size="14" />
        停止
      </ui-button>
    </template>

    <!-- 设置对话框 -->
    <ui-dialog v-model:open="showSettings">
      <ui-dialog-content class="w-80">
        <ui-dialog-header>
          <h3 class="font-bold text-lg">服务器设置</h3>
        </ui-dialog-header>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium">端口号</label>
            <ui-input
              v-model="tempPort"
              type="number"
              min="1024"
              max="65535"
              class="mt-1" />
            <p class="text-xs text-muted-foreground mt-1">有效范围: 1024 - 65535</p>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <ui-button variant="outline" @click="showSettings = false">取消</ui-button>
          <ui-button @click="saveSettings">保存</ui-button>
        </div>
      </ui-dialog-content>
    </ui-dialog>
  </div>
</template>
