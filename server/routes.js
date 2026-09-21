/**
 * REST API 路由: 笔记 / 文件夹 / 标签 / 搜索 / 图谱 / 双链
 */
const express = require('express');
const { db, extractTags, extractLinks } = require('./db');

const router = express.Router();

/* ---------------- 工具 ---------------- */

function parseNote(row) {
  if (!row) return null;
  return { ...row, tags: JSON.parse(row.tags || '[]'), pinned: !!row.pinned };
}

function firstLineTitle(content) {
  const m = content.match(/^\s*#+\s*(.+)$/m) || content.match(/^\s*([^\n#]{1,100})/);
  return (m ? m[1] : '').trim().slice(0, 100) || '无标题';
}

/** 笔记详情: 附加正向链接 / 反向链接 */
function withLinks(note) {
  const targets = extractLinks(note.content);
  const forward = targets.map((t) => {
    const hit = db.prepare('SELECT id, title, updated_at FROM notes WHERE title = ? ORDER BY updated_at DESC LIMIT 1').get(t);
    return { title: t, note_id: hit ? hit.id : null };
  });
  const titleEsc = note.title.replace(/[%_\\]/g, (c) => '\\' + c);
  const backRows = db.prepare(
    "SELECT id, title, content, updated_at FROM notes WHERE id != ? AND content LIKE ? ESCAPE '\\' LIMIT 50"
  ).all(note.id, `%[[${titleEsc}]]%`);
  const back = backRows.map((r) => {
    const idx = r.content.indexOf(`[[${note.title}]]`);
    const start = Math.max(0, idx - 30);
    const snippet = r.content.slice(start, start + 110).replace(/\n/g, ' ');
    return { id: r.id, title: r.title, snippet, updated_at: r.updated_at };
  });
  return { ...note, forward_links: forward, backlinks: back };
}

/* ---------------- 笔记 ---------------- */

// 列表: 支持 folder / tag / q 筛选 + 分页
router.get('/notes', (req, res) => {
  const { folder, tag, q, page = 1, limit = 30 } = req.query;
  const where = [];
  const params = [];
  if (folder !== undefined && folder !== '') {
    if (folder === 'root') {
      where.push('folder_id IS NULL');
    } else {
      where.push('folder_id = ?');
      params.push(Number(folder));
    }
  }
  if (tag) {
    where.push("tags LIKE ?");
    params.push(`%"${tag}"%`);
  }
  if (q) {
    where.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM notes ${whereSql}`).get(...params).c;
  const rows = db.prepare(
    `SELECT * FROM notes ${whereSql} ORDER BY pinned DESC, updated_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(limit), (Number(page) - 1) * Number(limit));
  res.json({ total, page: Number(page), notes: rows.map(parseNote) });
});

// 详情(含双链)
router.get('/notes/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: '笔记不存在' });
  res.json(withLinks(parseNote(row)));
});

// 创建
router.post('/notes', (req, res) => {
  const { content = '', folder_id = null, pinned = false } = req.body || {};
  const title = (req.body.title || '').trim() || firstLineTitle(content);
  const tags = extractTags(content);
  const r = db.prepare(
    'INSERT INTO notes (folder_id, title, content, tags, pinned) VALUES (?, ?, ?, ?, ?)'
  ).run(folder_id, title, content, JSON.stringify(tags), pinned ? 1 : 0);
  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(parseNote(row));
});

// 更新
router.put('/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!old) return res.status(404).json({ error: '笔记不存在' });
  const { content = old.content, folder_id = old.folder_id, pinned = old.pinned } = req.body || {};
  const title = ('title' in (req.body || {})) ? (req.body.title.trim() || firstLineTitle(content)) : (old.title || firstLineTitle(content));
  const tags = extractTags(content);
  db.prepare(
    "UPDATE notes SET title = ?, content = ?, tags = ?, folder_id = ?, pinned = ?, updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(title, content, JSON.stringify(tags), folder_id, pinned ? 1 : 0, id);
  res.json(parseNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id)));
});

// 删除
router.delete('/notes/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// 置顶切换
router.post('/notes/:id/pin', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE notes SET pinned = 1 - pinned WHERE id = ?').run(id);
  res.json(parseNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id)));
});

/* ---------------- 文件夹 ---------------- */

