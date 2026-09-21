<script setup>
/**
 * 知识图谱: d3-force 力导向布局 + canvas 渲染
 * 支持拖拽节点 / 滚轮缩放 / 点击跳转 / ghost 节点(未创建的笔记)
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide, forceX, forceY } from 'd3-force';

const props = defineProps({ nodes: Array, edges: Array });
const router = useRouter();
const wrapEl = ref(null);
const canvasEl = ref(null);
let ctx, sim, width, height;
let transform = { k: 1, x: 0, y: 0 };
let hoverNode = null;
let dragNode = null;
let panning = false;
let lastPt = null;
let raf = 0;

function init() {
  const canvas = canvasEl.value;
  ctx = canvas.getContext('2d');
  resize();

  const nodes = props.nodes.map((n) => ({
    ...n,
    x: width / 2 + (Math.random() - 0.5) * width * 0.5,
    y: height / 2 + (Math.random() - 0.5) * height * 0.5,
  }));
  const key2node = new Map(nodes.map((n) => [n.ghost ? 'g' + n.title : String(n.id), n]));
  const links = props.edges
    .map((e) => ({
      source: key2node.get(String(e.source)) || nodes.find((n) => String(n.id) === String(e.source)),
      target: key2node.get(String(e.target)),
    }))
    .filter((l) => l.source && l.target);

  canvas._nodes = nodes;
  canvas._links = links;

  sim = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(-240))
    .force('link', forceLink(links).distance(95).strength(0.35))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide().radius(28))
    .force('x', forceX(width / 2).strength(0.05))
    .force('y', forceY(height / 2).strength(0.06))
    .on('tick', scheduleDraw);

  bindEvents();
  draw();
}

function resize() {
  const canvas = canvasEl.value;
  const r = wrapEl.value.getBoundingClientRect();
  width = r.width;
  height = r.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function scheduleDraw() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; draw(); });
}

function draw() {
  if (!ctx) return;
  const canvas = canvasEl.value;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.k, transform.k);

  const links = canvas._links || [];
  const nodes = canvas._nodes || [];

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of links) {
    ctx.moveTo(l.source.x, l.source.y);
    ctx.lineTo(l.target.x, l.target.y);
  }
  ctx.stroke();

  for (const n of nodes) {
    const r = n.ghost ? 4 : (n.tags?.length ? 6 + Math.min(n.tags.length, 5) : 6);
    if (n.ghost) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(143, 163, 189, 0.55)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(n.x, n.y, 1, n.x, n.y, r);
      grad.addColorStop(0, hoverNode === n ? '#a5f3fc' : '#67e8f9');
      grad.addColorStop(1, '#0e7490');
      ctx.fillStyle = grad;
      ctx.fill();
      if (hoverNode === n) {
        ctx.strokeStyle = 'rgba(34,211,238,.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    const isHover = hoverNode === n;
    ctx.font = `${isHover ? '600 13px' : '11.5px'} sans-serif`;
    ctx.fillStyle = n.ghost ? 'rgba(143,163,189,.8)' : isHover ? '#22d3ee' : '#dbe4f0';
    ctx.textAlign = 'center';
    let label = n.title;
    if (label.length > 12) label = label.slice(0, 11) + '…';
    ctx.fillText(label, n.x, n.y + r + 14);
  }
  ctx.restore();
}

function toWorld(e) {
  const rect = canvasEl.value.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  return { wx: (x - transform.x) / transform.k, wy: (y - transform.y) / transform.k, x, y };
}

function nodeAt(wx, wy) {
  const nodes = canvasEl.value._nodes || [];
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const r = n.ghost ? 7 : 10;
    if ((wx - n.x) ** 2 + (wy - n.y) ** 2 < r * r) return n;
  }
  return null;
}

function bindEvents() {
  const canvas = canvasEl.value;

  canvas.addEventListener('pointerdown', (e) => {
    const { wx, wy, x, y } = toWorld(e);
    const n = nodeAt(wx, wy);
    if (n) {
      dragNode = n;
      if (sim) sim.alphaTarget(0.25).restart();
    } else {
      panning = true;
    }
    lastPt = { x, y };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    const { wx, wy, x, y } = toWorld(e);
    if (dragNode) {
      dragNode.fx = wx;
      dragNode.fy = wy;
    } else if (panning) {
      transform.x += x - lastPt.x;
      transform.y += y - lastPt.y;
      lastPt = { x, y };
    } else {
      hoverNode = nodeAt(wx, wy);
      canvas.style.cursor = hoverNode ? 'pointer' : 'grab';
    }
    scheduleDraw();
  });

  canvas.addEventListener('pointerup', (e) => {
    if (dragNode) {
      dragNode.fx = null;
      dragNode.fy = null;
      if (sim) sim.alphaTarget(0);
      dragNode = null;
    }
    panning = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { x, y } = toWorld(e);
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const k = Math.min(4, Math.max(0.25, transform.k * factor));
    transform.x = x - ((x - transform.x) / transform.k) * k;
    transform.y = y - ((y - transform.y) / transform.k) * k;
    transform.k = k;
    scheduleDraw();
  }, { passive: false });

  canvas.addEventListener('click', (e) => {
    const { wx, wy } = toWorld(e);
    const n = nodeAt(wx, wy);
    if (!n) return;
    if (!n.ghost) router.push(`/note/${n.id}`);
    else router.push({ name: 'edit', query: { title: n.title } });
  });

  window.addEventListener('resize', onResize);
}

function onResize() {
  resize();
  scheduleDraw();
}

onMounted(init);
onBeforeUnmount(() => {
  if (sim) sim.stop();
  cancelAnimationFrame(raf);
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div class="graph-canvas-wrap" ref="wrapEl">
    <canvas ref="canvasEl"></canvas>
    <div class="graph-legend">
      <span><i style="background:#22d3ee;"></i>笔记</span>
      <span><i style="background:transparent;border:1px dashed #8fa3bd;"></i>未创建(点击新建)</span>
    </div>
  </div>
</template>
