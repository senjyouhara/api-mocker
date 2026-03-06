import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useMockRuleStore } from './rule';

export interface MockServerStatus {
  running: boolean;
  port: number;
}

export const useMockServerStore = defineStore(
  'mockServer',
  () => {
    const running = ref(false);
    const port = ref(0);
    const configPort = ref(3001); // 用户配置的端口
    const loading = ref(false);
    const error = ref<string | null>(null);

    const ruleStore = useMockRuleStore();

    // 服务器地址
    const serverUrl = computed(() => {
      return running.value ? `http://127.0.0.1:${port.value}` : '';
    });

    // 启动服务器
    const start = async (targetPort?: number) => {
      if (running.value) return;

      loading.value = true;
      error.value = null;

      try {
        // 先同步规则到后端
        await syncRules();

        const actualPort = await invoke<number>('start_mock_server', {
          port: targetPort ?? configPort.value,
        });

        running.value = true;
        port.value = actualPort;
      } catch (e: any) {
        error.value = e.message || String(e);
        throw e;
      } finally {
        loading.value = false;
      }
    };

    // 停止服务器
    const stop = async () => {
      if (!running.value) return;

      loading.value = true;
      error.value = null;

      try {
        await invoke('stop_mock_server');
        running.value = false;
        port.value = 0;
      } catch (e: any) {
        error.value = e.message || String(e);
        throw e;
      } finally {
        loading.value = false;
      }
    };

    // 同步规则到后端
    const syncRules = async () => {
      const rules = ruleStore.rules.map((r) => ({
        id: r.id,
        method: r.method || 'GET',
        path: r.path || '/',
        status_code: r.statusCode,
        headers: r.headers,
        body: r.body,
        delay_ms: r.delay,
        active: r.active,
      }));

      await invoke('update_mock_rules', { rules });
    };

    // 获取服务器状态
    const fetchStatus = async () => {
      try {
        const status = await invoke<MockServerStatus>('get_mock_server_status');
        running.value = status.running;
        port.value = status.port;
      } catch (e: any) {
        error.value = e.message || String(e);
      }
    };

    return {
      running,
      port,
      configPort,
      loading,
      error,
      serverUrl,
      start,
      stop,
      syncRules,
      fetchStatus,
    };
  },
  {
    persist: {
      key: 'mock-server-config',
      pick: ['configPort'],
    },
  },
);
