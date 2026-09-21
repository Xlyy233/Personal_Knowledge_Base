/** API 封装 */
async function req(method, url, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) {
    opt.headers['Content-Type'] = 'application/json; charset=utf-8';
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(url, opt);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `请求失败 ${res.status}`);
  }
  return res.json();
}

export const api = {
  notes: (params = {}) => req('GET', '/api/notes?' + new URLSearchParams(params)),
  note: (id) => req('GET', `/api/notes/${id}`),
  createNote: (data) => req('POST', '/api/notes', data),
  updateNote: (id, data) => req('PUT', `/api/notes/${id}`, data),
  deleteNote: (id) => req('DELETE', `/api/notes/${id}`),
  pinNote: (id) => req('POST', `/api/notes/${id}/pin`),
  folders: () => req('GET', '/api/folders'),
  createFolder: (data) => req('POST', '/api/folders', data),
  renameFolder: (id, data) => req('PUT', `/api/folders/${id}`, data),
  deleteFolder: (id) => req('DELETE', `/api/folders/${id}`),
  tags: () => req('GET', '/api/tags'),
  search: (q) => req('GET', '/api/search?q=' + encodeURIComponent(q)),
  graph: () => req('GET', '/api/graph'),
  stats: () => req('GET', '/api/stats'),
};
