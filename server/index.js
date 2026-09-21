/**
 * 服务入口: API + 生产模式下托管前端构建产物,单进程 8090 端口
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
require('./db');
const api = require('./routes');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api', api);

// 托管前端构建产物(如存在)
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`✓ 个人知识库已启动: http://localhost:${PORT}`);
});
