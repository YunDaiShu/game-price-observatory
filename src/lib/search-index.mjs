import fs from 'node:fs';
import path from 'node:path';

/** 汇总"数据源里出现过的所有条目"，用于全量搜索 */
export function buildSearchIndex(root, items, opts = {}) {
  const skip = new Set(opts.exclude || []);
  const blocked = (s) => skip.has(s) || (s === 'steam-specials' && skip.has('steam'));
  const seen = new Map();

  const push = (o) => {
    if (!o || !o.name) return;
    if (blocked(o.source)) return;
    const key = (o.source || 'unknown') + ':' + (o.id || o.name);
    const prev = seen.get(key);
    const rec = {
      s: o.source || 'unknown',
      i: String(o.id ?? ''),
      // 展示名与英文别名合并，使中文名与英文名都能命中搜索
      n: o.name + (o.name_en && o.name_en !== o.name ? ' · ' + o.name_en : ''),
      ne: o.name_en || null,
      cv: o.cover || null,
      p: o.price ?? null,
      o: o.initial ?? null,
      c: o.cut ?? 0,
      u: o.url ?? null,
      e: o.promo_end ?? null,
      pl: o.players_online ?? null,
      lo: o.lowest_price ?? null,
      fk: o.free_kind ?? null,
      tg: Array.isArray(o.tags) ? o.tags.slice(0, 6) : [],
      zh: o.supports_zh ?? null,
      dv: o.developer ?? null,
      pb: o.publishers ?? null,
      rd: o.release_date ?? null,
      mc: o.metacritic ?? null,
      sd: o.short_desc ?? null
    };
    if (!prev || (prev.p === null && rec.p !== null)) seen.set(key, rec);
  };

  for (const it of items) push(it);

  // 历史快照里的条目（可能今天没在榜）
  const dir = path.join(root, 'data', 'history');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      try {
        const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        for (const it of doc.items || []) push(it);
      } catch {}
    }
  }

  // App Store 付费池（可能今天没进榜）
  try {
    const pool = JSON.parse(fs.readFileSync(path.join(root, 'data', 'appstore-pool.json'), 'utf8'));
    for (const [id, v] of Object.entries(pool)) {
      push({ source: 'appstore', id, name: v.name, price: v.lastPaidPrice, initial: v.lastPaidPrice, cut: 0, url: 'https://apps.apple.com/cn/app/' + id, tags: [] });
    }
  } catch {}

  return [...seen.values()].sort((a, b) => String(a.n).localeCompare(String(b.n), 'zh'));
}
