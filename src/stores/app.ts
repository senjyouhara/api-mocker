import { defineStore } from 'pinia';
import { ref } from 'vue';

// 用户设置类型
interface UserSettings {
  language: 'zh-CN' | 'en-US';
  notifications: boolean;
  compactMode: boolean;
}

export const useAppStore = defineStore(
  'app',
  () => {
    // 侧边栏状态
    const isSidebarOpen = ref(true);
    const toggleSidebar = () => {
      isSidebarOpen.value = !isSidebarOpen.value;
    };

    // 主题设置
    const theme = ref<'light' | 'dark' | 'blackgold'>(
      (localStorage.getItem('theme') as 'light' | 'dark' | 'blackgold') || 'blackgold',
    );
    const toggleTheme = () => {
      theme.value = theme.value === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme.value);
      localStorage.setItem('theme', theme.value);
    };

    // 初始化主题
    const initTheme = () => {
      document.documentElement.setAttribute('data-theme', theme.value);
    };

    // 用户设置
    const userSettings = ref<UserSettings>({
      language: 'zh-CN',
      notifications: true,
      compactMode: false,
    });

    const updateUserSettings = (settings: Partial<UserSettings>) => {
      userSettings.value = { ...userSettings.value, ...settings };
    };

    return {
      // 侧边栏
      isSidebarOpen,
      toggleSidebar,

      // 主题
      theme,
      toggleTheme,
      initTheme,

      // 用户设置
      userSettings,
      updateUserSettings,
    };
  },
  {
    persist: {
      pick: ['theme', 'userSettings'],
    },
  },
);
