import { reactive } from 'vue';
import { api } from './api';

/** 全局共享状态: 侧边栏数据(文件夹/标签/统计),笔记变更后统一刷新 */
export const store = reactive({
  folders: [],
  rootCount: 0,
  tags: [],
  stats: { notes: 0, folders: 0, linked_notes: 0 },
  sidebarOpen: false, // 移动端抽屉
});

export async function refreshMeta() {
  const [f, t, s] = await Promise.all([api.folders(), api.tags(), api.stats()]);
  store.folders = f.folders;
  store.rootCount = f.root_count;
  store.tags = t;
  store.stats = s;
}
