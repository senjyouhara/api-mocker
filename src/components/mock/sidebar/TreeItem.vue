<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  ChevronRight,
  Folder,
  Plus,
  Pencil,
  Trash2,
  FolderPlus,
  GripVertical,
} from 'lucide-vue-next';
import VueDraggable from 'vuedraggable';
import { useCollectionStore } from '@/stores/mock/collection';
import { useRequestStore } from '@/stores/mock/request';
import { useSettingsStore } from '@/stores/mock/settings';
import { useMockRuleStore } from '@/stores/mock/rule';
import { useHistoryStore } from '@/stores/mock/history';
import type { TreeNode, ApiEndpoint } from '@/types/mock';
import { Button as UiButton } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogHeader as UiDialogHeader,
} from '@/components/ui/dialog';

const props = withDefaults(
  defineProps<{
    node: TreeNode;
    level?: number;
    draggable?: boolean;
  }>(),
  {
    level: 0,
    draggable: false,
  },
);

const store = useCollectionStore();
const requestStore = useRequestStore();
const settingsStore = useSettingsStore();
const mockRuleStore = useMockRuleStore();
const historyStore = useHistoryStore();
const expanded = ref(props.node.expanded ?? false);

// 监听 props.node.expanded 变化（搜索时自动展开/收起）
watch(
  () => props.node.expanded,
  (val) => {
    if (val !== undefined) {
      expanded.value = val;
    }
  },
);

// 子节点拖拽列表
const childList = computed({
  get: () => props.node.children || [],
  set: (val) => {
    // 分离分组和接口
    const groupIds = val.filter((n) => n.type === 'group').map((n) => n.id);
    const endpointIds = val.filter((n) => n.type === 'endpoint').map((n) => n.id);

    if (groupIds.length > 0) {
      store.updateGroupOrder(props.node.id, groupIds);
    }
    if (endpointIds.length > 0) {
      store.updateEndpointOrder(props.node.id, endpointIds);
    }
  },
});

// 判断分组是否包含当前选中的接口（递归检查子节点）
const containsActiveEndpoint = computed(() => {
  if (props.node.type !== 'group' || !store.activeEndpointId) return false;

  const checkChildren = (children: TreeNode[] | undefined): boolean => {
    if (!children) return false;
    for (const child of children) {
      if (child.type === 'endpoint' && child.id === store.activeEndpointId) {
        return true;
      }
      if (child.type === 'group' && checkChildren(child.children)) {
        return true;
      }
    }
    return false;
  };

  return checkChildren(props.node.children);
});

// 右键菜单状态
const showContextMenu = ref(false);
const menuPosition = ref({ x: 0, y: 0 });

// 编辑状态
const showRenameDialog = ref(false);
const editName = ref('');
const editError = ref('');

// 新建子分组状态
const showAddSubDialog = ref(false);
const newSubGroupName = ref('');

// 新建接口状态
const showAddEndpointDialog = ref(false);
const newEndpointName = ref('');
const addEndpointError = ref('');
const addSubError = ref('');

const toggle = () => {
  if (props.node.type === 'group') {
    expanded.value = !expanded.value;
  }
};

// 右键菜单
const onContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  menuPosition.value = { x: e.clientX, y: e.clientY };
  showContextMenu.value = true;
  document.addEventListener('click', closeMenu, { once: true });
};

const closeMenu = () => {
  showContextMenu.value = false;
};

// 开始编辑（打开重命名弹框）
const startEdit = () => {
  closeMenu();
  editName.value = props.node.name;
  editError.value = '';
  showRenameDialog.value = true;
};

// 确认编辑
const confirmEdit = () => {
  const name = editName.value.trim();
  if (!name) {
    editError.value = '名称不能为空';
    return;
  }

  if (props.node.type === 'group') {
    // 分组重命名校验
    if (store.isGroupNameDuplicate(name, props.node.parentId, props.node.id)) {
      editError.value = '分组名已存在';
      return;
    }
    store.renameGroup(props.node.id, name);
  } else {
    // 接口重命名校验
    const endpoint = props.node.data as ApiEndpoint;
    if (store.isEndpointNameDuplicate(name, endpoint.groupId, props.node.id)) {
      editError.value = '接口名已存在';
      return;
    }
    store.updateEndpoint(props.node.id, { name });
  }

  showRenameDialog.value = false;
};

// 取消编辑
const cancelEdit = () => {
  showRenameDialog.value = false;
  editError.value = '';
};

