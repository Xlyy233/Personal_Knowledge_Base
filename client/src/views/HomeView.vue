<script setup>
/** 帖子流首页: 文件夹/标签/搜索筛选 + 卡片流 */
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { store, refreshMeta } from '../store';
import NoteCard from '../components/NoteCard.vue';

const route = useRoute();
const router = useRouter();
const notes = ref([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

const folder = computed(() => route.query.folder ?? '');
const tag = computed(() => route.query.tag ?? '');
const q = computed(() => route.query.q ?? '');

const folderLabel = computed(() => {
  if (folder.value === '') return '全部笔记';
  if (folder.value === 'root') return '未分类';
  const f = store.folders.find((x) => String(x.id) === String(folder.value));
  return f ? f.name : '';
});

const heading = computed(() => {
  if (q.value) return `搜索「${q.value}」`;
  if (tag.value) return `#${tag.value}`;
  return folderLabel.value;
});

async function load() {
  loading.value = true;
  const params = { page: page.value, limit: 30 };
  if (folder.value !== '') params.folder = folder.value;
  if (tag.value) params.tag = tag.value;
  if (q.value) params.q = q.value;
  const r = await api.notes(params);
  notes.value = r.notes;
  total.value = r.total;
  loading.value = false;
}

watch(() => route.query, () => { page.value = 1; load(); }, { immediate: true });
refreshMeta();
</script>

<template>
  <div class="content">
    <div class="feed-header">
      <div>
        <h1>{{ heading }}</h1>
        <div class="sub">{{ total }} 条笔记</div>
      </div>
      <router-link to="/edit" class="primary" style="padding:8px 16px;border-radius:8px;background:var(--accent-dim);color:#fff;text-decoration:none;font-size:13.5px;">＋ 记笔记</router-link>
    </div>

    <div v-if="loading" class="loading">加载中</div>

    <template v-else>
      <div v-if="!notes.length" class="empty-state">
        <div class="icon">✦</div>
        <p v-if="q">没有找到相关笔记,换个关键词试试</p>
        <p v-else>这里还没有笔记<br/>点击「记笔记」写下第一条,支持 <code style="color:var(--accent)">#标签</code> 和 <code style="color:var(--accent)">[[双链]]</code></p>
      </div>

      <NoteCard v-for="n in notes" :key="n.id" :note="n" />

      <div v-if="total > 30" style="display:flex;gap:10px;justify-content:center;margin-top:20px;">
        <button :disabled="page <= 1" @click="page--; load()">上一页</button>
        <span style="align-self:center;font-size:12.5px;color:var(--text-3);">{{ page }} / {{ Math.ceil(total / 30) }}</span>
        <button :disabled="page >= Math.ceil(total / 30)" @click="page++; load()">下一页</button>
      </div>
    </template>
  </div>
</template>
