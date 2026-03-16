import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { HttpMethod, ResponseData, ApiEndpoint, RequestHistory } from '@/types/mock';
import { useCollectionStore } from '@/stores/mock/collection';

// KeyValue 项类型
export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

// Form 数据项类型（支持文件）
export interface FormDataItem {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  file?: File;
  enabled: boolean;
}

export const useRequestStore = defineStore('request', () => {
  // 当前关联的接口 ID
  const currentEndpointId = ref<string | null>(null);

  // 当前请求状态
  const method = ref<HttpMethod>('GET');
  const url = ref('');
  const isLoading = ref(false);

  // 请求配置（KeyValue 格式）
  const params = ref<KeyValueItem[]>([]);
  const headers = ref<KeyValueItem[]>([]);
  const body = ref('');
  const bodyType = ref<'none' | 'json' | 'form' | 'raw'>('none');
  const formData = ref<FormDataItem[]>([]);

  // 响应数据
  const response = ref<ResponseData | null>(null);

  // 流式响应状态
  const streaming = ref(false);
  const streamChunkIndex = ref(0);
  const streamReceivedBytes = ref(0);
  const streamContentLength = ref<number | null>(null);

  // 计算属性：将 KeyValue 转换为 Record
  const paramsRecord = computed(() => {
    const result: Record<string, string> = {};
    params.value
      .filter((p) => p.enabled && p.key)
      .forEach((p) => {
        result[p.key] = p.value;
      });
    return result;
  });

  const headersRecord = computed(() => {
    const result: Record<string, string> = {};
    headers.value
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        result[h.key] = h.value;
      });
    return result;
  });

  // 构建完整 URL（带 query 参数）
  const fullUrl = computed(() => {
    if (!url.value) return '';

    // 解析 URL 中已有的参数
    const existingParams = new Set<string>();
    const questionIndex = url.value.indexOf('?');
    if (questionIndex !== -1) {
      const queryString = url.value.slice(questionIndex + 1);
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((_, key) => existingParams.add(key));
    }

    // 过滤掉 URL 中已存在的参数
    const enabledParams = params.value.filter(
      (p) => p.enabled && p.key && !existingParams.has(p.key),
    );

    if (enabledParams.length === 0) return url.value;

    const queryString = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');

    const separator = url.value.includes('?') ? '&' : '?';
    return `${url.value}${separator}${queryString}`;
  });

  // 默认 Headers
  const defaultHeaders: KeyValueItem[] = [
    { id: 'default-content-type', key: 'Content-Type', value: 'application/json', enabled: false },
  ];

  // 重置请求
  const reset = () => {
    currentEndpointId.value = null;
    method.value = 'GET';
    url.value = '';
    params.value = [];
    headers.value = defaultHeaders.map((h) => ({ ...h }));
    body.value = '';
    bodyType.value = 'none';
    formData.value = [];
    response.value = null;
  };

  // 从接口加载数据
  const loadFromEndpoint = async (endpoint: ApiEndpoint) => {
    currentEndpointId.value = endpoint.id;
    method.value = endpoint.method;
    url.value = endpoint.path;

    // 加载 Params
    if (endpoint.params && endpoint.params.length > 0) {
      params.value = endpoint.params.map((p) => ({ ...p }));
    } else {
      params.value = [];
    }

    // 加载 Headers（无则使用默认）
    if (endpoint.headers && endpoint.headers.length > 0) {
      headers.value = endpoint.headers.map((h) => ({ ...h }));
    } else {
      headers.value = defaultHeaders.map((h) => ({ ...h }));
    }

    // 加载 Body
    bodyType.value = endpoint.bodyType || 'none';
    body.value = endpoint.body || '';

    // 加载 FormData
    if (endpoint.formData && endpoint.formData.length > 0) {
      formData.value = endpoint.formData.map((f) => ({ ...f }));
    } else {
      formData.value = [];
    }

    // 检查是否有历史记录，如果有则加载最近一次的响应
    const { useHistoryStore } = await import('./history');
    const historyStore = useHistoryStore();
    const endpointHistories = historyStore.histories.filter((h) => h.endpointId === endpoint.id);
    if (endpointHistories.length > 0) {
      // 按时间倒序排序，取最新的一条
      const latestHistory = endpointHistories.sort((a, b) => b.createdAt - a.createdAt)[0];
      response.value = latestHistory.response || null;
    } else {
      response.value = null;
    }
  };

  // 生成唯一 ID
  const generateId = () => `kv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // 从历史记录加载数据
  const loadFromHistory = (history: RequestHistory) => {
    currentEndpointId.value = history.endpointId || null;
    method.value = history.method;
    url.value = history.url;
    response.value = history.response || null;

    // 解析 URL 中已有的参数
    const existingParams = new Set<string>();
    const questionIndex = history.url.indexOf('?');
    if (questionIndex !== -1) {
      const queryString = history.url.slice(questionIndex + 1);
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((_, key) => existingParams.add(key));
    }

    // 加载 Params（过滤掉 URL 中已存在的参数）
    if (history.params && history.params.length > 0) {
      params.value = history.params
        .filter((p) => !existingParams.has(p.key))
        .map((p) => ({ ...p }));
    } else {
      params.value = [];
    }

    // 加载 Headers（无则使用默认）
    if (history.headers && Object.keys(history.headers).length > 0) {
      headers.value = Object.entries(history.headers).map(([key, value]) => ({
        id: generateId(),
        key,
        value,
        enabled: true,
      }));
    } else {
      headers.value = defaultHeaders.map((h) => ({ ...h }));
    }

    // 加载 Body
    bodyType.value = history.bodyType || 'none';
    body.value = history.body || '';

    // 加载 FormData
    if (history.formData && history.formData.length > 0) {
      formData.value = history.formData.map((f) => ({ ...f }));
    } else {
      formData.value = [];
    }
  };

  // 保存当前配置到接口
  const saveToEndpoint = () => {
    if (!currentEndpointId.value) return;
    console.log(params, 'params');
    const collectionStore = useCollectionStore();
    collectionStore.updateEndpoint(currentEndpointId.value, {
      method: method.value,
      path: url.value,
      params: params.value.map((p) => ({ ...p })),
      headers: headers.value.map((h) => ({ ...h })),
      bodyType: bodyType.value,
      body: body.value,
      formData: formData.value.map((f) => ({ ...f, file: undefined })),
    });
  };

  // 自动创建未命名分组和接口
  const ensureEndpoint = () => {
    if (currentEndpointId.value) return;

    const collectionStore = useCollectionStore();

    // 查找或创建"未命名"分组
    let unnamedGroup = collectionStore.groups.find(
      (g) => g.name === '未命名' && g.parentId === null,
    );
    if (!unnamedGroup) {
      unnamedGroup = collectionStore.addGroup('未命名', null);
    }

    // 计算接口名称计数
    const existingNames = collectionStore.endpoints
      .filter((e) => e.groupId === unnamedGroup!.id)
      .map((e) => e.name);
    let count = 1;
    let endpointName = '新接口';
    while (existingNames.includes(endpointName)) {
      count++;
      endpointName = `新接口${count}`;
    }

    // 创建新接口
    const endpoint = collectionStore.addEndpoint(
      unnamedGroup.id,
      endpointName,
      method.value,
      url.value,
    );

    currentEndpointId.value = endpoint.id;
    collectionStore.setActiveEndpoint(endpoint.id);
  };

  return {
    currentEndpointId,
    method,
    url,
    isLoading,
    params,
    headers,
    body,
    bodyType,
    formData,
    response,
    streaming,
    streamChunkIndex,
    streamReceivedBytes,
    streamContentLength,
    paramsRecord,
    headersRecord,
    fullUrl,
    reset,
    loadFromEndpoint,
    loadFromHistory,
    saveToEndpoint,
    ensureEndpoint,
  };
});
