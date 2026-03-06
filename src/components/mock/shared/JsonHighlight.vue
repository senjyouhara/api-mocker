<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  json: string;
}>();

// JSON 语法高亮
const highlightedJson = computed(() => {
  if (!props.json) return '';

  // 转义 HTML
  const escaped = props.json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 语法高亮
  return (
    escaped
      // 字符串（双引号包裹）
      .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, '<span class="json-string">"$1"</span>')
      // 键名（在冒号前的字符串）
      .replace(
        /<span class="json-string">"([^"]+)"<\/span>(\s*:)/g,
        '<span class="json-key">"$1"</span>$2',
      )
      // 数字
      .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>')
      // 布尔值和 null
      .replace(/\b(true|false|null)\b/g, '<span class="json-boolean">$1</span>')
  );
});
</script>

<template>
  <pre class="json-highlight text-sm font-mono whitespace-pre-wrap" v-html="highlightedJson"></pre>
</template>

<style scoped>
.json-highlight :deep(.json-key) {
  color: hsl(var(--primary));
}
.json-highlight :deep(.json-string) {
  color: hsl(142 71% 45%);
}
.json-highlight :deep(.json-number) {
  color: hsl(25 95% 53%);
}
.json-highlight :deep(.json-boolean) {
  color: hsl(262 83% 58%);
}
</style>
