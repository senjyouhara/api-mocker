// Mock 应用类型定义

// HTTP 方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 分组模型
export interface Group {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

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
  // 请求配置
  params?: KeyValuePair[];
  headers?: KeyValuePair[];
  bodyType?: 'none' | 'json' | 'form' | 'raw';
  body?: string;
  formData?: FormDataPair[];
}

// 键值对类型
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

// Form 数据项类型
export interface FormDataPair {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  enabled: boolean;
}

// Mock 规则模型
export interface MockRule {
  id: string;
  endpointId: string;
  name: string;
  method: HttpMethod;
  path: string;
  active: boolean;
  delay: number;
  statusCode: number;
  headers: Record<string, string>;
  bodyType: 'json' | 'text' | 'javascript';
  body: string;
  order: number;
}

// 环境变量模型
export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
  isActive: boolean;
}

export interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

// 请求历史模型
export interface RequestHistory {
  id: string;
  endpointId?: string;
  method: HttpMethod;
  url: string;
  params?: KeyValuePair[];
  headers: Record<string, string>;
  bodyType?: 'none' | 'json' | 'form' | 'raw';
  body?: string;
  formData?: FormDataPair[];
  response?: ResponseData;
  createdAt: number;
}

export interface ResponseData {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  duration: number;
  isBase64?: boolean;
  contentType?: string;
}

// 树节点类型（用于侧边栏展示）
export type TreeNodeType = 'group' | 'endpoint';

export interface TreeNode {
  id: string;
  type: TreeNodeType;
  name: string;
  parentId: string | null;
  children?: TreeNode[];
  data: Group | ApiEndpoint;
  expanded?: boolean;
}
