/** 通用工具 */

export function fmtTime(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T'));
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toTimeString().slice(0, 5);
  }
  const y = d.getFullYear() === now.getFullYear() ? '' : d.getFullYear() + '-';
  return y + `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function excerpt(md, len = 140) {
  return md
    .replace(/```[\s\S]*?```/g, ' [代码] ')
    .replace(/^#+\s*/gm, '')
    .replace(/\[\[([^\[\]]+?)\]\]/g, '$1')
    .replace(/[#*>`~\[\]()!|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, len);
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
