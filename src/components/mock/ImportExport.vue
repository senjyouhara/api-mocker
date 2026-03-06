<script setup lang="ts">
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Download, Upload } from 'lucide-vue-next';
import { useCollectionStore } from '@/stores/mock/collection';
import { useMockRuleStore } from '@/stores/mock/rule';
import { useToast } from '@/stores/toast';
import { Button } from '@/components/ui/button';

const collectionStore = useCollectionStore();
const ruleStore = useMockRuleStore();
const { toast } = useToast();

const loading = ref(false);
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// 导出数据
const handleExport = async () => {
  loading.value = true;
  error.value = null;

  try {
    // 弹出保存对话框
    const filePath = await save({
      defaultPath: 'mock-data.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (!filePath) {
      loading.value = false;
      return;
    }

    // 转换数据格式
    const groups = collectionStore.groups.map((g) => ({
      id: g.id,
      name: g.name,
      parent_id: g.parentId,
      order: g.order,
      created_at: g.createdAt,
      updated_at: g.updatedAt,
    }));

    const endpoints = collectionStore.endpoints.map((e) => ({
      id: e.id,
      group_id: e.groupId,
      name: e.name,
      method: e.method,
      path: e.path,
      description: e.description || null,
      order: e.order,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    }));

    const mockRules = ruleStore.rules.map((r) => ({
      id: r.id,
      endpoint_id: r.endpointId,
      name: r.name,
      method: r.method || 'GET',
      path: r.path || '/',
      active: r.active,
      delay: r.delay || 0,
      status_code: r.statusCode || 200,
      headers: JSON.stringify(r.headers || {}),
      body_type: r.bodyType || 'json',
      body: r.body || '',
      order: r.order || 0,
    }));

    const json = await invoke<string>('export_to_json', {
      groups,
      endpoints,
      mockRules,
    });

    // 写入文件
    await writeTextFile(filePath, json);

    toast({ description: '导出成功' });
  } catch (e: any) {
    const msg = e.message || String(e);
    error.value = msg;
    toast({ title: '导出失败', description: msg, variant: 'destructive' });
  } finally {
    loading.value = false;
  }
};

// 导入数据
const handleImport = () => {
  fileInput.value?.click();
};

// 处理文件选择
const onFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  loading.value = true;
  error.value = null;

  try {
    const json = await file.text();
    const data = await invoke<{
      groups: any[];
      endpoints: any[];
      mock_rules: any[];
    }>('import_from_json', { json });

    // 清空现有数据
    collectionStore.groups.splice(0);
    collectionStore.endpoints.splice(0);
    ruleStore.rules.splice(0);

    // 导入分组
    for (const g of data.groups) {
      collectionStore.groups.push({
        id: g.id,
        name: g.name,
        parentId: g.parent_id,
        order: g.order,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      });
    }

    // 导入接口
    for (const e of data.endpoints) {
      collectionStore.endpoints.push({
        id: e.id,
        groupId: e.group_id,
        name: e.name,
        method: e.method,
        path: e.path,
        description: e.description,
        order: e.order,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      });
    }

    // 导入规则
    for (const r of data.mock_rules) {
      ruleStore.rules.push({
        id: r.id,
        endpointId: r.endpoint_id,
        name: r.name,
        method: r.method,
        path: r.path,
        active: r.active,
        delay: r.delay,
        statusCode: r.status_code,
        headers: JSON.parse(r.headers || '{}'),
        bodyType: r.body_type,
        body: r.body,
        order: r.order,
      });
    }

    toast({ description: '导入成功' });
  } catch (e: any) {
    error.value = e.message || String(e);
  } finally {
    loading.value = false;
    input.value = '';
  }
};
</script>

<template>
  <div class="p-4 space-y-4">
    <h3 class="text-lg font-medium">导入/导出</h3>

    <div class="flex flex-col gap-3">
      <Button :disabled="loading" @click="handleExport">
        <Download :size="16" />
        导出数据
      </Button>

      <Button :disabled="loading" variant="outline" @click="handleImport">
        <Upload :size="16" />
        导入数据
      </Button>

      <!-- 隐藏的文件输入框 -->
      <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFileSelected" />
    </div>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
  </div>
</template>
