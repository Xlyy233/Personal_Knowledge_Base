<script setup>
/**
 * 笔记编辑器: 分屏编辑/预览 + 草稿自动保存(localStorage,防刷新丢失)
 * 标签与双链在正文中直接书写: #标签 / [[笔记名]]
 */
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { refreshMeta, store } from '../store';
import MarkdownView from '../components/MarkdownView.vue';
import { debounce } from '../utils';

const route = useRoute();
const router = useRouter();

const noteId = computed(() => (route.params.id ? Number(route.params.id) : null));
const content = ref('');
const title = ref('');
const folderId = ref(null);
const saving = ref(false);
const savedDraft = ref(false);

const DRAFT_KEY = computed(() => `pkb-draft-${noteId.value ?? 'new'}`);

/** 草稿自动保存 */
const saveDraft = debounce(() => {
  localStorage.setItem(DRAFT_KEY.value, JSON.stringify({ content: content.value, title: title.value, folder_id: folderId.value, at: Date.now() }));
  savedDraft.value = true;
}, 500);

watch([content, title, folderId], saveDraft);

function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY.value);
  if (!raw) return false;
  const d = JSON.parse(raw);
  content.value = d.content || '';
  title.value = d.title || '';
  folderId.value = d.folder_id ?? null;
  return true;
}

onMounted(async () => {
  if (noteId.value) {
    const n = await api.note(noteId.value);
    const hadDraft = restoreDraft();
    if (!hadDraft) {
      content.value = n.content;
      title.value = n.title;
      folderId.value = n.folder_id;
    }
  } else {
    restoreDraft();
    // 从图谱 ghost 节点跳转: 预填标题
    if (route.query.title) title.value = route.query.title;
  }
});

onBeforeUnmount(() => {
  if (!content.value.trim()) localStorage.removeItem(DRAFT_KEY.value);
});

function insertSnippet(s) {
  content.value += s;
}

async function save() {
  if (!content.value.trim()) {
    alert('写点内容再保存吧');
    return;
  }
  saving.value = true;
  try {
    const data = { content: content.value, title: title.value.trim(), folder_id: folderId.value };
    let n;
    if (noteId.value) n = await api.updateNote(noteId.value, data);
    else n = await api.createNote(data);
    localStorage.removeItem(DRAFT_KEY.value);
    refreshMeta();
    router.push(`/note/${n.id}`);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="content">
    <div class="editor-wrap">
      <div class="editor-toolbar">
        <input v-model="title" placeholder="标题(留空则取正文首行)" style="flex:1;font-weight:600;" />
        <select v-model="folderId">
          <option :value="null">未分类</option>
          <option v-for="f in store.folders" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
        <button class="primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        <button class="ghost" @click="router.back()">取消</button>
      </div>

      <div class="editor-hint">
        语法: <code>#标签</code> 自动归档 · <code>[[笔记名]]</code> 创建双链 · <code>```代码```</code>
        <span v-if="savedDraft" style="color:var(--accent-dim);">· 草稿已自动保存</span>
        <span style="float:right;">
          <a href="javascript:void(0)" @click.prevent="insertSnippet('\n\n## 小节标题\n\n')">+小节</a> ·
          <a href="javascript:void(0)" @click.prevent="insertSnippet('\n- 列表项\n')">+列表</a> ·
          <a href="javascript:void(0)" @click.prevent="insertSnippet('\n> 引用\n')">+引用</a>
        </span>
      </div>

      <div class="editor-split">
        <textarea
          v-model="content"
          placeholder="落笔即知识…&#10;&#10;#标签 可以归档&#10;[[笔记名]] 可以双链&#10;支持完整 Markdown 语法"
          spellcheck="false"
        ></textarea>
        <div class="editor-preview">
          <div v-if="!content.trim()" style="color:var(--text-3);font-size:13px;">实时预览区</div>
          <MarkdownView v-else :content="content" />
        </div>
      </div>
    </div>
  </div>
</template>
