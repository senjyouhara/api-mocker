import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';

const host = process.env.TAURI_DEV_HOST;

// 排除 Monaco Editor 不需要的 worker 文件
const monacoWorkerNoop = () => ({
  name: 'monaco-worker-noop',
  resolveId(id) {
    if (/monaco-editor.*worker/i.test(id)) {
      return '\0monaco-worker-noop';
    }
  },
  load(id) {
    if (id === '\0monaco-worker-noop') {
      return 'export default {};';
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    vue(),
    monacoWorkerNoop(),
    // 自动导入 Vue API
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    }),
    // 自动导入组件
    Components({
      dirs: ['src/components'],
      dts: 'src/components.d.ts',
    }),
  ],

  resolve: {
    extensions: ['.js', '.vue', '.json', '.ts'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // Monaco Editor 优化
  optimizeDeps: {
    include: ['monaco-editor'],
  },

  // 构建优化
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'common-vendor': ['acorn', 'dayjs', 'mockjs'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['lucide-vue-next'],
        },
      },
    },
  },

  // 生产环境移除 console
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },

  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 5174,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
}));
