import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // 全局忽略
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src-tauri/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'src/auto-imports.d.ts',
      'src/components.d.ts',
    ],
  },

  // JavaScript 基础规则
  js.configs.recommended,

  // TypeScript 规则
  ...tseslint.configs.recommended,

  // Vue 规则
  ...pluginVue.configs['flat/recommended'],

  // Prettier 兼容（关闭冲突规则）
  eslintConfigPrettier,

  // 全局配置
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
  },

  // Vue 文件配置
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // 自定义规则
  {
    rules: {
      // === ESLint 核心规则 ===
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-unused-vars': 'off', // 由 TypeScript 处理
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],

      // === TypeScript 规则 ===
      '@typescript-eslint/no-unused-vars': [
        'off',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // === Vue 规则 ===
      'vue/multi-word-component-names': 'off',
      'vue/html-indent': ['error', 2],
      'vue/max-attributes-per-line': ['warn', { singleline: 3, multiline: 1 }],
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': [
        'error',
        {
          html: { void: 'always', normal: 'never', component: 'always' },
          svg: 'always',
          math: 'always',
        },
      ],
      'vue/no-v-html': 'warn',
      'vue/attribute-hyphenation': ['error', 'always'],
      'vue/component-name-in-template-casing': 'off',
      'vue/v-on-event-hyphenation': ['error', 'always', { autofix: true }],
      'vue/custom-event-name-casing': ['error', 'kebab-case'],
      'vue/no-unused-components': 'warn',
      'vue/no-unused-vars': 'warn',
      'vue/require-default-prop': 'off',
      'vue/no-v-html': 'off',
      'vue/require-name-property': 'off', // script setup 不需要 name
    },
  }
);
