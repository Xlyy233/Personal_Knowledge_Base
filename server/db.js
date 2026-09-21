/**
 * 数据层: 基于 Node 24 内置 node:sqlite,单文件数据库,零原生依赖
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'knowledge.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT '无标题',
    content TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
  CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
`);

/** 从正文中提取 #标签 (支持中英文、数字、下划线、连字符) */
function extractTags(content) {
  const tags = new Set();
  const re = /(^|[\s(（【>])#([\p{L}\p{N}_\-]{1,30})/gu;
  let m;
  while ((m = re.exec(content)) !== null) tags.add(m[2]);
  return [...tags];
}

/** 从正文中提取 [[双链标题]] */
function extractLinks(content) {
  const targets = [];
  const re = /\[\[([^\[\]]+?)\]\]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const t = m[1].trim();
    if (t && !targets.includes(t)) targets.push(t);
  }
  return targets;
}

module.exports = { db, extractTags, extractLinks };
