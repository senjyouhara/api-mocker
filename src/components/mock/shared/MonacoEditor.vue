<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
// 按需导入 Monaco 核心 + javascript 语法高亮
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';

// 手动注册 JSON 语言（避免引入 worker）
import { createTokenizationSupport } from 'monaco-editor/esm/vs/language/json/tokenization';

monaco.languages.register({
  id: 'json',
  extensions: ['.json'],
  aliases: ['JSON', 'json'],
  mimetypes: ['application/json'],
});
monaco.languages.setTokensProvider('json', createTokenizationSupport(false));

// 禁用 Monaco 的 worker（使用同步模式）
const monacoGlobal = globalThis as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker: () => null;
  };
};

monacoGlobal.MonacoEnvironment = {
  getWorker: () => null,
};

const props = withDefaults(
  defineProps<{
    modelValue: string;
    language?: string;
    readOnly?: boolean;
    minimap?: boolean;
    lineNumbers?: boolean;
  }>(),
  {
    language: 'json',
    readOnly: false,
    minimap: false,
    lineNumbers: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const containerRef = ref<HTMLDivElement>();
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

// 定义黑金主题
const defineTheme = () => {
  monaco.editor.defineTheme('blackgold', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string', foreground: 'D4AF37' },
      { token: 'number', foreground: 'F5D77A' },
      { token: 'keyword', foreground: 'D4AF37' },
    ],
    colors: {
      'editor.background': '#0C0C0C',
      'editor.foreground': '#E5E5E5',
      'editor.lineHighlightBackground': '#1A1A1A',
      'editor.selectionBackground': '#D4AF3733',
      'editorCursor.foreground': '#D4AF37',
      'editorLineNumber.foreground': '#666666',
      'editorLineNumber.activeForeground': '#D4AF37',
    },
  });
};

onMounted(() => {
  if (!containerRef.value) return;

  defineTheme();

  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language,
    theme: 'blackgold',
    readOnly: props.readOnly,
    minimap: { enabled: props.minimap },
    lineNumbers: props.lineNumbers ? 'on' : 'off',
    fontSize: 13,
    fontFamily: 'JetBrains Mono, Consolas, monospace',
    tabSize: 2,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    folding: true,
    renderLineHighlight: 'line',
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  });

  // 监听内容变化
  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() || '';
    emit('update:modelValue', value);
  });
});

// 监听外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && editor.getValue() !== newValue) {
      // 使用 executeEdits 保留撤销历史
      const model = editor.getModel();
      if (model) {
        editor.pushUndoStop();
        model.pushEditOperations(
          [],
          [
            {
              range: model.getFullModelRange(),
              text: newValue,
            },
          ],
          () => null,
        );
        editor.pushUndoStop();
      }
    }
  },
);

// 监听语言变化
watch(
  () => props.language,
  (newLang) => {
    if (editor) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, newLang);
      }
    }
  },
);

onBeforeUnmount(() => {
  editor?.dispose();
  editor = null;
});

// 暴露格式化方法
const format = () => {
  editor?.getAction('editor.action.formatDocument')?.run();
};

defineExpose({ format });
</script>

<template>
  <div ref="containerRef" class="w-full h-full min-h-[200px]"></div>
</template>
