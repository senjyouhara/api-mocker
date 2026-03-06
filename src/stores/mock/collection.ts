import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Group, ApiEndpoint, TreeNode, HttpMethod } from '@/types/mock';

export const useCollectionStore = defineStore(
  'collection',
  () => {
    // 状态
    const groups = ref<Group[]>([]);
    const endpoints = ref<ApiEndpoint[]>([]);
    const activeEndpointId = ref<string | null>(null);
    const searchKeyword = ref('');

    // 搜索过滤后的接口 ID 集合
    const matchedEndpointIds = computed(() => {
      if (!searchKeyword.value.trim()) return null;
      const keyword = searchKeyword.value.toLowerCase();
      return new Set(
        endpoints.value
          .filter(
            (e) =>
              e.name.toLowerCase().includes(keyword) ||
              e.path.toLowerCase().includes(keyword) ||
              e.method.toLowerCase().includes(keyword),
          )
          .map((e) => e.id),
      );
    });

    // 获取包含匹配接口的分组 ID 集合
    const matchedGroupIds = computed(() => {
      if (!matchedEndpointIds.value) return null;
      const groupIds = new Set<string>();

      // 获取匹配接口所属的分组及其所有父分组
      const addParentGroups = (groupId: string) => {
        groupIds.add(groupId);
        const group = groups.value.find((g) => g.id === groupId);
        if (group?.parentId) {
          addParentGroups(group.parentId);
        }
      };

      endpoints.value
        .filter((e) => matchedEndpointIds.value!.has(e.id))
        .forEach((e) => addParentGroups(e.groupId));

      return groupIds;
    });

    // 构建树结构（包含分组和接口）
    const treeData = computed<TreeNode[]>(() => {
      const buildTree = (parentId: string | null): TreeNode[] => {
        const result: TreeNode[] = [];

        // 添加分组
        groups.value
          .filter((g) => g.parentId === parentId)
          .filter((g) => !matchedGroupIds.value || matchedGroupIds.value.has(g.id))
          .sort((a, b) => a.order - b.order)
          .forEach((group) => {
            // 获取该分组下的接口
            const groupEndpoints = endpoints.value
              .filter((e) => e.groupId === group.id)
              .filter((e) => !matchedEndpointIds.value || matchedEndpointIds.value.has(e.id))
              .sort((a, b) => a.order - b.order)
              .map((ep) => ({
                id: ep.id,
                type: 'endpoint' as const,
                name: ep.name,
                parentId: group.id,
                data: ep,
              }));

            result.push({
              id: group.id,
              type: 'group',
              name: group.name,
              parentId: group.parentId,
              data: group,
              children: [...buildTree(group.id), ...groupEndpoints],
              expanded: !!searchKeyword.value.trim(),
            });
          });

        return result;
      };

      return buildTree(null);
    });

    // 检查分组名是否重复
    const isGroupNameDuplicate = (name: string, parentId: string | null, excludeId?: string) => {
      return groups.value.some(
        (g) => g.name === name && g.parentId === parentId && g.id !== excludeId,
      );
    };

    // 检查接口 URL 是否重复（method + path 组合必须唯一）
    const isEndpointUrlDuplicate = (method: HttpMethod, path: string, excludeId?: string) => {
      return endpoints.value.some(
        (e) => e.method === method && e.path === path && e.id !== excludeId,
      );
    };

    // 检查接口名称是否重复（同一分组内名称唯一）
    const isEndpointNameDuplicate = (name: string, groupId: string, excludeId?: string) => {
      return endpoints.value.some(
        (e) => e.name === name && e.groupId === groupId && e.id !== excludeId,
      );
    };

    // 获取重复的接口信息
    const getDuplicateEndpoint = (method: HttpMethod, path: string, excludeId?: string) => {
      return endpoints.value.find(
        (e) => e.method === method && e.path === path && e.id !== excludeId,
      );
    };

    // 获取分组的完整路径名称（如：父分组/子分组）
    const getGroupFullPath = (groupId: string): string => {
      const paths: string[] = [];
      let currentId: string | null = groupId;
      while (currentId) {
        const group = groups.value.find((g) => g.id === currentId);
        if (group) {
          paths.unshift(group.name);
          currentId = group.parentId;
        } else {
          break;
        }
      }
      return paths.join('/');
    };

    // 添加分组
    const addGroup = (name: string, parentId: string | null = null) => {
      if (isGroupNameDuplicate(name, parentId)) {
        throw new Error('分组名已存在');
      }
      const now = Date.now();
      const group: Group = {
        id: crypto.randomUUID(),
        name,
        parentId,
        order: groups.value.filter((g) => g.parentId === parentId).length,
        createdAt: now,
        updatedAt: now,
      };
      groups.value.push(group);
      return group;
    };

    // 重命名分组
    const renameGroup = (id: string, newName: string) => {
      const group = groups.value.find((g) => g.id === id);
      if (!group) return;
      if (isGroupNameDuplicate(newName, group.parentId, id)) {
        throw new Error('分组名已存在');
      }
      group.name = newName;
      group.updatedAt = Date.now();
    };

    // 删除分组（递归删除子分组）
    const deleteGroup = (id: string) => {
      // 收集所有要删除的接口 ID
      const deletedEndpointIds: string[] = [];

      const deleteRecursive = (groupId: string) => {
        // 先删除子分组
        const children = groups.value.filter((g) => g.parentId === groupId);
        children.forEach((child) => deleteRecursive(child.id));
        // 收集该分组下的接口 ID
        endpoints.value
          .filter((e) => e.groupId === groupId)
          .forEach((e) => deletedEndpointIds.push(e.id));
        // 删除该分组下的接口
        endpoints.value = endpoints.value.filter((e) => e.groupId !== groupId);
        // 删除分组本身
        const index = groups.value.findIndex((g) => g.id === groupId);
        if (index !== -1) {
          groups.value.splice(index, 1);
        }
      };
      deleteRecursive(id);

      // 如果当前选中的接口被删除，自动选择下一个
      if (activeEndpointId.value && deletedEndpointIds.includes(activeEndpointId.value)) {
        if (endpoints.value.length > 0) {
          activeEndpointId.value = endpoints.value[0].id;
        } else {
          activeEndpointId.value = null;
        }
      }

      // 返回被删除的接口 ID 列表，供调用方清理关联数据
      return deletedEndpointIds;
    };

    // ========== 接口 CRUD ==========

    // 添加接口
    const addEndpoint = (
      groupId: string,
      name: string,
      method: HttpMethod = 'GET',
      path: string = '',
    ) => {
      const now = Date.now();
      const endpoint: ApiEndpoint = {
        id: crypto.randomUUID(),
        groupId,
        name,
        method,
        path,
        order: endpoints.value.filter((e) => e.groupId === groupId).length,
        createdAt: now,
        updatedAt: now,
      };
      endpoints.value.push(endpoint);
      return endpoint;
    };

    // 更新接口
    const updateEndpoint = (
      id: string,
      updates: Partial<Omit<ApiEndpoint, 'id' | 'createdAt'>>,
    ) => {
      const endpoint = endpoints.value.find((e) => e.id === id);
      if (!endpoint) return;
      Object.assign(endpoint, updates, { updatedAt: Date.now() });
    };

    // 删除接口
    const deleteEndpoint = (id: string) => {
      const index = endpoints.value.findIndex((e) => e.id === id);
      if (index === -1) return;

      const deletedEndpoint = endpoints.value[index];
      const isActive = activeEndpointId.value === id;

      // 删除接口
      endpoints.value.splice(index, 1);

      // 如果删除的是当前选中的接口，自动选择下一个
      if (isActive) {
        // 优先选择同分组的下一个接口
        const sameGroupEndpoints = endpoints.value
          .filter((e) => e.groupId === deletedEndpoint.groupId)
          .sort((a, b) => a.order - b.order);

        if (sameGroupEndpoints.length > 0) {
          activeEndpointId.value = sameGroupEndpoints[0].id;
        } else if (endpoints.value.length > 0) {
          // 没有同分组接口，选择第一个接口
          activeEndpointId.value = endpoints.value[0].id;
        } else {
          activeEndpointId.value = null;
        }
      }
    };

    // 设置当前激活的接口
    const setActiveEndpoint = (id: string | null) => {
      activeEndpointId.value = id;
    };

    // 获取当前激活的接口
    const activeEndpoint = computed(() => {
      if (!activeEndpointId.value) return null;
      return endpoints.value.find((e) => e.id === activeEndpointId.value) || null;
    });

    // ========== 排序功能 ==========

    // 更新分组顺序
    const updateGroupOrder = (parentId: string | null, orderedIds: string[]) => {
      orderedIds.forEach((id, index) => {
        const group = groups.value.find((g) => g.id === id);
        if (group) {
          group.order = index;
          group.updatedAt = Date.now();
        }
      });
    };

    // 更新接口顺序
    const updateEndpointOrder = (groupId: string, orderedIds: string[]) => {
      orderedIds.forEach((id, index) => {
        const endpoint = endpoints.value.find((e) => e.id === id);
        if (endpoint) {
          endpoint.order = index;
          endpoint.updatedAt = Date.now();
        }
      });
    };

    // 移动分组到新父级
    const moveGroup = (groupId: string, newParentId: string | null) => {
      const group = groups.value.find((g) => g.id === groupId);
      if (group && group.parentId !== newParentId) {
        group.parentId = newParentId;
        group.order = groups.value.filter((g) => g.parentId === newParentId).length;
        group.updatedAt = Date.now();
      }
    };

    // 移动接口到新分组
    const moveEndpoint = (endpointId: string, newGroupId: string) => {
      const endpoint = endpoints.value.find((e) => e.id === endpointId);
      if (endpoint && endpoint.groupId !== newGroupId) {
        endpoint.groupId = newGroupId;
        endpoint.order = endpoints.value.filter((e) => e.groupId === newGroupId).length;
        endpoint.updatedAt = Date.now();
      }
    };

    return {
      groups,
      endpoints,
      activeEndpointId,
      searchKeyword,
      treeData,
      isGroupNameDuplicate,
      isEndpointUrlDuplicate,
      isEndpointNameDuplicate,
      getDuplicateEndpoint,
      getGroupFullPath,
      addGroup,
      renameGroup,
      deleteGroup,
      addEndpoint,
      updateEndpoint,
      deleteEndpoint,
      setActiveEndpoint,
      activeEndpoint,
      updateGroupOrder,
      updateEndpointOrder,
      moveGroup,
      moveEndpoint,
    };
  },
  {
    persist: {
      key: 'mock-collection',
      pick: ['groups', 'endpoints', 'activeEndpointId'],
    },
  },
);
