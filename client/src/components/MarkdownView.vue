<script setup>
/**
 * Markdown 渲染组件: 双链 [[x]] 与 #标签 高亮,点击跳转
 * 代码块内容不做替换,避免误伤
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import MarkdownIt from 'markdown-it';

const props = defineProps({ content: { type: String, default: '' } });
const router = useRouter();

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

/** 按 ``` 分段,仅对非代码段替换 双链/标签 为临时链接 */
function preprocess(src) {
  return src
    .split(/(```[\s\S]*?```)/g)
    .map((seg) => {
      if (seg.startsWith('```')) return seg;
      return seg
        .replace(/\[\[([^\[\]]+?)\]\]/g, (_, t) => `[${t}](wl:${encodeURIComponent(t.trim())})`)
        .replace(/(^|[\s(（【>])#([\p{L}\p{N}_\-]{1,30})/gu, (m, pre, tag) => `${pre}[＃${tag}](tg:${encodeURIComponent(tag)})`);
    })
    .join('');
}

const defaultLink = md.renderer.rules.link_open || ((tokens, idx, opts, _, self) => self.renderToken(tokens, idx, opts));
md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
  const href = tokens[idx].attrGet('href') || '';
  if (href.startsWith('wl:')) {
    tokens[idx].attrSet('href', 'javascript:void(0)');
    tokens[idx].attrSet('class', 'wikilink');
    tokens[idx].attrSet('data-wikilink', decodeURIComponent(href.slice(3)));
  } else if (href.startsWith('tg:')) {
    tokens[idx].attrSet('href', 'javascript:void(0)');
    tokens[idx].attrSet('class', 'hashtag');
    tokens[idx].attrSet('data-tag', decodeURIComponent(href.slice(3)));
  }
  return defaultLink(tokens, idx, opts, env, self);
};

const html = computed(() => md.render(preprocess(props.content)));

function onClick(e) {
  const a = e.target.closest('a');
  if (!a) return;
  if (a.dataset.wikilink !== undefined) {
    router.push({ name: 'home', query: { q: a.dataset.wikilink } });
  } else if (a.dataset.tag !== undefined) {
    router.push({ name: 'home', query: { tag: a.dataset.tag, folder: '' } });
  }
}
</script>

<template>
  <div class="md-view" v-html="html" @click="onClick"></div>
</template>
