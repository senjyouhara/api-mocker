<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { Send, WrapText, AlertCircle, Copy } from 'lucide-vue-next';
import { useRequestStore } from '@/stores/mock/request';
import { useHistoryStore } from '@/stores/mock/history';
import { useEnvStore } from '@/stores/mock/env';
import { useMockRuleStore } from '@/stores/mock/rule';
import { useCollectionStore } from '@/stores/mock/collection';
import { useSettingsStore } from '@/stores/mock/settings';
import { useToast } from '@/stores/toast';
import { parseMockTemplate, formatJson, validateJson } from '@/utils/mockjs';
import KeyValueTable from '@/components/mock/shared/KeyValueTable.vue';
import FormDataTable from '@/components/mock/shared/FormDataTable.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { HttpMethod } from '@/types/mock';

const store = useRequestStore();
const historyStore = useHistoryStore();
const envStore = useEnvStore();
const mockRuleStore = useMockRuleStore();
const collectionStore = useCollectionStore();
const settingsStore = useSettingsStore();
const { toast } = useToast();

// URL 重复错误提示
const urlError = ref('');

// HTTP 方法列表
const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

// 当前激活的 Tab
const activeTab = ref('params');

// Tab 配置
const tabs = [
  { id: 'params', label: 'Params' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
];

// Body 类型选项
const bodyTypes = [
  { id: 'none', label: 'None' },
  { id: 'json', label: 'JSON' },
  { id: 'form', label: 'Form' },
  { id: 'raw', label: 'Raw' },
];

// 自动保存：监听请求配置变化
watch(
  () => [
    store.method,
    store.url,
    store.params,
    store.headers,
    store.body,
    store.bodyType,
    store.formData,
  ],
  () => {
    // 如果有 URL 但没有关联接口，自动创建
    if (store.url && !store.currentEndpointId) {
      store.ensureEndpoint();
    }
    store.saveToEndpoint();
  },
  { deep: true },
);

// 监听接口切换，重新校验 URL
watch(
  () => store.currentEndpointId,
  () => {
    urlError.value = '';
    // 延迟校验，等待 store 数据更新
    nextTick(() => {
      validateUrl();
    });
  },
);

// 校验 URL 唯一性（仅对配置了 mock 规则的接口判重）
const validateUrl = () => {
  urlError.value = '';
  if (!store.currentEndpointId) return;
  const path = store.url.trim();
  // URL 为空时不校验重复
  if (!path) return;
  const duplicate = collectionStore.getDuplicateEndpoint(
    store.method,
    path,
    store.currentEndpointId,
  );
  if (duplicate && mockRuleStore.rules.some((r) => r.endpointId === duplicate.id)) {
    const groupPath = collectionStore.getGroupFullPath(duplicate.groupId);
    urlError.value = `URL 已存在：${groupPath}/${duplicate.name} (${duplicate.method} ${duplicate.path || '空路径'})`;
  }
};

// URL 输入框失焦处理
const onUrlBlur = () => {
  store.url = store.url.trim();
  validateUrl();
};

// 格式化 Body JSON
const formatBody = () => {
  if (store.bodyType === 'json') {
    store.body = formatJson(store.body);
    validateBodyJson();
  }
};

// Body JSON 验证错误
const bodyJsonError = ref<string | null>(null);

// 验证 Body JSON
const validateBodyJson = () => {
  if (store.bodyType !== 'json' || !store.body.trim()) {
    bodyJsonError.value = null;
    return;
  }
  const result = validateJson(store.body);
  bodyJsonError.value = result.valid ? null : result.error || '无效的 JSON 格式';
};

// 监听 body 和 bodyType 变化，自动验证
watch(
  () => [store.body, store.bodyType],
  () => {
    validateBodyJson();
  },
  { immediate: true },
);

// 流式请求相关
let unlistenStart: UnlistenFn | null = null;
let unlistenChunk: UnlistenFn | null = null;
let currentRequestId = '';
let streamStartTime = 0;

// 设置流式事件监听
onMounted(async () => {
  unlistenStart = await listen<{
    request_id: string;
    status: number;
    headers: Record<string, string>;
    content_type: string | null;
    content_length: number | null;
  }>('http-stream-start', (event) => {
    console.log(
      'http-stream-start received:',
      event.payload,
      'currentRequestId:',
      currentRequestId,
    );
    if (event.payload.request_id !== currentRequestId) return;

    store.response = {
      statusCode: event.payload.status,
      headers: event.payload.headers,
      body: '',
      duration: 0,
      isBase64: true,
      contentType: event.payload.content_type || undefined,
    };
    store.streaming = true;
    store.streamChunkIndex = 0;
    store.streamReceivedBytes = 0;
    store.streamContentLength = event.payload.content_length;
  });

  unlistenChunk = await listen<{
    request_id: string;
    chunk: string;
    done: boolean;
    chunk_index: number;
    received_bytes: number;
  }>('http-stream-chunk', (event) => {
    if (event.payload.request_id !== currentRequestId) return;

    // 更新进度
    store.streamChunkIndex = event.payload.chunk_index;
    store.streamReceivedBytes = event.payload.received_bytes;

    if (event.payload.done) {
      // 流式传输完成，数据在 chunk 中
      if (store.response) {
        store.response.body = event.payload.chunk;
        store.response.duration = Date.now() - streamStartTime;
        nextTick(() => {
          store.streaming = false;
          store.isLoading = false;
        });
      } else {
        store.streaming = false;
        store.isLoading = false;
      }
    }
  });
});

onUnmounted(() => {
  unlistenStart?.();
  unlistenChunk?.();
});

// 构建 curl 命令
const buildCurlCommand = (): string => {
  let finalUrl = envStore.replaceVariables(store.fullUrl);
  if (finalUrl.startsWith('/')) {
    const base = envStore.baseUrl;
    if (base) {
      finalUrl = base.replace(/\/$/, '') + finalUrl;
    }
  }

  const parts: string[] = ['curl'];

  // 方法
  if (store.method !== 'GET') {
    parts.push(`-X ${store.method}`);
  }

  // URL
  parts.push(`'${finalUrl}'`);

  // Headers
  const headers = store.headersRecord;
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`-H '${key}: ${value}'`);
  }

  // Body
  if (store.bodyType === 'json' && store.body) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      parts.push('-H \'Content-Type: application/json\'');
    }
    parts.push(`-d '${store.body.replace(/'/g, '\'\\\'\'')}'`);
  } else if (store.bodyType === 'form') {
    const enabledFields = store.formData.filter((f) => f.enabled && f.key);
    for (const field of enabledFields) {
      parts.push(`-F '${field.key}=${field.value}'`);
    }
  } else if (store.bodyType === 'raw' && store.body) {
    parts.push(`-d '${store.body.replace(/'/g, '\'\\\'\'')}'`);
  }

  return parts.join(' \\\n  ');
};

