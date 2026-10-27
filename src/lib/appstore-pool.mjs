import fs from 'node:fs';
import path from 'node:path';

// App Store 限免探测池：id -> { name, lastPaidPrice, lastSeenPaid }
const FILE = (root) => path.join(root, 'data', 'appstore-pool.json');

export function loadPool(root) {
  try { return JSON.parse(fs.readFileSync(FILE(root), 'utf8')); } catch { return {}; }
}

export function savePool(root, pool) {
  fs.mkdirSync(path.dirname(FILE(root)), { recursive: true });
  fs.writeFileSync(FILE(root), JSON.stringify(pool, null, 2) + '\n', 'utf8');
}

/** 用今天的付费榜刷新池（只记价格 > 0 的） */
export function updatePool(pool, paidList, today) {
  for (const it of paidList) {
    if (!it.id || !(it.price > 0)) continue;
    pool[it.id] = { name: it.name, lastPaidPrice: it.price, lastSeenPaid: today };
  }
  return pool;
}

/** 候选：池里曾付费、但今天不在付费榜中的 app（最多 max 个，供批量 lookup） */
export function freeCandidates(pool, paidIdsToday, max = 100) {
  return Object.keys(pool)
    .filter((id) => !paidIdsToday.has(id))
    .slice(0, max);
}
