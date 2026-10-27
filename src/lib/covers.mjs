// Steam 封面探测：header.jpg 不存在的 appid 会被标记，前端改走渐变兜底
const HEADER = (id) => 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + id + '/header.jpg';

async function probe(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'game-price-radar/0.1' }, signal: AbortSignal.timeout(8000) });
    return r.status >= 200 && r.status < 400;
  } catch {
    return false;   // 网络异常也按"不可用"处理，避免前端反复 404
  }
}

export async function probeSteamCovers(items, { concurrency = 6 } = {}) {
  const targets = items.filter((it) => String(it.source).startsWith('steam') && /^[0-9]+$/.test(String(it.id)));
  let ok = 0, missing = 0;
  const queue = targets.slice();
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const it = queue.shift();
      const url = it.cover || HEADER(it.id);
      const available = await probe(url);
      if (available) { it.cover = url; ok++; }
      else { it.cover = null; it.cover_missing = true; missing++; }
    }
  });
  await Promise.all(workers);
  return { total: targets.length, ok, missing };
}
