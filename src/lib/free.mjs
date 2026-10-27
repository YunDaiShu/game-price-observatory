// 「限时免费 vs 永久免费」判定 + 永久免费过滤
// 规则：拿不到证据就标 null（不展示），绝不猜测

export function classifyFree(item, hist) {
  const price = item.price === null || item.price === undefined ? null : Number(item.price);
  if (price === null) return item.free_kind || null;
  if (price > 0) return null;

  // Epic 由 fetcher 直接给出（discountPrice===0 && expiryDate 存在 → limited）
  if (item.source === 'epic') return item.free_kind || 'permanent';

  // App Store：曾付费 → 现免费 = 限免
  // 证据可能来自两处：① 本地历史快照 ② 付费榜探测池（fetcher 已给出 free_kind）
  if (item.source === 'appstore') {
    if (item.free_kind === 'limited') return 'limited';
    const h = hist.get(item.source + ':' + item.id);
    return h && h.min > 0 ? 'limited' : 'permanent';
  }

  // Steam：is_free 且无价格 = 永久免费；限免周末无官方字段 → null（不展示）
  if (item.source === 'steam' || item.source === 'steam-specials') return 'permanent';

  return 'permanent';
}

export function applyFreeRules(items, hist) {
  for (const it of items) it.free_kind = classifyFree(it, hist);
  // 只保留：付费条目 + 限时免费条目 + 显式钉住的常驻条目（如 F2P 的《Sky 光·遇》）
  return items.filter((it) => it.free_kind !== 'permanent' || it.always_show === true);
}