// 文件夹树(含各文件夹笔记数)
router.get('/folders', (req, res) => {
  const folders = db.prepare('SELECT * FROM folders ORDER BY name').all();
  const counts = db.prepare('SELECT folder_id, COUNT(*) AS c FROM notes GROUP BY folder_id').all();
  const countMap = new Map(counts.map((c) => [c.folder_id, c.c]));
  const rootCount = db.prepare('SELECT COUNT(*) AS c FROM notes WHERE folder_id IS NULL').get().c;
  res.json({
    root_count: rootCount,
    folders: folders.map((f) => ({ ...f, note_count: countMap.get(f.id) || 0 })),
  });
});

// 创建文件夹
router.post('/folders', (req, res) => {
  const { name, parent_id = null } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: '文件夹名不能为空' });
  const r = db.prepare('INSERT INTO folders (name, parent_id) VALUES (?, ?)').run(name.trim(), parent_id);
  res.status(201).json(db.prepare('SELECT * FROM folders WHERE id = ?').get(r.lastInsertRowid));
});

// 重命名 / 移动
router.put('/folders/:id', (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  if (!old) return res.status(404).json({ error: '文件夹不存在' });
  const { name = old.name, parent_id = old.parent_id } = req.body || {};
  if (parent_id === id) return res.status(400).json({ error: '不能将自己设为父文件夹' });
  db.prepare('UPDATE folders SET name = ?, parent_id = ? WHERE id = ?').run(name.trim(), parent_id, id);
  res.json(db.prepare('SELECT * FROM folders WHERE id = ?').get(id));
});

// 删除: 笔记移到根目录,子文件夹一并上移,不丢数据
router.delete('/folders/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE folders SET parent_id = (SELECT parent_id FROM folders WHERE id = ?) WHERE parent_id = ?').run(id, id);
  db.prepare('UPDATE notes SET folder_id = NULL WHERE folder_id = ?').run(id);
  db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  res.json({ ok: true });
});

/* ---------------- 标签 / 搜索 / 图谱 ---------------- */

router.get('/tags', (req, res) => {
  const rows = db.prepare('SELECT tags FROM notes').all();
  const counter = new Map();
  for (const r of rows) {
    for (const t of JSON.parse(r.tags || '[]')) counter.set(t, (counter.get(t) || 0) + 1);
  }
  res.json([...counter.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
});

router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ notes: [] });
  const like = `%${q.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
  const rows = db.prepare(
    "SELECT * FROM notes WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 100"
  ).all(like, like);
  res.json({ notes: rows.map(parseNote) });
});

// 知识图谱: 节点(含 ghost 未创建的链接目标) + 边
router.get('/graph', (req, res) => {
  const notes = db.prepare('SELECT id, title, tags, pinned, updated_at FROM notes ORDER BY updated_at DESC').all().map(parseNote);
  const byTitle = new Map(notes.map((n) => [n.title, n.id]));
  const nodes = notes.map((n) => ({ id: n.id, title: n.title, ghost: false, tags: n.tags }));
  const seenGhost = new Set();
  const edges = [];
  const dedup = new Set();
  for (const n of notes) {
    const content = db.prepare('SELECT content FROM notes WHERE id = ?').get(n.id).content;
    for (const target of extractLinks(content)) {
      const tid = byTitle.get(target) ?? null;
      if (tid && tid === n.id) continue; // 自链接忽略
      if (tid) {
        const key = [Math.min(n.id, tid), Math.max(n.id, tid)].join('-');
        if (!dedup.has(key)) { dedup.add(key); edges.push({ source: n.id, target: tid }); }
      } else {
        // ghost 节点(尚未创建的笔记)
        if (!seenGhost.has(target)) {
          seenGhost.add(target);
          nodes.push({ id: null, title: target, ghost: true, tags: [] });
        }
        edges.push({ source: n.id, target: '__ghost__' + target });
      }
    }
  }
  // 规范化 ghost 边
  const ghostIndex = new Map();
  nodes.forEach((n, i) => { if (n.ghost) ghostIndex.set('__ghost__' + n.title, 'g' + i); });
  for (const e of edges) {
    if (String(e.target).startsWith('__ghost__')) e.target = ghostIndex.get(e.target);
  }
  res.json({ nodes, edges });
});

/* ---------------- 统计 ---------------- */

router.get('/stats', (req, res) => {
  const notes = db.prepare('SELECT COUNT(*) AS c FROM notes').get().c;
  const folders = db.prepare('SELECT COUNT(*) AS c FROM folders').get().c;
  const links = db.prepare("SELECT COUNT(*) AS c FROM notes WHERE content LIKE '%[[%]]%'").get().c;
  res.json({ notes, folders, linked_notes: links });
});

module.exports = router;