// 新建子分组
const openAddSubDialog = () => {
  closeMenu();
  newSubGroupName.value = '';
  addSubError.value = '';
  showAddSubDialog.value = true;
  expanded.value = true;
};

const confirmAddSubGroup = () => {
  const name = newSubGroupName.value.trim();
  if (!name) {
    addSubError.value = '请输入分组名称';
    return;
  }
  if (store.isGroupNameDuplicate(name, props.node.id)) {
    addSubError.value = '分组名已存在';
    return;
  }
  store.addGroup(name, props.node.id);
  showAddSubDialog.value = false;
};

// 新建接口
const openAddEndpointDialog = () => {
  closeMenu();
  newEndpointName.value = '';
  addEndpointError.value = '';
  showAddEndpointDialog.value = true;
  expanded.value = true;
};

const confirmAddEndpoint = () => {
  const name = newEndpointName.value.trim();
  if (!name) {
    addEndpointError.value = '请输入接口名称';
    return;
  }
  if (store.isEndpointNameDuplicate(name, props.node.id)) {
    addEndpointError.value = '接口名称已存在';
    return;
  }
  try {
    const endpoint = store.addEndpoint(props.node.id, name);
    showAddEndpointDialog.value = false;
    // 切换到新创建的接口
    store.setActiveEndpoint(endpoint.id);
    requestStore.loadFromEndpoint(endpoint);
    settingsStore.activeMainTab = 'request';
  } catch (e) {
    addEndpointError.value = (e as Error).message;
  }
};

// 点击节点
const onNodeClick = () => {
  if (props.node.type === 'group') {
    toggle();
  } else {
    store.setActiveEndpoint(props.node.id);
    requestStore.loadFromEndpoint(props.node.data as ApiEndpoint);
    // 切换到请求调试 Tab
    settingsStore.activeMainTab = 'request';
  }
};

// 删除节点
const deleteNode = () => {
  closeMenu();
  if (props.node.type === 'group') {
    // 删除分组，返回被删除的接口 ID 列表
    const deletedEndpointIds = store.deleteGroup(props.node.id);
    // 清理关联的 Mock 规则和历史记录
    deletedEndpointIds.forEach((id) => {
      mockRuleStore.deleteRulesByEndpoint(id);
      historyStore.deleteHistoriesByEndpoint(id);
    });
  } else {
    // 删除接口前先清理关联的 Mock 规则和历史记录
    mockRuleStore.deleteRulesByEndpoint(props.node.id);
    historyStore.deleteHistoriesByEndpoint(props.node.id);
    store.deleteEndpoint(props.node.id);
  }
  // 删除后加载新选中的接口数据
  if (store.activeEndpointId) {
    const newActiveEndpoint = store.activeEndpoint;
    if (newActiveEndpoint) {
      requestStore.loadFromEndpoint(newActiveEndpoint);
    }
  } else {
    requestStore.reset();
  }
};

// 获取接口方法颜色
const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'text-green-500',
    POST: 'text-yellow-500',
    PUT: 'text-blue-500',
    DELETE: 'text-red-500',
    PATCH: 'text-purple-500',
  };
  return colors[method] || 'text-muted-foreground';
};
</script>

