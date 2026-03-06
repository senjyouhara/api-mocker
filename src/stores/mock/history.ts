import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  RequestHistory,
  HttpMethod,
  ResponseData,
  KeyValuePair,
  FormDataPair,
} from '@/types/mock';

export const useHistoryStore = defineStore(
  'history',
  () => {
    // 历史记录列表
    const histories = ref<RequestHistory[]>([]);

    // 最大记录数
    const maxHistories = 100;

    // 添加历史记录
    const addHistory = (data: {
      method: HttpMethod;
      url: string;
      params?: KeyValuePair[];
      headers: Record<string, string>;
      bodyType?: 'none' | 'json' | 'form' | 'raw';
      body?: string;
      formData?: FormDataPair[];
      response?: ResponseData;
      endpointId?: string;
    }) => {
      const history: RequestHistory = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: Date.now(),
      };

      // 添加到列表头部
      histories.value.unshift(history);

      // 限制最大数量
      if (histories.value.length > maxHistories) {
        histories.value = histories.value.slice(0, maxHistories);
      }

      return history;
    };

    // 删除历史记录
    const deleteHistory = (id: string) => {
      const index = histories.value.findIndex((h) => h.id === id);
      if (index !== -1) {
        histories.value.splice(index, 1);
      }
    };

    // 根据 endpointId 删除历史记录
    const deleteHistoriesByEndpoint = (endpointId: string) => {
      histories.value = histories.value.filter((h) => h.endpointId !== endpointId);
    };

    // 清空历史记录
    const clearHistories = () => {
      histories.value = [];
    };

    // 按日期分组
    const groupedHistories = computed(() => {
      const groups: Record<string, RequestHistory[]> = {};
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      histories.value.forEach((h) => {
        const date = new Date(h.createdAt).toDateString();
        let label: string;

        if (date === today) {
          label = '今天';
        } else if (date === yesterday) {
          label = '昨天';
        } else {
          label = new Date(h.createdAt).toLocaleDateString('zh-CN');
        }

        if (!groups[label]) {
          groups[label] = [];
        }
        groups[label].push(h);
      });

      return groups;
    });

    // 根据 endpointId 过滤并按日期分组
    const getGroupedByEndpoint = (endpointId: string | null) => {
      return computed(() => {
        // 未选中接口时返回空对象
        if (!endpointId) return {};

        const filtered = histories.value.filter((h) => h.endpointId === endpointId);

        const groups: Record<string, RequestHistory[]> = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        filtered.forEach((h) => {
          const date = new Date(h.createdAt).toDateString();
          let label: string;

          if (date === today) {
            label = '今天';
          } else if (date === yesterday) {
            label = '昨天';
          } else {
            label = new Date(h.createdAt).toLocaleDateString('zh-CN');
          }

          if (!groups[label]) {
            groups[label] = [];
          }
          groups[label].push(h);
        });

        return groups;
      });
    };

    // 根据 endpointId 获取历史记录数量
    const getCountByEndpoint = (endpointId: string | null) => {
      // 未选中接口时返回 0
      if (!endpointId) return 0;
      return histories.value.filter((h) => h.endpointId === endpointId).length;
    };

    return {
      histories,
      addHistory,
      deleteHistory,
      deleteHistoriesByEndpoint,
      clearHistories,
      groupedHistories,
      getGroupedByEndpoint,
      getCountByEndpoint,
    };
  },
  {
    persist: {
      key: 'mock-history',
      pick: ['histories'],
    },
  },
);
