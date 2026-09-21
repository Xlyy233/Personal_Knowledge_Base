# 个人知识库 (Personal Knowledge_Base)

轻量化个人知识库:帖子流浏览 + 文件夹组织 + 双向链接 + 标签 + 全文搜索 + 知识图谱。

设计参考 [memos](https://github.com/usememos/memos)(帖子流架构)与 Obsidian(双链/标签语法),前后端合计 gzip 约 100KB,单进程运行,数据为单文件 SQLite。

## 快速开始

环境要求:Node.js ≥ 22(推荐 24,使用内置 SQLite,无需编译原生模块)。

```bash
# 1. 安装依赖(根目录 + client 目录)
npm install
npm --prefix client install

# 2. 构建(首次使用或前端改动后)
npm run build

# 3. 启动服务
npm start
```

打开 http://localhost:8090 即可使用,首次启动会自动写入 6 条示例笔记(仅空库时)。

> 端口冲突时可指定端口:`$env:PORT=9090; npm start`

## 开发模式(热更新)

```bash
npm run dev:server    # 后端 API,端口 8090
npm run dev:client    # 前端 Vite,端口 5173,自动代理 /api 到 8090
```

## 核心用法

### 写笔记

点击右上角「＋ 记笔记」,左侧编写、右侧实时预览,保存草稿自动存入浏览器,刷新或退出不丢内容。

笔记正文即数据,三种语法自动生效:

| 语法 | 效果 |
|------|------|
| `#标签` | 自动归档到标签,侧边栏标签云可筛选 |
| `[[笔记名]]` | 双向链接;目标笔记存在则可跳转,不存在会显示在图谱中(虚线节点),点击即可创建 |
| 标准 Markdown | 标题 / 列表 / 代码块 / 表格 / 引用等 |

### 浏览与组织

- **帖子流**:首页按更新时间倒序展示卡片,点击进入详情
- **文件夹**:侧边栏可建层级文件夹,删除文件夹时笔记自动移到根目录,不丢数据
- **搜索**:侧边栏顶部搜索框,匹配标题与正文
- **图谱**:`http://localhost:8090/graph`,拖拽节点、滚轮缩放、点击跳转;虚线圆圈是尚未创建的链接目标

### 双链面板

详情页底部显示两组信息:

- **链接到 (LINKS OUT)**:本笔记引用了哪些笔记
- **被引用 (BACKLINKS)**:哪些笔记引用了本笔记,含上下文摘要

## 项目结构

```
├── package.json            # 根配置与启动脚本
├── server/
│   ├── index.js            # Express 入口,生产模式托管前端产物
│   ├── db.js               # SQLite 数据层、标签/双链提取
│   ├── routes.js           # REST API(笔记/文件夹/标签/搜索/图谱)
│   └── seed.js             # 示例数据(仅空库写入)
├── client/
│   ├── vite.config.js
│   └── src/
│       ├── views/          # 帖子流 / 详情 / 编辑器 / 图谱
│       └── components/     # 侧边栏 / Markdown 渲染 / 力导向图等
└── data/
    └── knowledge.db        # SQLite 数据库(自动生成)
```

## 数据备份与迁移

所有数据都在 `data/knowledge.db` 一个文件里:停止服务后复制该文件即完成备份;拷到其他机器的同位置即可迁移。已加入 `.gitignore`,不会被提交到仓库。

## 常见问题

**启动时报 `ExperimentalWarning: SQLite is an experimental feature`**
Node 22~23 对内置 SQLite 的提示,不影响使用,可忽略。

**推送 GitHub 时连接被重置**
走本地代理(如 Clash 7890 端口):

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:7890'; git push
```

**想清空所有数据重新开始**
停止服务后删除 `data/` 目录,重启即回到空库(下次写入会自动建库)。
