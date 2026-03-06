<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Plus, Trash2, Play, Pause, WrapText, Maximize2, Minimize2 } from 'lucide-vue-next';
import { useCollectionStore } from '@/stores/mock/collection';
import { useMockRuleStore } from '@/stores/mock/rule';
import { useSettingsStore } from '@/stores/mock/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MonacoEditor from '@/components/mock/shared/MonacoEditor.vue';
import { formatJson, validateJson } from '@/utils/mockjs';

const collectionStore = useCollectionStore();
const ruleStore = useMockRuleStore();
const settingsStore = useSettingsStore();

// 当前选中的规则 ID
const selectedRuleId = ref<string | null>(null);

// JSON 验证错误
const jsonError = ref<string | null>(null);

// 编辑器展开状态
const isExpanded = ref(false);

// 当前接口的规则列表
const currentRules = computed(() => {
  if (!collectionStore.activeEndpointId) return [];
  return ruleStore.getRulesByEndpoint(collectionStore.activeEndpointId).value;
});

// 当前选中的规则
const selectedRule = computed(() => {
  if (!selectedRuleId.value) return null;
  return ruleStore.rules.find((r) => r.id === selectedRuleId.value) || null;
});

// 监听接口切换，自动选中第一个规则
watch(
  () => collectionStore.activeEndpointId,
  (newId) => {
    if (newId && currentRules.value.length > 0) {
      selectedRuleId.value = currentRules.value[0].id;
    } else {
      selectedRuleId.value = null;
    }
  },
  { immediate: true },
);

// 添加规则
const addRule = () => {
  if (!collectionStore.activeEndpointId) return;
  const endpoint = collectionStore.activeEndpoint;

  // 计算规则名称计数
  const existingNames = currentRules.value.map((r) => r.name);
  let count = 1;
  let ruleName = '默认规则';
  while (existingNames.includes(ruleName)) {
    count++;
    ruleName = `默认规则${count}`;
  }

  // 添加新规则，但不切换选中状态（除非当前没有选中规则）
  const rule = ruleStore.addRule(
    collectionStore.activeEndpointId,
    ruleName,
    endpoint?.method || 'GET',
    endpoint?.path || '/',
  );

  // 只有当前没有选中规则时才自动选中新规则
  if (!selectedRuleId.value) {
    selectedRuleId.value = rule.id;
  }
};

// 删除规则
const deleteRule = (id: string) => {
  ruleStore.deleteRule(id);
  if (selectedRuleId.value === id) {
    selectedRuleId.value = currentRules.value[0]?.id || null;
  }
};

// 切换规则激活状态
const toggleActive = (id: string) => {
  ruleStore.setActiveRule(id);
};

// 格式化响应体
const formatBody = () => {
  if (!selectedRule.value) return;
  const formatted = formatJson(selectedRule.value.body);
  ruleStore.updateRule(selectedRule.value.id, { body: formatted });
  validateBody(formatted);
};

// 验证响应体 JSON
const validateBody = (body: string) => {
  const result = validateJson(body);
  jsonError.value = result.valid ? null : result.error || '无效的 JSON 格式';
};

// 更新响应体并验证
const updateBody = (body: string) => {
  if (!selectedRule.value) return;
  ruleStore.updateRule(selectedRule.value.id, { body });
  validateBody(body);
};

// 监听选中规则变化，重新验证
watch(
  selectedRule,
  (rule) => {
    if (rule) {
      validateBody(rule.body);
    } else {
      jsonError.value = null;
    }
  },
  { immediate: true },
);

