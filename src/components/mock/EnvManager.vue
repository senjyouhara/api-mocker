<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Trash2 } from 'lucide-vue-next';
import { useEnvStore } from '@/stores/mock/env';
import { Button as UiButton } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect } from '@/components/ui/select';
import { Checkbox as UiCheckbox } from '@/components/ui/checkbox';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogHeader as UiDialogHeader,
} from '@/components/ui/dialog';

const store = useEnvStore();

// 新建环境对话框
const showAddDialog = ref(false);
const newEnvName = ref('');

// 添加环境
const addEnvironment = () => {
  const name = newEnvName.value.trim();
  if (!name) return;
  store.addEnvironment(name);
  newEnvName.value = '';
  showAddDialog.value = false;
};

// 添加变量
const addVariable = () => {
  if (!store.activeEnvId) return;
  store.addVariable(store.activeEnvId);
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 环境选择器 -->
    <div class="flex items-center gap-2 p-3 border-b border-border">
      <ui-select
        :model-value="store.activeEnvId ?? ''"
        class="h-8 flex-1"
        @update:model-value="store.setActiveEnvironment($event || null)"
      >
        <option value="">无环境</option>
        <option v-for="env in store.environments" :key="env.id" :value="env.id">
          {{ env.name }}
        </option>
      </ui-select>
      <ui-button
        v-if="store.activeEnvId"
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-muted-foreground hover:text-destructive"
        title="删除环境"
        @click="store.deleteEnvironment(store.activeEnvId)"
      >
        <trash2 :size="14" />
      </ui-button>
      <ui-button variant="outline" class="h-8 w-8 p-0" @click="showAddDialog = true">
        <plus :size="14" />
      </ui-button>
    </div>

    <!-- 变量列表 -->
    <div class="flex-1 overflow-y-auto p-3">
      <div v-if="!store.activeEnv" class="text-center text-muted-foreground text-sm py-8">
        请选择或创建一个环境
      </div>
      <template v-else>
        <!-- 变量表头 -->
        <div class="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <span class="w-8"></span>
          <span class="flex-1">变量名</span>
          <span class="flex-1">值</span>
          <span class="w-8"></span>
        </div>
        <!-- 变量行 -->
        <div
          v-for="(variable, index) in store.activeEnv.variables"
          :key="index"
          class="flex items-center gap-2 mb-2"
        >
          <ui-checkbox
            :model-value="variable.enabled"
            @update:model-value="
              store.updateVariable(store.activeEnvId!, index, { enabled: $event })
            "
          />
          <ui-input
            :model-value="variable.key"
            placeholder="KEY"
            class="flex-1 h-8 font-mono text-xs"
            @update:model-value="store.updateVariable(store.activeEnvId!, index, { key: $event })"
          />
          <ui-input
            :model-value="variable.value"
            placeholder="VALUE"
            class="flex-1 h-8 font-mono text-xs"
            @update:model-value="store.updateVariable(store.activeEnvId!, index, { value: $event })"
          />
          <ui-button
            variant="ghost"
            size="icon"
            class="w-8 h-8 text-muted-foreground hover:text-destructive"
            @click="store.deleteVariable(store.activeEnvId!, index)"
          >
            <trash2 :size="14" />
          </ui-button>
        </div>
        <!-- 添加变量按钮 -->
        <ui-button
          size="sm"
          variant="ghost"
          class="w-full mt-2"
          @click="addVariable">
          <plus :size="14" />
          添加变量
        </ui-button>
      </template>
    </div>

    <!-- 新建环境对话框 -->
    <ui-dialog v-model:open="showAddDialog">
      <ui-dialog-content class="w-80">
        <ui-dialog-header>
          <h3 class="font-bold text-lg">新建环境</h3>
        </ui-dialog-header>
        <ui-input
          v-model="newEnvName"
          placeholder="环境名称（如 dev, test, prod）"
          @keyup.enter="addEnvironment"
        />
        <div class="flex justify-end gap-2 mt-4">
          <ui-button variant="outline" @click="showAddDialog = false">取消</ui-button>
          <ui-button @click="addEnvironment">确定</ui-button>
        </div>
      </ui-dialog-content>
    </ui-dialog>
  </div>
</template>
