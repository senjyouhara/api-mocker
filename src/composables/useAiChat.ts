import { ref } from 'vue';
import { useSettingsStore } from '@/stores/mock/settings';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 系统提示词
const SYSTEM_PROMPT = `你是 JSON 数据生成专家。

【重要】输出模式判断：
仅当用户消息中明确包含以下关键词时才使用 Mock.js 语法：mock、mockjs、Mock、随机数据、模拟数据、动态数据
否则一律返回固定的真实 JSON 数据，包含具体的值。

固定数据示例（默认模式）：
{
  "products": [
    {"id": 1, "name": "iPhone 15", "price": 5999},
    {"id": 2, "name": "MacBook Pro", "price": 12999}
  ]
}

Mock.js 示例（仅用户明确要求时）：
{
  "products|5": [{"id": "@id", "name": "@ctitle", "price": "@float(100,9999,2,2)"}]
}

限制：只回答 JSON 相关问题，直接给代码`;

export function useAiChat() {
  const settingsStore = useSettingsStore();
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 发送消息（流式输出）
  const sendMessage = async (content: string) => {
    const { apiConfig } = settingsStore;

    if (!apiConfig.baseUrl || !apiConfig.apiKey) {
      error.value = '请先在设置中配置 API';
      return;
    }

    // 添加用户消息
    messages.value.push({ role: 'user', content });
    loading.value = true;
    error.value = null;

    // 预先添加空的 AI 消息用于流式更新
    const assistantIndex = messages.value.length;
    messages.value.push({ role: 'assistant', content: '' });

    try {
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.value.slice(0, -1), // 排除刚添加的空 AI 消息
          ],
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      // 读取流式数据
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        streamDone = done;
        if (streamDone) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              messages.value[assistantIndex].content += delta;
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 如果没有收到任何内容
      if (!messages.value[assistantIndex].content) {
        messages.value[assistantIndex].content = '无响应';
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '请求失败';
      // 移除失败的消息
      messages.value.splice(assistantIndex - 1, 2);
    } finally {
      loading.value = false;
    }
  };

  // 清空对话
  const clearMessages = () => {
    messages.value = [];
    error.value = null;
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
  };
}
