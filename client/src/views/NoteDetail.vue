<script setup>
/** 笔记详情: Markdown 渲染 + 元信息 + 正链/反链面板 */
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { refreshMeta } from '../store';
import { fmtTime } from '../utils';
import { store } from '../store';
import MarkdownView from '../components/MarkdownView.vue';

const route = useRoute();
const router = useRouter();
const note = ref(null);
const notFound = ref(false);

const folderLabel = ref('未分类');

async function load() {
  try {
    note.value = await api.note(route.params.id);
    const f = store.folders.find((x) => x.id === note.value.folder_id);
    folderLabel.value = f ? f.name : '未分类';
  } catch {
    notFound.value = true;
  }
}

async function togglePin() {
  note.value = await api.pinNote(note.value.id);
  refreshMeta();
}

async function remove() {
  if (!confirm('确定删除这条笔记?')) return;
  await api.deleteNote(note.value.id);
  refreshMeta();
  router.push('/');
}

/** 点击 ghost 链接(未创建)时,以标题搜索 */
function openLink(l) {
  if (l.note_id) router.push(`/note/${l.note_id}`);
  else router.push({ name: 'home', query: { q: l.title } });
}

onMounted(load);
</script>

<template>
  <div class="content">
    <div v-if="notFound" class="empty-state">
      <div class="icon">✕</div>
      <p>笔记不存在或已删除</p>
      <router-link to="/" style="margin-top:10px;display:inline-block;">← 返回列表</router-link>
    </div>

    <template v-else-if="note">
      <div class="detail-meta">
        <span>▣ {{ folderLabel }}</span>
        <span>·</span>
        <span>更新于 {{ fmtTime(note.updated_at) }}</span>
        <span style="flex:1"></span>
        <button class="ghost" @click="togglePin">{{ note.pinned ? '取消置顶' : '置顶' }}</button>
        <button class="ghost" @click="router.push(`/edit/${note.id}`)">编辑</button>
        <button class="ghost danger" @click="remove">删除</button>
        <button class="ghost" @click="router.back()">返回</button>
      </div>

      <h1 style="font-size:24px;margin-bottom:8px;display:flex;gap:10px;align-items:center;">
        <span v-if="note.pinned" style="color:var(--accent);font-size:16px;">◈</span>{{ note.title }}
      </h1>

      <div v-if="note.tags.length" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;">
        <span v-for="t in note.tags" :key="t" class="tag-chip"
          @click="router.push({ name: 'home', query: { tag: t, folder: '' } })">#{{ t }}</span>
      </div>

      <MarkdownView :content="note.content" />

      <!-- 正向链接 -->
      <div class="backlinks" v-if="note.forward_links.length">
        <h3>链接到 LINKS OUT</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <span v-for="l in note.forward_links" :key="l.title"
            class="tag-chip" :style="!l.note_id ? 'color:var(--text-3);border-style:dashed;' : ''"
            :title="l.note_id ? '跳转笔记' : '该笔记尚未创建'"
            @click="openLink(l)">{{ l.title }}{{ l.note_id ? '' : ' ✚' }}</span>
        </div>
      </div>

      <!-- 反向链接 -->
      <div class="backlinks" v-if="note.backlinks.length">
        <h3>被引用 BACKLINKS ({{ note.backlinks.length }})</h3>
        <div v-for="b in note.backlinks" :key="b.id" class="bl-item" @click="router.push(`/note/${b.id}`)">
          <div class="t">{{ b.title }}</div>
          <div class="s">{{ b.snippet }}</div>
        </div>
      </div>
    </template>

    <div v-else class="loading">加载中</div>
  </div>
</template>
