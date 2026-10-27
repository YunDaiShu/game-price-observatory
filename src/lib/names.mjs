import fs from 'node:fs';
import path from 'node:path';
import { fetchJson } from './http.mjs';

// 英文别名缓存：source:id -> name_en（避免每天重复请求）
const FILE = (root) => path.join(root, 'data', 'name-cache.json');

export function loadNameCache(root) {
  try { return JSON.parse(fs.readFileSync(FILE(root), 'utf8')); } catch { return {}; }
}
export function saveNameCache(root, cache) {
  fs.mkdirSync(path.dirname(FILE(root)), { recursive: true });
  fs.writeFileSync(FILE(root), JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

/** Steam：额外拉一次英文名（带缓存，单次运行上限 40 条） */
async function steamEnglishNames(appids, cache, limit = 40) {
  let n = 0;
  for (const id of appids.slice(0, limit)) {
    const key = 'steam:' + id;
    if (cache[key]) continue;
    try {
      const j = await fetchJson('https://store.steampowered.com/api/appdetails?appids=' + id + '&cc=cn&l=english', { timeoutMs: 8000, tries: 1 });
      const name = j && j[String(id)] && j[String(id)].data && j[String(id)].data.name;
      if (name) { cache[key] = name; n++; }
    } catch { /* 单条失败不影响整体 */ }
  }
  return n;
}

/** Epic：用英文 locale 再取一次，按 id 建立映射（一次请求） */
async function epicEnglishNames(cache) {
  try {
    const j = await fetchJson('https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=CN', { timeoutMs: 10000, tries: 1 });
    const els = (j && j.data && j.data.Catalog && j.data.Catalog.searchStore && j.data.Catalog.searchStore.elements) || [];
    for (const el of els) if (el.id && el.title) cache['epic:' + el.id] = el.title;
    return els.length;
  } catch { return 0; }
}

/** 给条目补 name_en（就地修改并返回统计） */
export async function enrichEnglishNames(root, items) {
  const cache = loadNameCache(root);
  let added = 0;

  // GOG 用 en-US 目录抓取，名称本身即英文
  for (const it of items) {
    if (it.source === 'gog') cache['gog:' + it.id] = cache['gog:' + it.id] || it.name;
    if (it.source === 'appstore') cache['appstore:' + it.id] = cache['appstore:' + it.id] || it.name;
  }

  const steamIds = [...new Set(items.filter((i) => String(i.source).startsWith('steam')).map((i) => i.id))];
  const nSteam = await steamEnglishNames(steamIds, cache);
  const nEpic = items.some((i) => i.source === 'epic') ? await epicEnglishNames(cache) : 0;
  added = nSteam + nEpic;

  for (const it of items) {
    const key = it.source + ':' + it.id;
    if (cache[key]) it.name_en = cache[key];
  }

  saveNameCache(root, cache);
  return { added, cacheSize: Object.keys(cache).length, steamLooked: Math.min(steamIds.length, 40) };
}
