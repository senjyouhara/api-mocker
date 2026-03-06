<script setup lang="ts">
import { computed } from 'vue';
import { Copy, Check } from 'lucide-vue-next';
import { ref } from 'vue';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { RequestHistory } from '@/types/mock';

const props = defineProps<{
  open: boolean;
  history: RequestHistory | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

// 复制状态
const copiedField = ref<string | null>(null);

// HTTP 方法颜色
const methodColors: Record<string, string> = {
  GET: 'text-green-500',
  POST: 'text-yellow-500',
  PUT: 'text-blue-500',
  DELETE: 'text-red-500',
  PATCH: 'text-purple-500',
};

// 状态码颜色
const statusColor = computed(() => {
  if (!props.history?.response) return '';
  const code = props.history.response.statusCode;
  if (code >= 200 && code < 300) return 'text-green-500';
  if (code >= 400) return 'text-red-500';
  return 'text-yellow-500';
});

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

// 格式化 JSON
const formatJson = (str: string) => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
};

// 复制到剪贴板
const copyToClipboard = async (text: string, field: string) => {
  await navigator.clipboard.writeText(text);
  copiedField.value = field;
  setTimeout(() => {
    copiedField.value = null;
  }, 2000);
};

// Headers 转数组
const headersArray = computed(() => {
  if (!props.history?.headers) return [];
  return Object.entries(props.history.headers);
});

const responseHeadersArray = computed(() => {
  if (!props.history?.response?.headers) return [];
  return Object.entries(props.history.response.headers);
});
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[80vh] flex flex-col">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <span class="text-sm font-mono font-bold" :class="methodColors[history?.method || 'GET']">
            {{ history?.method }}
          </span>
          <span class="text-sm font-medium truncate flex-1">{{ history?.url }}</span>
          <span v-if="history?.response" class="text-sm font-mono font-bold" :class="statusColor">
            {{ history.response.statusCode }}
          </span>
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ history ? formatTime(history.createdAt) : '' }}
          <span v-if="history?.response" class="ml-2">
            耗时: {{ history.response.duration }}ms
          </span>
        </div>
      </DialogHeader>

      <Tabs default-value="request" class="flex-1 flex flex-col min-h-0 mt-4">
        <TabsList class="bg-muted">
          <TabsTrigger value="request">请求</TabsTrigger>
          <TabsTrigger value="response">响应</TabsTrigger>
        </TabsList>

        <!-- 请求 Tab -->
        <TabsContent value="request" class="flex-1 overflow-auto mt-2">
          <!-- URL -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-muted-foreground">URL</span>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 px-2"
                @click="copyToClipboard(history?.url || '', 'url')"
              >
                <Check v-if="copiedField === 'url'" :size="12" class="text-green-500" />
                <Copy v-else :size="12" class="text-muted-foreground" />
              </Button>
            </div>
            <div class="p-2 bg-muted rounded text-sm font-mono break-all text-foreground">
              {{ history?.url }}
            </div>
          </div>

          <!-- Headers -->
          <div class="mb-4">
            <span class="text-xs font-medium text-muted-foreground">Headers</span>
            <div class="mt-1 border border-border rounded overflow-hidden">
              <div
                v-for="([key, value], index) in headersArray"
                :key="key"
                class="flex text-sm"
                :class="{ 'border-t border-border': index > 0 }"
              >
                <div class="w-1/3 px-2 py-1 bg-muted/50 font-medium truncate text-foreground">
                  {{ key }}
                </div>
                <div class="flex-1 px-2 py-1 font-mono truncate text-foreground">{{ value }}</div>
              </div>
              <div v-if="headersArray.length === 0" class="px-2 py-1 text-muted-foreground text-sm">
                无 Headers
              </div>
            </div>
          </div>

          <!-- Body -->
          <div v-if="history?.body">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-muted-foreground">Body</span>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 px-2"
                @click="copyToClipboard(history.body, 'body')"
              >
                <Check v-if="copiedField === 'body'" :size="12" class="text-green-500" />
                <Copy v-else :size="12" class="text-muted-foreground" />
              </Button>
            </div>
            <pre
              class="p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-40 text-foreground"
              >{{ formatJson(history.body) }}</pre
            >
          </div>
        </TabsContent>

        <!-- 响应 Tab -->
        <TabsContent value="response" class="flex-1 overflow-auto mt-2">
          <template v-if="history?.response">
            <!-- 状态 -->
            <div class="mb-4 flex items-center gap-4">
              <div>
                <span class="text-xs text-muted-foreground">状态码</span>
                <div class="text-lg font-bold" :class="statusColor">
                  {{ history.response.statusCode }}
                </div>
              </div>
              <div>
                <span class="text-xs text-muted-foreground">耗时</span>
                <div class="text-lg font-bold text-foreground">
                  {{ history.response.duration }}ms
                </div>
              </div>
            </div>

            <!-- Response Headers -->
            <div class="mb-4">
              <span class="text-xs font-medium text-muted-foreground">Response Headers</span>
              <div class="mt-1 border border-border rounded overflow-hidden">
                <div
                  v-for="([key, value], index) in responseHeadersArray"
                  :key="key"
                  class="flex text-sm"
                  :class="{ 'border-t border-border': index > 0 }"
                >
                  <div class="w-1/3 px-2 py-1 bg-muted/50 font-medium truncate text-foreground">
                    {{ key }}
                  </div>
                  <div class="flex-1 px-2 py-1 font-mono truncate text-foreground">{{ value }}</div>
                </div>
                <div
                  v-if="responseHeadersArray.length === 0"
                  class="px-2 py-1 text-muted-foreground text-sm"
                >
                  无 Headers
                </div>
              </div>
            </div>

            <!-- Response Body -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-muted-foreground">Response Body</span>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-6 px-2"
                  @click="copyToClipboard(history.response.body, 'responseBody')"
                >
                  <Check v-if="copiedField === 'responseBody'" :size="12" class="text-green-500" />
                  <Copy v-else :size="12" class="text-muted-foreground" />
                </Button>
              </div>
              <pre
                class="p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-60 text-foreground"
                >{{ formatJson(history.response.body) }}</pre
              >
            </div>
          </template>
          <div v-else class="text-center text-muted-foreground py-8">无响应数据</div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