// 复制 curl 命令
const copyCurl = async () => {
  if (!store.url) return;
  const cmd = buildCurlCommand();
  await navigator.clipboard.writeText(cmd);
  toast({ title: '已复制 curl 命令' });
};

// 发送请求
const sendRequest = async () => {
  if (!store.url) return;

  // 检查 URL 唯一性
  validateUrl();
  if (urlError.value) {
    toast({
      title: '请求未发送',
      description: urlError.value,
      variant: 'destructive',
    });
    return;
  }

  // 检查 Body JSON 格式错误
  if (bodyJsonError.value) {
    toast({
      title: '请求未发送',
      description: `Body JSON 格式错误: ${bodyJsonError.value}`,
      variant: 'destructive',
    });
    return;
  }

  // 检查 Mock 规则 JSON 格式错误（仅 JSON 模式）
  if (store.currentEndpointId) {
    const mockRule = mockRuleStore.matchRule(store.currentEndpointId);
    if (mockRule && mockRule.bodyType !== 'javascript') {
      const mockJsonResult = validateJson(mockRule.body);
      if (!mockJsonResult.valid) {
        toast({
          title: '请求未发送',
          description: `Mock 规则 JSON 格式错误: ${mockJsonResult.error || '无效的 JSON 格式'}`,
          variant: 'destructive',
        });
        return;
      }
    }
  }

  store.isLoading = true;

  // 构建请求 body 对象（用于 JavaScript 模式）
  const buildRequestBody = () => {
    if (store.bodyType === 'json') {
      try {
        return JSON.parse(store.body || '{}');
      } catch {
        return {};
      }
    } else if (store.bodyType === 'form') {
      const result: Record<string, string> = {};
      store.formData
        .filter((f) => f.enabled && f.key)
        .forEach((f) => {
          result[f.key] = f.value;
        });
      return result;
    }
    return {};
  };

  // 提取路径参数
  const extractPathParams = (pattern: string, path: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const patternParts = pattern.split('/');
    const pathParts = path.split('?')[0].split('/');

    if (patternParts.length === pathParts.length) {
      patternParts.forEach((p, i) => {
        if (p.startsWith(':')) {
          params[p.slice(1)] = pathParts[i];
        }
      });
    }
    return params;
  };

  try {
    // 检查是否有匹配的 Mock 规则
    if (store.currentEndpointId) {
      const mockRule = mockRuleStore.matchRule(store.currentEndpointId);
      if (mockRule) {
        // 模拟延迟
        if (mockRule.delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, mockRule.delay));
        }

        // 返回 Mock 数据
        let mockBody: string;
        if (mockRule.bodyType === 'javascript') {
          // JavaScript 函数模式
          try {
            const fn = eval(`(${mockRule.body})`);
            const endpoint = collectionStore.activeEndpoint;
            const pathParams = endpoint ? extractPathParams(endpoint.path, store.url) : {};
            const requestData = {
              query: store.paramsRecord,
              body: buildRequestBody(),
              path: pathParams,
            };
            const result = fn(requestData);
            mockBody = JSON.stringify(result, null, 2);
          } catch (e) {
            mockBody = JSON.stringify({
              error: 'JavaScript 执行失败',
              message: (e as Error).message,
            });
          }
        } else {
          // JSON 模式（支持 Mock.js）
          mockBody = parseMockTemplate(mockRule.body);
        }
        store.response = {
          statusCode: mockRule.statusCode,
          headers: mockRule.headers,
          body: mockBody,
          duration: mockRule.delay,
        };

        // 保存历史记录
        historyStore.addHistory({
          method: store.method,
          url: store.fullUrl,
          params: [], // URL 已包含参数，不再重复保存
          headers: store.headersRecord,
          bodyType: store.bodyType,
          body: store.bodyType !== 'none' ? store.body : undefined,
          formData: store.formData.filter((f) => f.enabled).map((f) => ({ ...f, file: undefined })),
          response: store.response,
          endpointId: store.currentEndpointId,
        });

        store.isLoading = false;
        return;
      }
    }

    // 构建完整 URL：替换变量 + 拼接 baseUrl
    let finalUrl = envStore.replaceVariables(store.fullUrl);

    // 如果 URL 以 / 开头，拼接 baseUrl
    if (finalUrl.startsWith('/')) {
      const base = envStore.baseUrl;
      if (!base) {
        throw new Error('请求失败，请配置mock规则或填写完整url');
      }
      finalUrl = base.replace(/\/$/, '') + finalUrl;
    }

    // 验证 URL 格式
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      throw new Error('URL 必须以 http:// 或 https:// 开头，或配置 baseUrl 后使用相对路径');
    }

    // 检查是否为二进制文件请求（图片、PDF、音视频等）
    const acceptHeader = store.headersRecord['Accept'] || store.headersRecord['accept'] || '';
    const binaryAcceptTypes = [
      'image/',
      'application/pdf',
      'audio/',
      'video/',
      'application/octet-stream',
    ];
    const isBinaryAccept = binaryAcceptTypes.some((type) => acceptHeader.includes(type));

    // 通过 URL 扩展名判断
    const urlPath = new URL(finalUrl).pathname.toLowerCase();
    const binaryExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.svg',
      '.ico',
      '.bmp',
      '.pdf',
      '.mp3',
      '.mp4',
      '.wav',
      '.ogg',
      '.webm',
      '.avi',
      '.mov',
      '.zip',
      '.rar',
      '.7z',
      '.tar',
      '.gz',
    ];
    const isBinaryUrl = binaryExtensions.some((ext) => urlPath.endsWith(ext));

    const useBinaryStream = isBinaryAccept || isBinaryUrl;

    if (useBinaryStream) {
      // 使用流式请求
      currentRequestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      streamStartTime = Date.now();
      store.streamChunks = [];

      await invoke('send_http_request_stream', {
        request: {
          method: store.method,
          url: finalUrl,
          headers: store.headersRecord,
          body: store.bodyType !== 'none' ? store.body : null,
          proxy: settingsStore.activeProxy || null,
        },
        requestId: currentRequestId,
      });

      // 流式请求的响应通过事件处理，这里等待完成
      // 历史记录在流式完成后保存
    } else {
      // 普通请求
      const response = await invoke<{
        status: number;
        headers: Record<string, string>;
        body: string;
        duration: number;
        isBase64?: boolean;
        contentType?: string;
      }>('send_http_request', {
        request: {
          method: store.method,
          url: finalUrl,
          headers: store.headersRecord,
          body: store.bodyType !== 'none' ? store.body : null,
          proxy: settingsStore.activeProxy || null,
        },
      });

      store.response = {
        statusCode: response.status,
        headers: response.headers,
        body: response.body,
        duration: response.duration,
        isBase64: response.isBase64,
        contentType: response.contentType,
      };

      // 保存历史记录
      historyStore.addHistory({
        method: store.method,
        url: store.fullUrl,
        params: [],
        headers: store.headersRecord,
        bodyType: store.bodyType,
        body: store.bodyType !== 'none' ? store.body : undefined,
        formData: store.formData.filter((f) => f.enabled).map((f) => ({ ...f, file: undefined })),
        response: store.response,
        endpointId: store.currentEndpointId || undefined,
      });
    }
  } catch (error: any) {
    store.response = {
      statusCode: 0,
      headers: {},
      body: `请求失败: ${error.message || error}`,
      duration: 0,
    };
  } finally {
    store.isLoading = false;
  }
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 请求栏 -->
    <div class="flex items-center gap-2 p-3 border-b border-border">
      <!-- 方法选择器 -->
      <Select
        :model-value="store.method"
        class="h-8 w-24 pr-2 font-mono font-semibold text-sm"
        @update:model-value="
          (v) => {
            store.method = v as HttpMethod;
            validateUrl();
          }
        "
      >
        <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
      </Select>

      <!-- URL 输入框 -->
      <Input
        v-model="store.url"
        type="text"
        placeholder="/api/users 或 {{baseUrl}}/api/users"
        class="h-8 flex-1 font-mono text-sm"
        @keyup.enter="sendRequest"
        @blur="onUrlBlur"
      />

      <!-- 复制 curl -->
      <Button
        size="sm"
        variant="ghost"
        :disabled="!store.url"
        title="复制为 curl"
        @click="copyCurl"
      >
        <Copy :size="14" />
      </Button>

      <!-- 发送按钮 -->
      <Button size="sm" :disabled="!store.url || store.isLoading" @click="sendRequest">
        <span
          v-if="store.isLoading"
          class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
        ></span>
        <Send v-else :size="14" />
        发送
      </Button>
    </div>

    <!-- URL 重复错误提示 -->
    <div
      v-if="urlError"
      class="flex items-center gap-1 px-3 py-1.5 bg-destructive/10 text-destructive text-xs"
    >
      <AlertCircle :size="12" />
      <span>{{ urlError }}</span>
    </div>

    <!-- Tab 切换和内容区 -->
    <Tabs v-model="activeTab" default-value="params" class="flex-1 flex flex-col min-h-0">
      <div class="border-b border-border">
        <TabsList class="bg-transparent p-0 h-auto">
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.id"
            :value="tab.id"
            variant="underline">
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </div>

      <!-- Params Tab -->
      <div v-show="activeTab === 'params'" class="flex-1 overflow-hidden p-3">
        <KeyValueTable v-model="store.params" key-placeholder="参数名" value-placeholder="参数值" />
      </div>

      <!-- Headers Tab -->
      <div v-show="activeTab === 'headers'" class="flex-1 overflow-hidden p-3">
        <KeyValueTable v-model="store.headers" key-placeholder="Header" value-placeholder="Value" />
      </div>

      <!-- Body Tab -->
      <div v-show="activeTab === 'body'" class="flex-1 overflow-auto p-3 flex flex-col">
        <!-- Body 类型选择 -->
        <div class="flex items-center justify-between mb-3 shrink-0">
          <div class="flex gap-4">
            <label
              v-for="bt in bodyTypes"
              :key="bt.id"
              class="flex items-center gap-1.5 cursor-pointer"
            >
              <input
                v-model="store.bodyType"
                type="radio"
                :value="bt.id"
                class="w-3.5 h-3.5 accent-primary"
              />
              <span class="text-sm text-foreground">{{ bt.label }}</span>
            </label>
          </div>
          <Button
            size="sm"
            variant="ghost"
            :class="{ invisible: store.bodyType !== 'json' }"
            title="格式化 JSON"
            @click="formatBody"
          >
            <WrapText :size="14" />
            格式化
          </Button>
        </div>

        <!-- Body 内容 -->
        <div v-if="store.bodyType === 'none'" class="text-muted-foreground text-sm">
          此请求没有 Body
        </div>
        <div v-else-if="store.bodyType === 'form'" class="flex-1">
          <FormDataTable
            v-model="store.formData"
            key-placeholder="字段名"
            value-placeholder="字段值"
          />
        </div>
        <div v-else class="flex-1 flex flex-col min-h-0">
          <textarea
            v-model="store.body"
            :placeholder="
              store.bodyType === 'json' ? '{ &quot;key&quot;: &quot;value&quot; }' : '请输入内容...'
            "
            class="w-full flex-1 p-3 rounded-md bg-muted font-mono text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground border"
            :class="bodyJsonError ? 'border-destructive' : 'border-border'"
          ></textarea>
          <p v-if="bodyJsonError" class="text-xs text-destructive mt-1 shrink-0">
            {{ bodyJsonError }}
          </p>
        </div>
      </div>
    </Tabs>
  </div>
</template>
