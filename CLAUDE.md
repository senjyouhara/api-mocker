# Tauri Tools 项目指南

## 项目概述

这是一个基于 Tauri 2.5 + Vue 3 + TypeScript 的桌面应用脚手架，采用 macOS 风格 UI 设计。

## 技术栈

### 前端

- **框架**: Vue 3.5 (Composition API + `<script setup>`)
- **构建**: Vite 6
- **路由**: Vue Router 4 (Hash 模式)
- **状态**: Pinia 3 + pinia-plugin-persistedstate
- **样式**: TailwindCSS 3.4 + DaisyUI 5
- **图标**: Lucide Vue Next
- **语言**: TypeScript 5

### 后端 (Rust)

- **框架**: Tauri 2.5
- **错误处理**: thiserror + anyhow
- **异步**: tokio
- **序列化**: serde + serde_json

## 目录结构

```
src/                    # 前端源码
├── components/         # 公共组件
├── layout/            # 布局组件 (Navbar, Sidebar)
├── router/            # 路由配置
├── stores/            # Pinia 状态
├── views/             # 页面组件
│   ├── analytics/     # 数据分析模块
│   └── users/         # 用户管理模块
├── main.ts            # 应用入口
└── index.css          # Tailwind + CSS 变量

src-tauri/src/         # Rust 后端
├── commands/          # Tauri 命令
├── error.rs           # 错误类型
├── state.rs           # 应用状态
└── lib.rs             # 库入口
```

## 开发命令

```bash
pnpm start             # 启动前端开发服务器
pnpm tauri dev         # 启动 Tauri 开发模式（推荐）
pnpm build             # 构建前端
pnpm tauri build       # 构建桌面应用
pnpm lint              # ESLint 检查
pnpm format            # Prettier 格式化
```

## 代码规范

### Vue 组件结构

```vue
<script setup lang="ts">
// 1. 导入
// 2. Props/Emits
// 3. 响应式数据
// 4. 计算属性
// 5. 方法
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped lang="scss">
/* 样式 */
</style>
```

### 命名约定

| 类型      | 规范       | 示例                 |
| --------- | ---------- | -------------------- |
| Vue 组件  | PascalCase | `SettingsDialog.vue` |
| 变量/函数 | camelCase  | `toggleSidebar`      |
| CSS 类    | kebab-case | `menu-item`          |
| Rust 模块 | snake_case | `greet.rs`           |
| Rust 类型 | PascalCase | `AppError`           |

### 格式化规则

- 缩进: 2 空格
- 引号: 单引号
- 分号: 必须
- 行宽: 100 字符
- 尾逗号: ES5 风格

## 架构约定

### 前端

1. **路由**: 使用 Hash 模式适配 Tauri
2. **状态持久化**: theme 和 userSettings 自动持久化
3. **自动导入**: Vue API 和 src/components 下组件自动导入
4. **主题**: 支持 light/dark，使用 DaisyUI data-theme

### 后端

1. **命令模块化**: 所有命令放在 `commands/` 目录
2. **统一错误**: 使用 `AppResult<T>` 返回类型
3. **状态管理**: 共享状态通过 `tauri::State<AppState>` 注入

### 添加新命令示例

```rust
// src-tauri/src/commands/example.rs
use crate::error::AppResult;

#[tauri::command]
pub fn example_command(param: &str) -> AppResult<String> {
    Ok(format!("Result: {}", param))
}

// 在 commands/mod.rs 中导出
pub use example::*;

// 在 lib.rs 中注册
.invoke_handler(tauri::generate_handler![commands::example_command])
```

## 关键配置

| 配置       | 路径                        | 说明                |
| ---------- | --------------------------- | ------------------- |
| Vite       | `vite.config.mjs`           | 端口 5173，自动导入 |
| Tauri      | `src-tauri/tauri.conf.json` | CSP 策略，窗口配置  |
| TypeScript | `tsconfig.json`             | 严格模式，路径别名  |
| Tailwind   | `tailwind.config.js`        | macOS 风格主题      |

## UI 设计规范

- 遵循 macOS Sequoia/Sonoma 设计语言
- 使用 Glassmorphism 毛玻璃效果
- 图标: Lucide，stroke-width 1.5px
- 动画: 200-300ms transition
- 详见 `UI-STYLE.md`

## 注意事项

1. **端口配置**: Vite 端口 5173，确保 tauri.conf.json 中 devUrl 匹配
2. **图标库**: 统一使用 lucide-vue-next，不要混用其他图标库
3. **状态持久化**: 只持久化必要数据，避免存储敏感信息
4. **Rust 错误**: 所有命令使用 `AppResult<T>` 返回，便于前端统一处理
5. **构建优化**: Release 构建已启用 LTO 和 strip，体积最小化
