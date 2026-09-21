<script setup>
/** 帖子流卡片 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { excerpt, fmtTime } from '../utils';
import { store } from '../store';

const props = defineProps({ note: { type: Object, required: true } });
const router = useRouter();

const folderLabel = computed(() => {
  if (props.note.folder_id == null) return '未分类';
  const f = store.folders.find((x) => x.id === props.note.folder_id);
  return f ? f.name : '未分类';
});

function open() {
  router.push(`/note/${props.note.id}`);
}
</script>

<template>
  <article class="note-card" @click="open">
    <div class="nc-title">
      <span v-if="note.pinned" class="nc-pin" title="已置顶">◈</span>
      {{ note.title }}
    </div>
    <div class="nc-excerpt" v-if="excerpt(note.content)">{{ excerpt(note.content) }}</div>
    <div class="nc-meta">
      <span class="folder">▣ {{ folderLabel }}</span>
      <span v-for="t in note.tags.slice(0, 5)" :key="t" class="tag-chip">#{{ t }}</span>
      <span style="flex:1"></span>
      <span>{{ fmtTime(note.updated_at) }}</span>
    </div>
  </article>
</template>
