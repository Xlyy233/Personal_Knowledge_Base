<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { store, refreshMeta } from '../store';

const route = useRoute();
const router = useRouter();
const searchQ = ref('');

const activeFolder = computed(() => route.query.folder ?? '');
const activeTag = computed(() => route.query.tag ?? '');

function goList(params) {
  router.push({ name: 'home', query: { ...route.query, ...params } });
}

function doSearch() {
  const q = searchQ.value.trim();
  if (!q) return;
  goList({ q, folder: '', tag: '' });
}

/* ---------- 文件夹树 ---------- */
const tree = computed(() => buildTree(store.folders));

function buildTree(list, parentId = null) {
  return list
    .filter((f) => f.parent_id === parentId)
    .map((f) => ({ ...f, children: buildTree(list, f.id) }));
}

const newFolderName = ref('');
const addingFolder = ref(false);
const renaming = ref(null); // { id, name }
const expanded = ref(new Set());

async function addFolder() {
  const name = newFolderName.value.trim();
  if (!name) return;
  await api.createFolder({ name });
  newFolderName.value = '';
  addingFolder.value = false;
  refreshMeta();
}

function startRename(f) {
  renaming.value = { id: f.id, name: f.name };
}

async function saveRename() {
  if (!renaming.value) return;
  await api.renameFolder(renaming.value.id, { name: renaming.value.name });
  renaming.value = null;
  refreshMeta();
}

async function removeFolder(f) {
  if (!confirm(`删除文件夹「${f.name}」?其中的笔记会移到根目录,不会丢失。`)) return;
  await api.deleteFolder(f.id);
  refreshMeta();
  if (String(activeFolder.value) === String(f.id)) goList({ folder: '' });
}

function toggleExpand(id) {
  expanded.value.has(id) ? expanded.value.delete(id) : expanded.value.add(id);
}
</script>

<template>
  <aside class="sidebar">
    <div class="logo">
      <div class="mark">知</div>
      <span>知识库</span>
      <span style="flex:1"></span>
      <router-link to="/graph" class="btn-icon" title="知识图谱">⬡</router-link>
    </div>

    <div style="display:flex;gap:8px;">
      <input
        v-model="searchQ"
        placeholder="搜索笔记…"
        style="flex:1;"
        @keyup.enter="doSearch"
      />
      <router-link to="/edit" class="primary" style="display:grid;place-items:center;width:38px;border-radius:8px;background:var(--accent-dim);color:#fff;text-decoration:none;font-size:18px;" title="新建笔记">＋</router-link>
    </div>

    <!-- 文件夹 -->
    <div>
      <div class="side-section-title">
        <span>文件夹</span>
        <button @click="addingFolder = !addingFolder" title="新建文件夹">＋</button>
      </div>
      <div v-if="addingFolder" style="display:flex;gap:6px;margin:4px 0 8px;">
        <input v-model="newFolderName" placeholder="文件夹名称" style="flex:1;font-size:13px;padding:5px 8px;" @keyup.enter="addFolder" />
        <button class="primary" style="padding:5px 10px;" @click="addFolder">建</button>
      </div>
      <div class="tree-item" :class="{ active: activeFolder === '' && !activeTag }" @click="goList({ folder: '', tag: '' })">
        <span>⌂</span><span class="name">全部笔记</span>
        <span class="count">{{ store.stats.notes }}</span>
      </div>
      <div class="tree-item" :class="{ active: activeFolder === 'root' }" @click="goList({ folder: 'root', tag: '' })">
        <span>▢</span><span class="name">未分类</span>
        <span class="count">{{ store.rootCount }}</span>
      </div>
      <template v-for="f in tree" :key="f.id">
        <div class="tree-item" :class="{ active: String(activeFolder) === String(f.id) }" @click="goList({ folder: f.id, tag: '' })">
          <span style="cursor:pointer;font-size:10px;" @click.stop="toggleExpand(f.id)">{{ f.children.length ? (expanded.has(f.id) ? '▾' : '▸') : '·' }}</span>
          <template v-if="renaming && renaming.id === f.id">
            <input v-model="renaming.name" style="flex:1;font-size:12px;padding:2px 6px;" @click.stop @keyup.enter="saveRename" @blur="saveRename" />
          </template>
          <template v-else>
            <span class="name">{{ f.name }}</span>
            <span class="count">{{ f.note_count }}</span>
            <span class="ops" @click.stop>
              <button @click="startRename(f)" title="重命名">✎</button>
              <button @click="removeFolder(f)" title="删除">✕</button>
            </span>
          </template>
        </div>
        <div class="tree-children" v-if="f.children.length && (expanded.has(f.id) || String(activeFolder) === String(f.id))">
          <div v-for="c in f.children" :key="c.id" class="tree-item" :class="{ active: String(activeFolder) === String(c.id) }" @click="goList({ folder: c.id, tag: '' })">
            <span>·</span><span class="name">{{ c.name }}</span>
            <span class="count">{{ c.note_count }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- 标签 -->
    <div v-if="store.tags.length">
      <div class="side-section-title"><span>标签</span></div>
      <div class="tag-cloud">
        <span
          v-for="t in store.tags.slice(0, 30)"
          :key="t.name"
          class="tag-chip"
          :style="activeTag === t.name ? 'border-color:var(--tag);background:rgba(56,189,248,.12)' : ''"
          @click="goList({ tag: activeTag === t.name ? '' : t.name, folder: '' })"
        >#{{ t.name }}<span class="n">{{ t.count }}</span></span>
      </div>
    </div>

    <div style="flex:1"></div>
    <div style="font-size:11px;color:var(--text-3);padding:0 6px;display:flex;gap:12px;">
      <span>笔记 {{ store.stats.notes }}</span>
      <span>链接 {{ store.stats.linked_notes }}</span>
    </div>
  </aside>
</template>
