import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Environment, EnvVariable } from '@/types/mock';

export const useEnvStore = defineStore(
  'env',
  () => {
    // 环境列表
    const environments = ref<Environment[]>([]);

    // 当前激活的环境 ID
    const activeEnvId = ref<string | null>(null);

    // 当前激活的环境
    const activeEnv = computed(() => {
      if (!activeEnvId.value) return null;
      return environments.value.find((e) => e.id === activeEnvId.value) || null;
    });

    // 当前环境的变量映射（用于替换）
    const variablesMap = computed(() => {
      const map: Record<string, string> = {};
      if (!activeEnv.value) return map;
      activeEnv.value.variables
        .filter((v) => v.enabled)
        .forEach((v) => {
          map[v.key] = v.value;
        });
      return map;
    });

    // 获取 baseUrl（从环境变量中读取）
    const baseUrl = computed(() => variablesMap.value['baseUrl'] || '');

    // 添加环境
    const addEnvironment = (name: string) => {
      const env: Environment = {
        id: crypto.randomUUID(),
        name,
        variables: [],
        isActive: environments.value.length === 0,
      };
      environments.value.push(env);
      if (env.isActive) {
        activeEnvId.value = env.id;
      }
      return env;
    };

    // 删除环境
    const deleteEnvironment = (id: string) => {
      const index = environments.value.findIndex((e) => e.id === id);
      if (index !== -1) {
        environments.value.splice(index, 1);
        if (activeEnvId.value === id) {
          activeEnvId.value = environments.value[0]?.id || null;
        }
      }
    };

    // 重命名环境
    const renameEnvironment = (id: string, name: string) => {
      const env = environments.value.find((e) => e.id === id);
      if (env) {
        env.name = name;
      }
    };

    // 设置激活环境
    const setActiveEnvironment = (id: string | null) => {
      environments.value.forEach((e) => {
        e.isActive = e.id === id;
      });
      activeEnvId.value = id;
    };

    // 添加变量
    const addVariable = (envId: string, key: string = '', value: string = '') => {
      const env = environments.value.find((e) => e.id === envId);
      if (env) {
        env.variables.push({ key, value, enabled: true });
      }
    };

    // 更新变量
    const updateVariable = (envId: string, index: number, updates: Partial<EnvVariable>) => {
      const env = environments.value.find((e) => e.id === envId);
      if (env && env.variables[index]) {
        Object.assign(env.variables[index], updates);
      }
    };

    // 删除变量
    const deleteVariable = (envId: string, index: number) => {
      const env = environments.value.find((e) => e.id === envId);
      if (env) {
        env.variables.splice(index, 1);
      }
    };

    // 替换字符串中的变量 {{key}} -> value
    const replaceVariables = (str: string) => {
      return str.replace(/\{\{(\w+)\}\}/g, (_, key) => variablesMap.value[key] ?? `{{${key}}}`);
    };

    // 初始化默认环境（dev, test, prod）
    const initDefaultEnvironments = () => {
      if (environments.value.length > 0) return; // 已有环境则不初始化

      const defaultEnvs = [
        { name: 'dev', baseUrl: 'http://localhost:3000' },
        { name: 'test', baseUrl: 'https://test.example.com' },
        { name: 'prod', baseUrl: 'https://api.example.com' },
      ];

      defaultEnvs.forEach((config, index) => {
        const env: Environment = {
          id: crypto.randomUUID(),
          name: config.name,
          variables: [{ key: 'baseUrl', value: config.baseUrl, enabled: true }],
          isActive: index === 0, // dev 为默认激活
        };
        environments.value.push(env);
        if (env.isActive) {
          activeEnvId.value = env.id;
        }
      });
    };

    return {
      environments,
      activeEnvId,
      activeEnv,
      variablesMap,
      baseUrl,
      addEnvironment,
      deleteEnvironment,
      renameEnvironment,
      setActiveEnvironment,
      addVariable,
      updateVariable,
      deleteVariable,
      replaceVariables,
      initDefaultEnvironments,
    };
  },
  {
    persist: {
      key: 'mock-environments',
      pick: ['environments', 'activeEnvId'],
    },
  },
);
