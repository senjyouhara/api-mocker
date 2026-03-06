<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { Copy, Check, Download, Loader2 } from 'lucide-vue-next';
import type { ResponseData } from '@/types/mock';
import { useRequestStore } from '@/stores/mock/request';
import JsonHighlight from '@/components/mock/shared/JsonHighlight.vue';

const props = defineProps<{
  response?: ResponseData;
}>();

const requestStore = useRequestStore();

// 复制状态
const copied = ref(false);

// 图片加载状态
const imageLoading = ref(true);
const imageLoaded = ref(false);

// 状态码颜色
const statusColor = computed(() => {
  if (!props.response) return '';
  const code = props.response.statusCode;
  if (code >= 200 && code < 300) return 'text-success';
  if (code >= 400 && code < 500) return 'text-warning';
  if (code >= 500) return 'text-error';
  return 'text-info';
});

// 是否为图片
const isImage = computed(() => {
  if (!props.response?.contentType) return false;
  return props.response.contentType.startsWith('image/');
});

// 是否为二进制文件（非图片、非文本）
const isBinaryFile = computed(() => {
  if (!props.response?.isBase64) return false;
  if (isImage.value) return false;
  return true;
});

// 获取文件扩展名
const fileExtension = computed(() => {
  if (!props.response?.contentType) return 'bin';
  const ct = props.response.contentType;
  // 常见 MIME 类型映射
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
    'application/x-msdownload': 'exe',
    'application/octet-stream': 'bin',
    'text/plain': 'txt',
    'text/csv': 'csv',
  };
  if (mimeMap[ct]) return mimeMap[ct];
  // 从 MIME 类型提取
  const parts = ct.split('/');
  return parts[1]?.split(';')[0] || 'bin';
});

// 获取文件类型显示名称
const fileTypeName = computed(() => {
  const ext = fileExtension.value.toUpperCase();
  return `${ext} 文件`;
});

// 图片 URL（base64 data URL）
const imageUrl = computed(() => {
  if (!isImage.value) return '';

  // 流式加载中不显示图片（等待完成）
  if (requestStore.streaming) return '';

  // 普通加载
  if (!props.response?.body) return '';
  const contentType = props.response?.contentType || 'image/png';
  const url = `data:${contentType};base64,${props.response.body}`;
  console.log('imageUrl computed, bodyLen:', props.response.body.length, 'urlLen:', url.length);
  return url;
});

// 是否正在流式加载
const isStreaming = computed(() => requestStore.streaming);

// 流式加载进度
const streamChunkIndex = computed(() => requestStore.streamChunkIndex);
const streamReceivedBytes = computed(() => requestStore.streamReceivedBytes);
const streamContentLength = computed(() => requestStore.streamContentLength);

// 估算总块数（基于 content-length 和平均块大小）
const estimatedTotalChunks = computed(() => {
  if (!streamContentLength.value || !streamChunkIndex.value || !streamReceivedBytes.value)
    return null;
  const avgChunkSize = streamReceivedBytes.value / streamChunkIndex.value;
  return Math.ceil(streamContentLength.value / avgChunkSize);
});

// 格式化文件大小
const formatSize = (bytes: number | null | undefined) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// 监听响应变化，重置图片加载状态
watch(
  () => props.response,
  () => {
    imageLoading.value = true;
    imageLoaded.value = false;
  },
);

// 图片加载完成
const onImageLoad = () => {
  imageLoading.value = false;
  imageLoaded.value = true;
};

// 图片加载失败
const onImageError = () => {
  imageLoading.value = false;
  imageLoaded.value = false;
};

// 格式化 JSON
const formattedBody = computed(() => {
  if (!props.response?.body) return '';
  try {
    return JSON.stringify(JSON.parse(props.response.body), null, 2);
  } catch {
    return props.response.body;
  }
});

// 是否为 JSON
const isJson = computed(() => {
  if (!props.response?.body) return false;
  try {
    JSON.parse(props.response.body);
    return true;
  } catch {
    return false;
  }
});

