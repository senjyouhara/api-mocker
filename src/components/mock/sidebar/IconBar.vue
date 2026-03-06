<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FolderOpen, History, Settings, Download, Sun, Moon } from 'lucide-vue-next';

const model = defineModel<string>({ default: 'api' });

const icons = [
  { id: 'api', icon: FolderOpen, label: 'API 管理' },
  { id: 'history', icon: History, label: '请求历史' },
  { id: 'settings', icon: Settings, label: '环境设置' },
  { id: 'import', icon: Download, label: '导入导出' },
];

// 主题状态
const isDark = ref(true);

// 初始化主题
onMounted(() => {
  const saved = localStorage.getItem('theme');
  isDark.value = saved !== 'light';
  applyTheme();
});

// 应用主题
const applyTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
  }
};

// 切换主题
const toggleTheme = () => {
  isDark.value = !isDark.value;
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
  applyTheme();
};
</script>

<template>
  <div class="w-12 flex-shrink-0 bg-background border-r border-border flex flex-col py-2">
    <!-- 功能图标 -->
    <button
      v-for="item in icons"
      :key="item.id"
      class="w-10 h-10 mx-auto mb-1 flex items-center justify-center rounded-md transition-colors"
      :class="
        model === item.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'
      "
      :title="item.label"
      @click="model = item.id"
    >
      <component :is="item.icon" :size="20" :stroke-width="1.5" />
    </button>

    <!-- 占位，将主题切换按钮推到底部 -->
    <div class="flex-1" />

    <!-- 主题切换按钮 -->
    <button
      class="w-10 h-10 mx-auto flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:bg-muted"
      :title="isDark ? '切换到白天模式' : '切换到黑夜模式'"
      @click="toggleTheme"
    >
      <Sun v-if="isDark" :size="20" :stroke-width="1.5" />
      <Moon v-else :size="20" :stroke-width="1.5" />
    </button>
  </div>
</template>
