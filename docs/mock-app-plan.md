# Mock API 代理应用 - 实施计划

## 项目概述

**项目名称**: API Mock & Debug Tool
**项目定位**: 类似 Apifox 的本地桌面 API 开发工具
**视觉风格**: 黑金主题 (Black & Gold)

---

## 技术架构

### 前端技术栈

| 技术          | 版本   | 用途       |
| ------------- | ------ | ---------- |
| Vue 3         | 3.5+   | 前端框架   |
| TypeScript    | 5.x    | 类型安全   |
| TailwindCSS   | 3.4    | 样式系统   |
| DaisyUI       | 5.x    | UI 组件库  |
| Pinia         | 3.x    | 状态管理   |
| Monaco Editor | latest | 代码编辑器 |
| vuedraggable  | 4.x    | 拖拽排序   |

### 后端技术栈

| 技术      | 用途            |
| --------- | --------------- |
| Tauri 2.5 | 桌面应用框架    |
| hyper     | Mock 代理服务器 |
| sqlx      | SQLite 异步操作 |
| reqwest   | HTTP 客户端     |
| tokio     | 异步运行时      |

---

## 功能模块 (MVP)

| 优先级 | 模块       | 描述                    |
| ------ | ---------- | ----------------------- |
| P0     | 分组管理   | 多级树状结构，拖拽排序  |
| P0     | 接口调用   | HTTP 请求发送与响应展示 |
| P0     | Mock 服务  | 本地代理服务器          |
| P1     | 环境变量   | 多环境切换              |
| P1     | 代码编辑器 | Monaco 集成             |
| P2     | 导入导出   | JSON/OpenAPI            |

---

## 阶段一：基础架构搭建

### 任务 1.1：黑金主题配置

**文件**: `tailwind.config.js`

```javascript
// 新增 blackgold 主题
daisyui: {
  themes: [{
    blackgold: {
      "primary": "#D4AF37",          // 主金色
      "primary-content": "#000000",
      "secondary": "#27272a",        // 深灰
      "accent": "#F5D77A",           // 亮金
      "neutral": "#1f2937",
      "base-100": "#0C0C0C",         // 主背景（极黑）
      "base-200": "#141414",         // 次级背景
      "base-300": "#1A1A1A",         // 三级背景
      "base-content": "#E5E5E5",     // 主文字
      "info": "#3abff8",
      "success": "#4ADE80",
      "warning": "#FBBF24",
      "error": "#F87171",
    },
  }],
}
```

**验收标准**:

- [ ] 主题切换到 blackgold 后，背景为极黑色
- [ ] 金色强调色正确显示

---

### 任务 1.2：目录结构创建

**新建目录**:

```
src/
├── views/mock/           # Mock 应用页面
├── components/mock/      # Mock 专用组件
│   ├── sidebar/          # 侧边栏组件
│   ├── workbench/        # 工作台组件
│   └── shared/           # 共享组件
├── stores/mock/          # Mock 状态管理
└── types/mock.ts         # 类型定义
```

**验收标准**:

- [ ] 目录结构创建完成
- [ ] 类型定义文件包含所有数据模型

---

### 任务 1.3：TypeScript 类型定义

**文件**: `src/types/mock.ts`

```typescript
// 分组模型
export interface Group {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// HTTP 方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API 接口模型
export interface ApiEndpoint {
  id: string;
  groupId: string;
  name: string;
  method: HttpMethod;
  path: string;
  description?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}
```

**验收标准**:

- [ ] 类型定义完整且无 TypeScript 错误

---

## 阶段二：核心功能开发

### 任务 2.1：三栏布局组件

**文件**: `src/views/mock/MockLayout.vue`

**布局结构**:

```
┌────┬────────────┬──────────────────────┐
│图标│  侧边栏    │      主内容区        │
│栏  │  (可调宽)  │                      │
│48px│  240px     │      flex-1          │
└────┴────────────┴──────────────────────┘
```

**验收标准**:

- [ ] 三栏布局正确显示
- [ ] 侧边栏宽度可拖拽调整
- [ ] 黑金主题样式正确

---

### 任务 2.2：分组树组件

**文件**: `src/components/mock/sidebar/CollectionTree.vue`

**功能要求**:

- 递归渲染多级树结构
- 支持展开/折叠
- 支持拖拽排序（vuedraggable）
- 分组名同级唯一校验
- 右键菜单（新建/重命名/删除）

**验收标准**:

- [ ] 树状结构正确渲染
- [ ] 拖拽排序功能正常
- [ ] 分组名重复时显示错误提示

---

### 任务 2.3：Pinia Store 模块

**文件**: `src/stores/mock/collection.ts`

**Store 结构**:

