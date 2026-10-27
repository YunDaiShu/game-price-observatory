import fs from 'node:fs';
import path from 'node:path';

// 全量历史留存：读取 data/history/*.json（排除今天），按 (source:id) 汇总最低价
export function loadHistory(historyDir, todayDate) {
  const map = new Map();
  if (!fs.existsSync(historyDir)) return map;
  const files = fs.readdirSync(historyDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  for (const f of files) {
    const date = f.slice(0, 10);
    if (date === todayDate) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(historyDir, f), 'utf8')); } catch { continue; }
    for (const it of doc.items || []) {
      if (!it || it.price === null || it.price === undefined) continue;
      if (toNum(it.price) <= 0) continue; // 免费/限免不参与史低
      if ((it.currency || 'CNY') !== 'CNY') continue; // 跨币种不比较
      const key = it.source + ':' + it.id;
      const cur = map.get(key) || { min: Infinity, firstSeen: date, samples: 0 };
      cur.min = Math.min(cur.min, toNum(it.price));
      cur.samples += 1;
      if (date < cur.firstSeen) cur.firstSeen = date;
      map.set(key, cur);
    }
  }
  return map;
}

function toNum(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

// 为每条打上 lowest_price / is_new_low
export function annotateLows(items, hist) {
  for (const it of items) {
    const price = toNum(it.price);
    if (price === null || price <= 0 || (it.currency || 'CNY') !== 'CNY') {
      it.lowest_price = null;
      it.is_new_low = null;
      continue;
    }
    const h = hist.get(it.source + ':' + it.id);
    if (!h || h.samples === 0) {
      it.lowest_price = price;
      it.is_new_low = null; // 首次观察，不标新史低
      continue;
    }
    it.lowest_price = Math.min(h.min, price);
    it.is_new_low = price < h.min;
  }
  return items;
}
