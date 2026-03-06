<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Search } from 'lucide-vue-next';
import draggable from 'vuedraggable';
import TreeItem from './TreeItem.vue';
import { useCollectionStore } from '@/stores/mock/collection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

const store = useCollectionStore();

// 拖拽列表（根级分组）
const dragList = computed({
  get: () => store.treeData,
  set: (val) => {
    const ids = val.map((n) => n.id);
    store.updateGroupOrder(null, ids);
  },
});

// 新建分组对话框
const showAddDialog = ref(false);
const newGroupName = ref('');
const addError = ref('');

// 打开新建对话框
const openAddDialog = () => {
  newGroupName.value = '';
  addError.value = '';
  showAddDialog.value = true;
};

// 确认新建分组
const confirmAddGroup = () => {
  const name = newGroupName.value.trim();
  if (!name) {
    addError.value = '请输入分组名称';
    return;
  }
  if (store.isGroupNameDuplicate(name, null)) {
    addError.value = '分组名已存在';
    return;
  }
  store.addGroup(name);
  showAddDialog.value = false;
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="p-2 border-b border-border">
      <!-- 搜索框 -->
      <div class="relative mb-2">
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" :size="14" />
        <Input
          v-model="store.searchKeyword"
          type="text"
          placeholder="搜索接口..."
          class="h-8 pl-7 pr-2 bg-muted border-none"
        />
      </div>
      <!-- 新建按钮 -->
      <Button class="w-full" size="sm" @click="openAddDialog">
        <Plus :size="14" />
        新建分组
      </Button>
    </div>

    <!-- 树列表 -->
    <div class="flex-1 overflow-y-auto p-2">
      <draggable
        v-model="dragList"
        item-key="id"
        group="tree"
        :animation="200"
        ghost-class="opacity-50"
        handle=".drag-handle"
      >
        <template #item="{ element }">
          <TreeItem :node="element" :draggable="true" />
        </template>
      </draggable>
      <!-- 空状态 -->
      <div
        v-if="store.treeData.length === 0"
        class="text-center text-muted-foreground py-8 text-sm"
      >
        暂无数据，点击上方按钮新建分组
      </div>
    </div>

    <!-- 新建分组对话框 -->
    <Dialog :open="showAddDialog" @update:open="showAddDialog = $event">
      <DialogContent>
        <DialogHeader>新建分组</DialogHeader>
        <Input
          v-model="newGroupName"
          type="text"
          placeholder="请输入分组名称"
          @keyup.enter="confirmAddGroup"
        />
        <p v-if="addError" class="text-destructive text-sm">{{ addError }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showAddDialog = false">取消</Button>
          <Button @click="confirmAddGroup">确定</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
