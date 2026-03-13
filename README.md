# api-mocker

基于 `Tauri + Vue 3` 的本地 API Mock 与请求调试工具，面向前端联调、接口演示和本地自测场景。

## 当前功能（按代码实现）

- **本地 Mock 服务器**
  - 支持启动/停止与端口配置
  - 支持路径匹配：精确匹配、`/api/*` 通配符、`/api/:id` 路径参数
  - 应用启动后会自动尝试启动 Mock 服务
- **接口集合管理**
  - 分组/子分组管理、接口增删改、拖拽排序与分组间移动
  - 支持按接口名、方法、路径搜索
  - 接口 `method + path` 组合重复校验
- **请求调试**
  - 支持 `GET/POST/PUT/DELETE/PATCH`
  - 支持 `Params / Headers / Body`（`none/json/form/raw`）
  - JSON 实时校验与格式化
  - 若当前接口存在激活 Mock 规则，优先返回本地 Mock 响应；否则发起真实 HTTP 请求
- **响应查看**
  - 状态码、耗时、响应头、响应体展示
  - JSON 高亮展示、图片预览
  - 二进制响应下载（Base64）与大文件流式加载进度
- **Mock 规则编辑**
  - 每个接口支持多规则，单接口同一时间仅 1 条激活
  - 支持状态码、延迟、响应头、响应体编辑
  - 内置 Monaco 编辑器（含展开编辑、格式化）
  - 支持 JavaScript 函数模式：根据请求数据（`query`/`body`/`path`）动态返回不同响应
  - 使用 `js-beautify` 格式化 JSON 和 JavaScript 代码
  - 使用 `acorn` 对 JavaScript 代码进行实时语法校验
- **Mock.js 支持**
  - 响应体支持 Mock.js 模板生成
  - 支持 JSON 注释与宽松 JSON（如单引号、尾随逗号、未加引号键名）
- **环境变量**
  - 默认环境：`dev / test / prod`
  - 支持自定义环境、变量启停
  - URL 支持 `{{variable}}` 替换，且支持相对路径拼接 `baseUrl`
- **历史记录**
  - 自动记录请求历史（含请求/响应）
  - 支持按接口过滤查看、详情查看、恢复到请求面板
- **导入/导出**
  - 导出/导入 JSON（分组、接口、Mock 规则）
- **AI 助手（OpenAI 兼容）**
  - 支持配置 `baseUrl/apiKey/model`
  - 流式生成 JSON/Mock 模板内容，可一键插入规则编辑器
- **其他**
  - 深色/浅色主题切换
  - 前端状态持久化（Pinia persistedstate）

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- Rust 工具链（用于 Tauri 开发与打包）

### 安装依赖

```bash
pnpm install
```

### 启动（完整功能）

```bash
pnpm tauri dev
```

### 构建桌面应用

```bash
pnpm tauri build
```

## 常用命令

| 命令               | 说明                                              |
| ------------------ | ------------------------------------------------- |
| `pnpm dev`         | 启动完整桌面开发环境（推荐）                      |
| `pnpm start`       | 仅启动前端 Vite 开发服务器（不含 Tauri 后端能力） |
| `pnpm tauri dev`   | 启动完整桌面开发环境                              |
| `pnpm build`       | 构建前端静态资源                                  |
| `pnpm tauri build` | 构建桌面安装包                                    |
| `pnpm lint`        | ESLint（带 `--fix`）                              |
| `pnpm format`      | Prettier 格式化                                   |
| `pnpm preview`     | 预览前端构建产物                                  |

## 技术栈

| 层级     | 技术                                                       |
| -------- | ---------------------------------------------------------- |
| 桌面壳   | Tauri 2.x                                                  |
| 前端     | Vue 3 + TypeScript + Vite                                  |
| 状态管理 | Pinia + pinia-plugin-persistedstate                        |
| 样式/UI  | TailwindCSS + Reka UI + Lucide                             |
| 编辑器   | Monaco Editor                                              |
| Rust 侧  | Hyper（Mock 服务）+ Reqwest（HTTP 客户端）+ Tauri Commands |

## 数据范围说明

- **导入/导出覆盖范围**：分组、接口、Mock 规则。
- **本地持久化**：请求配置、环境变量、历史、设置等通过 Pinia 持久化保存。
- **Rust 侧数据库命令**：仓库中已包含 `SQLite/SQLx` 相关命令模块，当前 UI 主要数据流仍以前端状态持久化为主。

## 目录结构（核心）

```text
.
├── src
│   ├── components/mock           # 业务组件（集合树、规则编辑、调试台、AI 对话、导入导出）
│   ├── stores/mock               # 核心状态（collection/rule/request/env/history/server/settings）
│   ├── views/mock                # 主布局与工作台
│   ├── composables/useAiChat.ts # AI 流式对话逻辑
│   └── utils/mockjs.ts           # Mock.js 解析、JSON 校验与格式化
├── src-tauri
│   └── src/commands
│       ├── mock_server.rs        # 本地 Mock 服务与规则同步
│       ├── http_client.rs        # HTTP 请求与流式响应
│       ├── import_export.rs      # JSON 导入导出
│       └── db_crud.rs            # SQLite CRUD 命令（预留/逐步接入）
└── docs
    └── USER_MANUAL.md            # 用户操作手册
```

## 文档

- 用户手册：[`docs/USER_MANUAL.md`](./docs/USER_MANUAL.md)
- 变更记录：[`CHANGELOG.md`](./CHANGELOG.md)

## License

MIT
