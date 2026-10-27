import fs from 'node:fs';
import path from 'node:path';
import { fetchSteam } from './fetchers/steam.mjs';
import { fetchAppStore } from './fetchers/appstore.mjs';
import { fetchSteamSpecials } from './fetchers/steam-specials.mjs';
import { fetchEpic } from './fetchers/epic.mjs';
import { fetchGog } from './fetchers/gog.mjs';
import { fetchSteampy } from './fetchers/steampy.mjs';
import { normalizeItem } from './lib/fields.mjs';
import { loadHistory, annotateLows, loadSeries } from './lib/history.mjs';
import { applyFreeRules } from './lib/free.mjs';
import { renderPage } from './render.mjs';
import { isValidHttpUrl } from './lib/url.mjs';
import { loadHealth, saveHealth, pausedReason, recordResult } from './lib/health.mjs';
import { buildSearchIndex } from './lib/search-index.mjs';
import { enrichEnglishNames } from './lib/names.mjs';
import { fetchAppStoreTopPaid } from './fetchers/appstore-top.mjs';
import { fetchAppStoreByIds } from './fetchers/appstore.mjs';
import { loadPool, savePool, updatePool, freeCandidates } from './lib/appstore-pool.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

const watch = readJson(path.join(ROOT, 'data', 'watchlist.json'));
const today = new Date().toISOString().slice(0, 10);
const hist = loadHistory(path.join(ROOT, 'data', 'history'), today);

const errors = [];
const raw = [];
const health = loadHealth(ROOT);

async function collect(label, fn) {
  const pausedUntil = pausedReason(health, label, today);
  if (pausedUntil) {
    errors.push({ source: label, target: label, error: '已熔断跳过（连续 ' + (health[label].failStreak || 0) + ' 次失败，' + pausedUntil + ' 后重试）' });
    return;
  }
  try {
    const r = await fn();
    for (const it of (Array.isArray(r) ? r : [r])) if (it) raw.push(it);
    recordResult(health, label, true, { today });
  } catch (e) {
    const msg = String(e?.cause?.code || e?.cause?.message || e?.message || e);
    recordResult(health, label, false, { today, error: msg });
    errors.push({ source: label, target: label, error: msg });
  }
}

await Promise.all([
  ...(watch.steam || []).map((id) => collect('steam', () => fetchSteam(id))),
  ...(watch.appstore || []).map((t) => collect('appstore', () => fetchAppStore(t))),
  collect('steam-specials', () => fetchSteamSpecials()),
  collect('epic', () => fetchEpic()),
  collect('gog', () => fetchGog()),
  // SteamPY 无公开接口：仅在显式配置端点时才抓，避免每次运行都产生「来源异常」
  ...(process.env.STEAMPY_API_URL ? [collect('steampy', () => fetchSteampy())] : [])
]);

// ── App Store 限免探测：付费榜建池 → 批量查价 → 价格归零即判定限免 ──
try {
  const paid = await fetchAppStoreTopPaid({ limit: 100 });
  const pool = loadPool(ROOT);
  updatePool(pool, paid, today);
  const paidIdsToday = new Set(paid.map((x) => x.id));
  const cands = freeCandidates(pool, paidIdsToday, 100);
  if (cands.length) {
    const looked = await fetchAppStoreByIds(cands);
    const freeOnes = looked.filter((x) => x.price === 0);
    if (freeOnes.length) {
      raw.push(...freeOnes);
      console.log('App Store 限免探测：候选 ' + cands.length + ' 个 → 判定限免 ' + freeOnes.length + ' 个');
    }
  }
  savePool(ROOT, pool);
} catch (e) {
  errors.push({ source: 'appstore-top', target: '付费榜/探测', error: String(e?.cause?.code || e?.message || e).slice(0, 120) });
}

const normalized = raw.map(normalizeItem);

// 链接合法性校验：拼错的地址比没地址更糟
for (const it of normalized) {
  if (!isValidHttpUrl(it.url)) {
    errors.push({ source: it.source, target: it.name || it.id, error: '非法链接已置空: ' + String(it.url).slice(0, 80) });
    it.url = null;
  }
}
const infoScore = (it) => ['promo_end', 'players_online', 'lowest_price'].filter((k) => it[k] !== null && it[k] !== undefined).length
  + (it.tags || []).length + (it.supports_zh === true || it.supports_zh === false ? 1 : 0);
const byKey = new Map();
for (const it of normalized) {
  const k = it.source + ':' + it.id;
  const prev = byKey.get(k);
  if (!prev || infoScore(it) > infoScore(prev)) byKey.set(k, it);
}
let items = [...byKey.values()];

// 补英文别名（带缓存，仅用于搜索，不改展示名）
try {
  const nm = await enrichEnglishNames(ROOT, items);
  if (nm.added) console.log('英文别名：新增 ' + nm.added + ' 条（缓存 ' + nm.cacheSize + ' 条）');
} catch (e) {
  errors.push({ source: 'names', target: '英文别名', error: String((e && e.message) || e).slice(0, 100) });
}

annotateLows(items, hist);
items = applyFreeRules(items, hist);

const rank = (it) => (it.free_kind === 'limited' ? 0 : it.is_new_low === true ? 1 : 2);
items.sort((a, b) => rank(a) - rank(b) || (b.cut || 0) - (a.cut || 0) || String(a.name).localeCompare(String(b.name), 'zh'));

const iso = new Date().toISOString();
const bj = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16);

const payload = {
  generated_at: iso,
  generated_at_bj: bj,
  timezone_display: 'Asia/Shanghai (UTC+8)',
  region: 'CN',
  counts: {
    total: items.length,
    limited_free: items.filter((i) => i.free_kind === 'limited').length,
    new_low: items.filter((i) => i.is_new_low === true).length,
    failed: errors.length
  },
  by_source: items.reduce((acc, it) => { acc[it.source] = (acc[it.source] || 0) + 1; return acc; }, {}),
  items,
  errors,
  series: loadSeries(path.join(ROOT, 'data', 'history'), 60)
};

saveHealth(ROOT, health);
writeJson(path.join(ROOT, 'data', 'latest.json'), payload);
writeJson(path.join(ROOT, 'data', 'history', today + '.json'), payload);
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'index.html'), renderPage(payload), 'utf8');
fs.writeFileSync(path.join(ROOT, 'docs', '.nojekyll'), '', 'utf8');
// 供详情页（docs/detail）读取实时数据：Pages 只发布 docs/
writeJson(path.join(ROOT, 'docs', 'latest.json'), payload);
// 全量搜索索引（页面首次输入时懒加载）
const searchIndex = buildSearchIndex(ROOT, items);
writeJson(path.join(ROOT, 'docs', 'search-index.json'), searchIndex);

console.log('OK 在榜 ' + items.length + ' 条（限免 ' + payload.counts.limited_free + ' / 新史低 ' + payload.counts.new_low + '） 失败 ' + errors.length);
console.log('   分来源: ' + JSON.stringify(payload.by_source));
for (const it of items.slice(0, 10)) {
  const price = it.price === 0 ? '免费' : (it.price === null ? '?' : '¥' + it.price);
  console.log('   ' + String(it.source).padEnd(14) + String(price).padEnd(9) + String(it.cut ? '-' + it.cut + '%' : '').padEnd(6) + ' ' + String(it.name).slice(0, 32) + (it.promo_end ? ' | 至' + it.promo_end.slice(5, 10) : ''));
}
for (const e of errors) console.log('   ! ' + e.source + ' -> ' + e.error);