```typescript
export const useCollectionStore = defineStore('collection', {
  state: () => ({
    groups: [] as Group[],
    endpoints: [] as ApiEndpoint[],
    activeEndpointId: null as string | null,
  }),
  actions: {
    // 分组 CRUD
    // 接口 CRUD
    // 拖拽排序
  },
});
```

**验收标准**:

- [ ] Store 状态管理正常
- [ ] 数据持久化到 SQLite

---

### 任务 2.4：接口调用面板

**文件**: `src/components/mock/workbench/RequestPanel.vue`

**功能要求**:

- HTTP 方法选择器（GET/POST/PUT/DELETE/PATCH）
- URL 输入框（支持环境变量替换）
- 发送按钮
- Tab 切换：Params / Headers / Body / Mock

**验收标准**:

- [ ] 方法选择器样式正确（金色高亮）
- [ ] URL 输入框支持变量提示
- [ ] Tab 切换流畅

---

### 任务 2.5：响应展示组件

**文件**: `src/components/mock/workbench/ResponseViewer.vue`

**功能要求**:

- 状态码显示（颜色区分 2xx/4xx/5xx）
- 响应时间显示
- 响应体格式化（JSON/HTML/Text）
- 复制响应按钮

**验收标准**:

- [ ] 状态码颜色正确
- [ ] JSON 格式化显示正常

---

## 阶段三：高级功能开发

### 任务 3.1：Monaco Editor 集成

**文件**: `src/components/mock/shared/MonacoWrapper.vue`

**功能要求**:

- 黑金主题配色
- JSON/JavaScript 语法高亮
- 自动格式化
- 错误提示

**验收标准**:

- [ ] 编辑器主题与应用一致
- [ ] 语法高亮正常工作

---

### 任务 3.2：Mock 服务后端

**文件**: `src-tauri/src/commands/mock_server.rs`

**功能要求**:

- 启动/停止本地 HTTP 代理服务器
- 请求匹配规则引擎
- 返回 Mock 响应或转发真实请求

**验收标准**:

- [ ] 代理服务器可正常启停
- [ ] Mock 规则匹配正确

---

### 任务 3.3：环境变量管理

**文件**: `src/components/mock/EnvManager.vue`

**功能要求**:

- 多环境切换（dev/test/prod）
- 变量键值对编辑
- 变量在 URL 中自动替换

**验收标准**:

- [ ] 环境切换正常
- [ ] 变量替换正确

---

### 任务 3.4：SQLite 数据库集成

**文件**: `src-tauri/src/db/mod.rs`

**功能要求**:

- 数据库初始化与迁移
- 分组/接口/规则 CRUD 操作
- WAL 模式启用

**验收标准**:

- [ ] 数据库正常读写
- [ ] 应用重启后数据保留

---

## 组件结构总览

```
src/
├── views/mock/
│   └── MockLayout.vue          # 主布局
├── components/mock/
│   ├── sidebar/
│   │   ├── IconBar.vue         # 图标导航栏
│   │   ├── CollectionTree.vue  # 分组树
│   │   └── TreeItem.vue        # 树节点
│   ├── workbench/
│   │   ├── RequestPanel.vue    # 请求面板
│   │   ├── ResponseViewer.vue  # 响应展示
│   │   └── TabPanel.vue        # Tab 容器
│   └── shared/
│       ├── MonacoWrapper.vue   # 代码编辑器
│       ├── KeyValueTable.vue   # 键值对表格
│       └── EnvSelector.vue     # 环境选择器
└── stores/mock/
    ├── collection.ts           # 分组/接口状态
    ├── request.ts              # 请求状态
    └── env.ts                  # 环境变量状态
```

---

## 依赖安装

### 前端依赖

```bash
pnpm add monaco-editor vuedraggable@next uuid
pnpm add -D @types/uuid
```

### Rust 依赖 (Cargo.toml)

```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio", "sqlite"] }
hyper = { version = "1.0", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
uuid = { version = "1.0", features = ["v4"] }
```

---

## 风险与注意事项

| 风险点          | 应对策略                         |
| --------------- | -------------------------------- |
| HTTPS 拦截复杂  | MVP 阶段仅支持 HTTP，后续迭代    |
| SQLite 锁争用   | 启用 WAL 模式，设置 busy_timeout |
| Monaco 内存泄漏 | 组件销毁时手动释放实例           |
| 端口冲突        | 提供端口配置，默认 127.0.0.1     |

---

## 执行顺序建议

1. **阶段一** → 基础架构（主题、目录、类型）
2. **阶段二** → 核心功能（布局、分组树、请求面板）
3. **阶段三** → 高级功能（Monaco、Mock 服务、SQLite）

---

_文档生成时间: 2026-01-26_
