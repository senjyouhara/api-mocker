import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type MainTabType = 'request' | 'mock' | 'env' | 'history';

// OpenAI 兼容 API 配置
export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

// 代理服务器配置
export interface ProxyConfig {
  enabled: boolean;
  target: string;
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    // Mock 服务器端口
    const mockServerPort = ref(3456);

    // 当前激活的主 Tab
    const activeMainTab = ref<MainTabType>('request');

    // OpenAI 兼容 API 配置
    const apiConfig = ref<ApiConfig>({
      baseUrl: 'https://api.deepseek.com',
      apiKey: '',
      model: 'deepseek-chat',
    });

    // API 是否已配置
    const isApiConfigured = computed(() => {
      return apiConfig.value.baseUrl && apiConfig.value.apiKey && apiConfig.value.model;
    });

    // AI 生成的待插入内容
    const pendingInsertContent = ref<string | null>(null);

    // 设置待插入内容
    const setPendingInsertContent = (content: string | null) => {
      pendingInsertContent.value = content;
    };

    // 更新端口
    const setMockServerPort = (port: number) => {
      if (port >= 1024 && port <= 65535) {
        mockServerPort.value = port;
      }
    };

    // 更新 API 配置
    const updateApiConfig = (config: Partial<ApiConfig>) => {
      apiConfig.value = { ...apiConfig.value, ...config };
    };

    // 代理服务器配置
    const proxyConfig = ref<ProxyConfig>({
      enabled: false,
      target: '',
    });

    // 更新代理配置
    const updateProxyConfig = (config: Partial<ProxyConfig>) => {
      Object.assign(proxyConfig.value, config);
    };

    // 获取当前生效的代理地址（启用时返回地址，否则返回 undefined）
    const activeProxy = computed(() => {
      return proxyConfig.value.enabled && proxyConfig.value.target
        ? proxyConfig.value.target
        : undefined;
    });

    return {
      mockServerPort,
      activeMainTab,
      apiConfig,
      isApiConfigured,
      pendingInsertContent,
      proxyConfig,
      activeProxy,
      setMockServerPort,
      updateApiConfig,
      updateProxyConfig,
      setPendingInsertContent,
    };
  },
  {
    persist: {
      key: 'mock-settings',
      pick: ['mockServerPort', 'activeMainTab', 'apiConfig', 'proxyConfig'],
    },
  },
);