// 复制响应（使用 ClipboardItem 支持文件流）
const copyResponse = async () => {
  if (!props.response?.body) return;

  try {
    if (isImage.value) {
      // 图片：转换 base64 为 Blob 并复制
      const base64Data = props.response.body;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const contentType = props.response.contentType || 'image/png';
      const blob = new Blob([byteArray], { type: contentType });

      await navigator.clipboard.write([new ClipboardItem({ [contentType]: blob })]);
    } else {
      // 文本/JSON：使用 Blob 复制
      const blob = new Blob([formattedBody.value], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
    }

    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch (e) {
    // 降级到普通文本复制
    await navigator.clipboard.writeText(formattedBody.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
};

// 下载文件（图片或二进制文件）
const downloadFile = async () => {
  if (!props.response?.body || !props.response?.isBase64) return;

  const defaultName = `file-${Date.now()}.${fileExtension.value}`;
  const filePath = await save({
    defaultPath: defaultName,
    filters: [{ name: fileTypeName.value, extensions: [fileExtension.value] }],
  });

  if (!filePath) return;

  const base64Data = props.response.body;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  await writeFile(filePath, byteArray);
};
</script>

<template>
  <div class="h-full flex flex-col border-t border-border">
    <!-- 状态栏 -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-border text-sm">
      <div class="flex items-center gap-4">
        <span v-if="response" :class="statusColor" class="font-mono font-semibold">
          {{ response.statusCode }}
        </span>
        <span v-if="response" class="text-muted-foreground"> {{ response.duration }}ms </span>
      </div>
      <div v-if="response" class="flex items-center gap-1">
        <!-- 图片或二进制文件时显示下载按钮 -->
        <button
          v-if="isImage || isBinaryFile"
          class="h-6 px-2 flex items-center gap-1 rounded text-xs hover:bg-muted"
          title="下载文件"
          @click="downloadFile"
        >
          <Download :size="12" />
        </button>
        <!-- 复制按钮（非二进制文件时显示） -->
        <button
          v-if="!isBinaryFile"
          class="h-6 px-2 flex items-center gap-1 rounded text-xs hover:bg-muted"
          @click="copyResponse"
        >
          <Check v-if="copied" :size="12" class="text-success" />
          <Copy v-else :size="12" />
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
    </div>

    <!-- 响应体 -->
    <div class="flex-1 overflow-auto p-3">
      <!-- 流式加载进度（通用） -->
      <div v-if="isStreaming" class="flex flex-col items-center gap-2 py-8">
        <Loader2 :size="32" class="text-primary animate-spin" />
        <span class="text-sm text-muted-foreground">
          数据下载中... ({{ streamChunkIndex
          }}<span v-if="estimatedTotalChunks">/{{ estimatedTotalChunks }}</span> 块,
          {{ formatSize(streamReceivedBytes)
          }}<span v-if="streamContentLength">/{{ formatSize(streamContentLength) }}</span
          >)
        </span>
      </div>
      <!-- 图片展示 -->
      <div v-else-if="response && isImage" class="flex flex-col items-center gap-2">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          alt="Response Image"
          class="max-w-full max-h-[400px] object-contain rounded border border-border"
          @load="onImageLoad"
          @error="onImageError"
        />
        <span v-if="response?.contentType" class="text-xs text-muted-foreground">
          {{ response.contentType }}
        </span>
      </div>
      <!-- 二进制文件无法预览 -->
      <div
        v-else-if="response && isBinaryFile"
        class="flex flex-col items-center justify-center gap-3 py-12"
      >
        <Download :size="48" class="text-muted-foreground" />
        <div class="text-center">
          <p class="text-sm font-medium">{{ fileTypeName }}</p>
          <p class="text-xs text-muted-foreground mt-1">无法预览，请下载查看</p>
        </div>
        <button
          class="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          @click="downloadFile"
        >
          下载文件
        </button>
      </div>
      <!-- JSON 展示 -->
      <JsonHighlight v-else-if="response && isJson" :json="formattedBody" />
      <!-- 文本展示 -->
      <pre v-else-if="response" class="text-sm font-mono whitespace-pre-wrap">{{
        formattedBody
      }}</pre>
      <!-- 空状态 -->
      <div v-else class="text-center text-muted-foreground py-8 text-sm">
        发送请求后在此查看响应
      </div>
    </div>
  </div>
</template>
