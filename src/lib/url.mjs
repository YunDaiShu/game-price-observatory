// 统一把各来源返回的链接规整成可用绝对地址
// 兼容：完整地址 / 协议相对 //host/path / 缺冒号 https//host / 以 / 开头的站内路径
export function absoluteUrl(raw, origin) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;

  // 修补 "https//host" / "http//host"（缺少冒号）
  s = s.replace(/^https?\/\//i, (m) => (m.toLowerCase().startsWith('https') ? 'https://' : 'http://'));

  if (/^https?:\/\//i.test(s)) return s;          // 已是绝对地址
  if (s.startsWith('//')) return 'https:' + s;      // 协议相对
  if (s.startsWith('/')) return origin + s;         // 站内绝对路径
  return origin + '/' + s;                          // 裸路径
}

export function isValidHttpUrl(u) {
  if (!u || typeof u !== 'string') return false;
  if (!/^https?:\/\/[^\s]+$/i.test(u)) return false;
  try {
    const p = new URL(u);
    if (!p.hostname.includes('.')) return false;
    if (/https?$/i.test(p.hostname)) return false;
    // 常见拼接错误：主机名里出现第二个 http
    if (/https?:?\/\//i.test(u.slice(u.indexOf('//') + 2))) return false;
    return true;
  } catch { return false; }
}
