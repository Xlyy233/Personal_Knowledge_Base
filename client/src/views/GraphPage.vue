<script setup>
/** 知识图谱页 */
import { ref, onMounted } from 'vue';
import { api } from '../api';
import GraphCanvas from '../components/GraphCanvas.vue';

const graph = ref({ nodes: [], edges: [] });
const loading = ref(true);

onMounted(async () => {
  graph.value = await api.graph();
  loading.value = false;
});
</script>

<template>
  <div class="content graph-page">
    <div class="feed-header">
      <div>
        <h1>知识图谱</h1>
        <div class="sub">{{ graph.nodes.length }} 个节点 · {{ graph.edges.length }} 条链接 · 拖拽节点 / 滚轮缩放 / 点击跳转</div>
      </div>
    </div>
    <div style="flex:1;position:relative;min-height:0;">
      <div v-if="loading" class="loading">构建图谱中</div>
      <div v-else-if="!graph.edges.length" class="empty-state" style="padding:60px;">
        <div class="icon">⬡</div>
        <p>还没有笔记之间的链接<br/>在笔记中写 <code style="color:var(--accent)">[[笔记名]]</code> 即可建立连接</p>
      </div>
      <GraphCanvas v-else :nodes="graph.nodes" :edges="graph.edges" />
    </div>
  </div>
</template>
