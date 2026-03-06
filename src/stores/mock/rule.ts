import { defineStore } from 'pinia';
import { ref, computed, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { MockRule, HttpMethod } from '@/types/mock';
import { parseMockTemplate } from '@/utils/mockjs';
import { useCollectionStore } from '@/stores/mock/collection';

export const useMockRuleStore = defineStore(
  'mockRule',
  () => {
    // 所有 Mock 规则
    const rules = ref<MockRule[]>([]);

    // 同步规则到后端（内部方法）
    const syncToServer = async () => {
      const collectionStore = useCollectionStore();

      // 只同步激活的规则
      const activeRules = rules.value.filter((r) => r.active);
      const mappedRules = activeRules.map((r) => {
        // 从 endpoint 获取 method 和 path
        const endpoint = collectionStore.endpoints.find((e) => e.id === r.endpointId);
        const method = endpoint?.method || 'GET';
        const path = endpoint?.path || '/';

        return {
          id: r.id,
          method,
          path,
          status_code: r.statusCode || 200,
          headers: r.headers || {},
          body: r.body || '', // 保持原始模板
          delay_ms: r.delay || 0,
          active: r.active,
        };
      });

      console.log('准备同步规则:', mappedRules);

      try {
        await invoke('update_mock_rules', { rules: mappedRules });
        console.log('规则已同步到服务器:', mappedRules.length, '条');
      } catch (e) {
        console.error('同步规则失败:', e);
      }
    };

    // 监听规则变化，自动同步（使用 getter 函数确保深度监听生效）
    watch(
      rules,
      () => {
        console.log('watch 触发，准备同步');
        syncToServer();
      },
      { deep: true },
    );

    // 根据接口 ID 获取规则列表
    const getRulesByEndpoint = (endpointId: string) => {
      return computed(() =>
        rules.value.filter((r) => r.endpointId === endpointId).sort((a, b) => a.order - b.order),
      );
    };

    // 获取接口的激活规则
    const getActiveRule = (endpointId: string) => {
      return rules.value.find((r) => r.endpointId === endpointId && r.active);
    };

    // 添加规则
    const addRule = (
      endpointId: string,
      name: string = '默认规则',
      method: HttpMethod = 'GET',
      path: string = '/',
    ) => {
      const rule: MockRule = {
        id: crypto.randomUUID(),
        endpointId,
        name,
        method,
        path,
        active: rules.value.filter((r) => r.endpointId === endpointId).length === 0,
        delay: 0,
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        bodyType: 'json',
        body: '{\n  "code": 0,\n  "message": "success",\n  "data": null\n}',
        order: rules.value.filter((r) => r.endpointId === endpointId).length,
      };
      rules.value.push(rule);
      return rule;
    };

    // 更新规则
    const updateRule = (id: string, updates: Partial<Omit<MockRule, 'id' | 'endpointId'>>) => {
      const rule = rules.value.find((r) => r.id === id);
      if (rule) {
        Object.assign(rule, updates);
        syncToServer();
      }
    };

    // 删除规则
    const deleteRule = (id: string) => {
      const index = rules.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        rules.value.splice(index, 1);
        syncToServer();
      }
    };

    // 设置激活规则（同一接口只能有一个激活）
    const setActiveRule = (id: string) => {
      const rule = rules.value.find((r) => r.id === id);
      if (!rule) return;

      // 先禁用该接口的所有规则
      rules.value
        .filter((r) => r.endpointId === rule.endpointId)
        .forEach((r) => (r.active = false));

      // 激活指定规则
      rule.active = true;
      syncToServer();
    };

    // 删除接口的所有规则
    const deleteRulesByEndpoint = (endpointId: string) => {
      rules.value = rules.value.filter((r) => r.endpointId !== endpointId);
      syncToServer();
    };

    // 根据 endpointId 匹配激活的 Mock 规则
    const matchRule = (endpointId: string): MockRule | null => {
      return rules.value.find((r) => r.endpointId === endpointId && r.active) || null;
    };

    // 初始化时同步规则到服务器（延迟执行，等待持久化恢复）
    setTimeout(() => {
      if (rules.value.length > 0) {
        syncToServer();
      }
    }, 500);

    return {
      rules,
      getRulesByEndpoint,
      getActiveRule,
      addRule,
      updateRule,
      deleteRule,
      setActiveRule,
      deleteRulesByEndpoint,
      matchRule,
      syncToServer,
    };
  },
  {
    persist: {
      key: 'mock-rules',
      pick: ['rules'],
    },
  },
);
