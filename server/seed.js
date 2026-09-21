/** 初始化示例数据: 模拟真实使用场景(仅当库为空时写入) */
const { db } = require('./db');

const count = db.prepare('SELECT COUNT(*) c FROM notes').get().c;
if (count > 0) {
  console.log('库中已有笔记,跳过种子数据');
  process.exit(0);
}

const fTech = db.prepare('INSERT INTO folders (name) VALUES (?)').run('技术');
const fLife = db.prepare('INSERT INTO folders (name) VALUES (?)').run('生活');
const fFE = db.prepare('INSERT INTO folders (name, parent_id) VALUES (?, ?)').run('前端', fTech.lastInsertRowid);

const seed = [
  {
    folder: fFE.lastInsertRowid,
    title: 'Vue3 组合式 API 心得',
    content: `## Vue3 组合式 API 心得

从 Options API 迁移到 Composition API 的核心收益: **逻辑聚合**。

\`\`\`js
// setup 中把同一功能的状态与方法放在一起
const count = ref(0);
const inc = () => count.value++;
\`\`\`

- \`ref\` 适合基本类型,\`reactive\` 适合对象
- \`computed\` 有缓存,优先用
- 相关笔记: [[前端性能优化清单]]、[[Markdown 渲染方案选型]]

#前端 #Vue3 #学习笔记`,
  },
  {
    folder: fFE.lastInsertRowid,
    title: '前端性能优化清单',
    content: `## 前端性能优化清单

### 加载阶段
1. 路由懒加载
2. 图片压缩与懒加载
3. CDN 静态资源

### 运行时
- 虚拟列表(长列表)
- 防抖节流(参考 [[Vue3 组合式 API 心得]] 里的实现)

> 核心指标: LCP < 2.5s, INP < 200ms

#前端 #性能优化`,
  },
  {
    folder: fTech.lastInsertRowid,
    title: 'Markdown 渲染方案选型',
    content: `## Markdown 渲染方案选型

| 方案 | 体积 | 扩展性 |
|------|------|--------|
| markdown-it | 100KB | 插件丰富 |
| marked | 30KB | 中等 |
| unified | 200KB+ | 最强 |

本项目选了 **markdown-it**: 自定义 renderer rule 做 [[双链笔记]] 高亮很方便。

#Markdown #技术选型`,
  },
  {
    folder: fTech.lastInsertRowid,
    title: '双链笔记',
    content: `## 什么是双链笔记

双向链接的核心不是"链接"本身,而是**反向引用面板**带来的意外发现。

- Roam Research 开创
- Obsidian 普及
- 与标签系统互补: 标签是分类,双链是关系

参考: [[Zettelkasten 卡片盒笔记法]]

#方法论 #笔记`,
  },
  {
    folder: null,
    title: 'Zettelkasten 卡片盒笔记法',
    content: `## Zettelkasten 卡片盒笔记法

卢曼的 [[双链笔记]] 思想源头,40 年写了 9 万张卡片。

### 三类卡片
1. 闪念卡片 (Fleeting)
2. 文献卡片 (Literature)
3. 永久卡片 (Permanent)

原则: **原子化** —— 一张卡片一个想法。

#方法论 #知识管理`,
  },
  {
    folder: fLife.lastInsertRowid,
    title: '周末骑行路线记录',
    content: `## 周末骑行路线记录

上周末骑了 42km,江边风很大但风景值得。

- 路线: 滨江公园 → 湿地 → 老码头
- 补给: 每 15km 喝水,带了香蕉和能量胶
- 装备清单参考 [[骑行装备清单]](待整理)

#骑行 #周末`,
  },
];

const ins = db.prepare('INSERT INTO notes (folder_id, title, content, tags) VALUES (?, ?, ?, ?)');
for (const s of seed) {
  const tags = [...new Set([...s.content.matchAll(/#([\p{L}\p{N}_\-]{1,30})/gu)].map((m) => m[1]))];
  ins.run(s.folder, s.title, s.content, JSON.stringify(tags));
}

console.log(`已写入 ${seed.length} 条示例笔记、3 个文件夹`);