<template>
  <div>
    <!-- 节点行 -->
    <div
      class="flex items-center h-7 px-1 rounded cursor-pointer hover:bg-muted text-sm group"
      :class="{
        'bg-muted': node.type === 'endpoint' && store.activeEndpointId === node.id,
        'bg-primary/10': containsActiveEndpoint,
      }"
      :style="{ paddingLeft: `${level * 12 + 4}px` }"
      @click="onNodeClick"
      @contextmenu="onContextMenu"
    >
      <!-- 拖拽手柄 -->
      <grip-vertical
        v-if="draggable"
        :size="12"
        class="drag-handle mr-1 text-foreground/40 opacity-60 group-hover:opacity-100 cursor-grab"
      />

      <!-- 展开箭头 -->
      <chevron-right
        v-if="node.type === 'group'"
        :size="14"
        class="mr-1 transition-transform text-muted-foreground"
        :class="{ 'rotate-90': expanded }"
      />
      <span v-else class="w-[14px] mr-1"></span>

      <!-- 图标/方法标签 -->
      <template v-if="node.type === 'group'">
        <folder :size="14" class="mr-1.5 text-primary" />
      </template>
      <template v-else>
        <span
          class="mr-1.5 text-[10px] font-bold w-8 text-center"
          :class="getMethodColor((node.data as ApiEndpoint).method)"
        >
          {{ (node.data as ApiEndpoint).method }}
        </span>
      </template>

      <!-- 名称 -->
      <span
        class="truncate flex-1"
        :title="
          node.type === 'endpoint'
            ? `${(node.data as ApiEndpoint).method} ${(node.data as ApiEndpoint).path}`
            : node.name
        "
      >{{ node.name }}</span
      >
    </div>

    <!-- 子节点（支持拖拽） -->
    <div v-if="expanded && node.type === 'group'">
      <vue-draggable
        v-model="childList"
        item-key="id"
        group="tree"
        :animation="200"
        ghost-class="opacity-50"
        handle=".drag-handle"
      >
        <template #item="{ element }">
          <tree-item :node="element" :level="level + 1" :draggable="true" />
        </template>
      </vue-draggable>
    </div>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div
        v-if="showContextMenu"
        class="fixed z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1 min-w-32"
        :style="{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }"
      >
        <!-- 分组菜单 -->
        <template v-if="node.type === 'group'">
          <ui-button
            variant="ghost"
            class="w-full justify-start h-8 px-3 text-foreground"
            @click="openAddEndpointDialog"
          >
            <plus :size="14" />
            新建接口
          </ui-button>
          <ui-button
            variant="ghost"
            class="w-full justify-start h-8 px-3 text-foreground"
            @click="openAddSubDialog"
          >
            <folder-plus :size="14" />
            新建子分组
          </ui-button>
          <ui-button
            variant="ghost"
            class="w-full justify-start h-8 px-3 text-foreground"
            @click="startEdit"
          >
            <pencil :size="14" />
            重命名
          </ui-button>
          <div class="border-t border-border my-1"></div>
          <ui-button
            variant="ghost"
            class="w-full justify-start h-8 px-3 text-destructive"
            @click="deleteNode"
          >
            <trash2 :size="14" />
            删除
          </ui-button>
        </template>
        <!-- 接口菜单 -->
        <template v-else>
          <ui-button
            variant="ghost"
            class="w-full justify-start h-8 px-3 text-foreground"
            @click="startEdit"
          >
            <pencil :size="14" />
            重命名
          </ui-button>
          <div class="border-t border-border my-1"></div>
          <ui-button
            variant="ghost"
            class="w-full justify-start h-8 px-3 text-destructive"
            @click="deleteNode"
          >
            <trash2 :size="14" />
            删除
          </ui-button>
        </template>
      </div>
    </teleport>

    <!-- 新建子分组对话框 -->
    <ui-dialog v-model:open="showAddSubDialog">
      <ui-dialog-content class="w-80">
        <ui-dialog-header>
          <h3 class="font-bold text-lg">新建子分组</h3>
        </ui-dialog-header>
        <ui-input
          v-model="newSubGroupName"
          placeholder="请输入分组名称"
          @keyup.enter="confirmAddSubGroup"
        />
        <p v-if="addSubError" class="text-destructive text-sm mt-2">{{ addSubError }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <ui-button variant="outline" @click="showAddSubDialog = false">取消</ui-button>
          <ui-button @click="confirmAddSubGroup">确定</ui-button>
        </div>
      </ui-dialog-content>
    </ui-dialog>

    <!-- 新建接口对话框 -->
    <ui-dialog v-model:open="showAddEndpointDialog">
      <ui-dialog-content class="w-80">
        <ui-dialog-header>
          <h3 class="font-bold text-lg">新建接口</h3>
        </ui-dialog-header>
        <ui-input
          v-model="newEndpointName"
          placeholder="请输入接口名称"
          @keyup.enter="confirmAddEndpoint"
        />
        <p v-if="addEndpointError" class="text-destructive text-sm mt-2">{{ addEndpointError }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <ui-button variant="outline" @click="showAddEndpointDialog = false">取消</ui-button>
          <ui-button @click="confirmAddEndpoint">确定</ui-button>
        </div>
      </ui-dialog-content>
    </ui-dialog>

    <!-- 重命名对话框 -->
    <ui-dialog v-model:open="showRenameDialog">
      <ui-dialog-content class="w-80">
        <ui-dialog-header>
          <h3 class="font-bold text-lg">
            {{ node.type === 'group' ? '重命名分组' : '重命名接口' }}
          </h3>
        </ui-dialog-header>
        <ui-input v-model="editName" placeholder="请输入名称" @keyup.enter="confirmEdit" />
        <p v-if="editError" class="text-destructive text-sm mt-2">{{ editError }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <ui-button variant="outline" @click="cancelEdit">取消</ui-button>
          <ui-button @click="confirmEdit">确定</ui-button>
        </div>
      </ui-dialog-content>
    </ui-dialog>
  </div>
</template>
