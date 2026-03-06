<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { X, Send, Trash2, Bot, User, Copy, Check } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useAiChat } from '@/composables/useAiChat';
import { useSettingsStore } from '@/stores/mock/settings';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'insert', content: string): void;
}>();

const settingsStore = useSettingsStore();
const { messages, loading, error, sendMessage, clearMessages } = useAiChat();

const inputText = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const copiedIndex = ref<number | null>(null);

// 发送消息
const handleSend = async () => {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  inputText.value = '';
  await sendMessage(text);
  scrollToBottom();
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 监听消息变化自动滚动
watch(() => messages.value.length, scrollToBottom);

// 监听流式内容变化自动滚动
watch(() => messages.value[messages.value.length - 1]?.content, scrollToBottom);

// 判断是否是正在流式输出的消息
const isStreaming = (index: number) => {
  return loading.value && index === messages.value.length - 1;
};

// 从消息中提取 JSON 代码块
const extractJson = (content: string): string | null => {
  // 匹配 ```json ... ``` 或 ``` ... ```
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  // 尝试直接匹配 JSON 对象/数组
  const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return jsonMatch ? jsonMatch[1].trim() : null;
};

// 复制内容
const copyContent = async (content: string, index: number) => {
  const json = extractJson(content) || content;
  await navigator.clipboard.writeText(json);
  copiedIndex.value = index;
  setTimeout(() => {
    copiedIndex.value = null;
  }, 2000);
};

// 插入到编辑器
const insertToEditor = (content: string) => {
  const json = extractJson(content);
  if (json) {
    settingsStore.setPendingInsertContent(json);
    emit('update:open', false);
  }
};
</script>

<template>
  <Transition name="slide">
    <div v-if="open" class="fixed inset-0 z-50">
      <!-- 遮罩层 -->
      <div class="absolute inset-0 bg-black/50" @click="emit('update:open', false)" />
      <!-- 弹框 -->
      <div
        class="absolute bottom-16 left-16 w-96 h-[500px] bg-card border border-border rounded-lg shadow-xl flex flex-col"
      >
        <!-- 头部 -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <div class="flex items-center gap-2">
            <Bot :size="16" class="text-primary" />
            <span class="text-sm font-medium">AI 助手</span>
          </div>
          <div class="flex items-center gap-1">
            <Button size="sm" variant="ghost" @click="clearMessages" title="清空对话">
              <Trash2 :size="14" />
            </Button>
            <Button size="sm" variant="ghost" @click="emit('update:open', false)">
              <X :size="14" />
            </Button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-3 space-y-3">
          <!-- 未配置 API 提示 -->
          <div
            v-if="!settingsStore.isApiConfigured"
            class="text-center text-muted-foreground text-sm py-8"
          >
            请先在设置中配置 AI API
          </div>

          <!-- 空状态 -->
          <div
            v-else-if="messages.length === 0"
            class="text-center text-muted-foreground text-sm py-8"
          >
            描述你需要的 JSON 结构或 Mock.js 模板
          </div>

          <!-- 消息列表 -->
          <template v-else>
            <template v-for="(msg, index) in messages" :key="index">
              <!-- 跳过正在流式输出但内容为空的 AI 消息 -->
              <div
                v-if="!(msg.role === 'assistant' && !msg.content && loading)"
                class="flex gap-2"
                :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <!-- AI 头像 -->
                <div
                  v-if="msg.role === 'assistant'"
                  class="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Bot :size="14" class="text-primary" />
                </div>

                <!-- 消息内容 -->
                <div
                  class="max-w-[80%] rounded-lg px-3 py-2 text-sm group relative"
                  :class="msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'"
                >
                  <pre class="whitespace-pre-wrap font-sans">{{ msg.content }}</pre>
                  <!-- 用户消息复制按钮 -->
                  <button
                    v-if="msg.role === 'user'"
                    class="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                    @click="copyContent(msg.content, index)"
                  >
                    <Check v-if="copiedIndex === index" :size="12" class="text-success" />
                    <Copy v-else :size="12" class="text-muted-foreground" />
                  </button>
                  <!-- AI 消息操作按钮（流式输出时不显示） -->
                  <div
                    v-if="msg.role === 'assistant' && !isStreaming(index)"
                    class="flex items-center gap-1 mt-2 pt-2 border-t border-border/50"
                  >
                    <button
                      class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      @click="copyContent(msg.content, index)"
                    >
                      <Check v-if="copiedIndex === index" :size="12" />
                      <Copy v-else :size="12" />
                      {{ copiedIndex === index ? '已复制' : '复制' }}
                    </button>
                    <button
                      v-if="extractJson(msg.content)"
                      class="text-xs text-primary hover:text-primary/80 flex items-center gap-1 ml-2"
                      @click="insertToEditor(msg.content)"
                    >
                      插入编辑器
                    </button>
                  </div>
                </div>

                <!-- 用户头像 -->
                <div
                  v-if="msg.role === 'user'"
                  class="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <User :size="14" class="text-primary-foreground" />
                </div>
              </div>
            </template>
          </template>

          <!-- 加载中（仅在没有流式内容时显示） -->
          <div
            v-if="loading && (!messages.length || !messages[messages.length - 1]?.content)"
            class="flex gap-2"
          >
            <div
              class="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Bot :size="14" class="text-primary animate-pulse" />
            </div>
            <div class="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">思考中...</div>
          </div>

          <!-- 错误提示 -->
          <div v-if="error" class="text-center text-destructive text-xs py-2">
            {{ error }}
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="p-3 border-t border-border shrink-0">
          <div class="flex gap-2">
            <textarea
              v-model="inputText"
              placeholder="描述你需要的 JSON 结构..."
              class="flex-1 h-16 px-3 py-2 text-sm bg-muted rounded-md resize-none outline-none focus:ring-1 focus:ring-primary"
              :disabled="!settingsStore.isApiConfigured || loading"
              @keydown.enter.exact.prevent="handleSend"
            />
            <Button
              size="sm"
              class="h-16 px-3"
              :disabled="!settingsStore.isApiConfigured || loading || !inputText.trim()"
              @click="handleSend"
            >
              <Send :size="16" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}
</style>