// 监听 AI 生成的待插入内容
watch(
  () => settingsStore.pendingInsertContent,
  (content) => {
    if (content && selectedRule.value) {
      const formatted = formatJson(content);
      ruleStore.updateRule(selectedRule.value.id, { body: formatted });
      validateBody(formatted);
      settingsStore.setPendingInsertContent(null);
    }
  },
);
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden relative">
    <!-- 无接口选中状态 -->
    <div
      v-if="!collectionStore.activeEndpointId"
      class="flex-1 flex items-center justify-center text-muted-foreground text-sm"
    >
      请先选择一个接口
    </div>

    <!-- 规则编辑区 -->
    <template v-else>
      <!-- 规则列表头部 -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span class="text-sm font-medium">Mock 规则</span>
        <Button size="sm" variant="ghost" @click="addRule">
          <Plus :size="14" />
          添加
        </Button>
      </div>

      <!-- 规则列表 -->
      <div class="border-b border-border max-h-32 overflow-y-auto shrink-0">
        <div
          v-for="rule in currentRules"
          :key="rule.id"
          class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted"
          :class="{ 'bg-muted': selectedRuleId === rule.id }"
          @click="selectedRuleId = rule.id"
        >
          <button
            class="p-0.5 rounded hover:bg-accent"
            :class="rule.active ? 'text-success' : 'text-muted-foreground'"
            :title="rule.active ? '当前已启用' : '点击启用规则'"
            @click.stop="toggleActive(rule.id)"
          >
            <Play v-if="rule.active" :size="12" />
            <Pause v-else :size="12" />
          </button>
          <span class="flex-1 truncate" :title="rule.name">{{ rule.name }}</span>
          <span class="text-xs text-muted-foreground">{{ rule.statusCode }}</span>
          <button
            class="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-accent"
            @click.stop="deleteRule(rule.id)"
          >
            <Trash2 :size="12" />
          </button>
        </div>
        <div
          v-if="currentRules.length === 0"
          class="px-3 py-4 text-center text-muted-foreground text-sm"
        >
          暂无规则，点击添加
        </div>
      </div>

      <!-- 规则编辑表单 -->
      <div v-if="selectedRule" class="flex-1 flex flex-col min-h-0 overflow-hidden p-3 gap-3">
        <!-- 规则名称 -->
        <div class="space-y-1 shrink-0">
          <label class="text-sm text-muted-foreground">规则名称</label>
          <Input
            :model-value="selectedRule.name"
            @update:model-value="ruleStore.updateRule(selectedRule.id, { name: $event })"
          />
        </div>

        <!-- 状态码和延迟 -->
        <div class="grid grid-cols-2 gap-3 shrink-0">
          <div class="space-y-1">
            <label class="text-sm text-muted-foreground">状态码</label>
            <Input
              type="number"
              :model-value="selectedRule.statusCode"
              @update:model-value="
                ruleStore.updateRule(selectedRule.id, { statusCode: Number($event) })
              "
            />
          </div>
          <div class="space-y-1">
            <label class="text-sm text-muted-foreground">延迟 (ms)</label>
            <Input
              type="number"
              :model-value="selectedRule.delay"
              @update:model-value="ruleStore.updateRule(selectedRule.id, { delay: Number($event) })"
            />
          </div>
        </div>

        <!-- 响应体 -->
        <div class="flex-1 min-h-0 flex flex-col">
          <div class="flex items-center justify-between mb-1 shrink-0">
            <label class="text-sm text-muted-foreground">响应体 (支持 Mock.js 语法)</label>
            <div class="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                title="格式化 JSON"
                @click="formatBody">
                <WrapText :size="14" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                title="展开编辑器"
                @click="isExpanded = true">
                <Maximize2 :size="14" />
              </Button>
            </div>
          </div>
          <div
            class="flex-1 min-h-0 rounded-md border overflow-hidden"
            :class="jsonError ? 'border-destructive' : 'border-border'"
          >
            <MonacoEditor
              :model-value="selectedRule.body"
              language="json"
              @update:model-value="updateBody($event)"
            />
          </div>
          <p v-if="jsonError" class="text-xs text-destructive mt-1 shrink-0">{{ jsonError }}</p>
        </div>
      </div>

      <!-- 无规则选中 -->
      <div v-else class="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        选择或添加一个规则
      </div>
    </template>

    <!-- 展开模式覆盖层 -->
    <div
      v-if="isExpanded && selectedRule"
      class="absolute inset-0 z-50 bg-background flex flex-col"
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <label class="text-sm font-medium">响应体编辑器</label>
        <div class="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            title="格式化 JSON"
            @click="formatBody">
            <WrapText :size="14" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="收起编辑器"
            @click="isExpanded = false">
            <Minimize2 :size="14" />
          </Button>
        </div>
      </div>
      <div class="flex-1 min-h-0 overflow-hidden">
        <MonacoEditor
          :model-value="selectedRule.body"
          language="json"
          @update:model-value="updateBody($event)"
        />
      </div>
      <p
        v-if="jsonError"
        class="text-xs text-destructive px-3 py-2 border-t border-border shrink-0"
      >
        {{ jsonError }}
      </p>
    </div>
  </div>
</template>
