import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Mock',
    component: () => import('../views/mock/MockLayout.vue'),
    redirect: '/workbench',
    children: [
      {
        path: 'workbench',
        name: 'MockWorkbench',
        component: () => import('../views/mock/Workbench.vue'),
      },
    ],
  },
];

const router = createRouter({
  // 在 Tauri 中使用 hash 模式
  history: createWebHashHistory(),
  routes,
});

export default router;
