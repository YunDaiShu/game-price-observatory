import { absoluteUrl } from '../lib/url.mjs';
import { fetchJson } from '../lib/http.mjs';

// Apple 官方公开接口：iTunes Search / Lookup（无需 key）
// entry 可以是字符串（搜索词）或 { term, id }（精确 lookup，推荐）
/** 批量按 id 查询（一次最多 100 个），用于探测"曾是付费、现在是否变免费" */
export async function fetchAppStoreByIds(ids, country = 'cn') {
  const list = (ids || []).filter(Boolean).slice(0, 100);
  if (!list.length) return [];
  const j = await fetchJson('https://itunes.apple.com/lookup?id=' + list.join(',') + '&country=' + country, { timeoutMs: 12000 });
  return (j.results || []).map((a) => {
    const price = Number(a.price);
    return {
      source: 'appstore',
      id: String(a.trackId),
      name: a.trackName,
      free: price === 0,
      price,
      initial: price,
      cut: 0,
      currency: a.currency || 'CNY',
      url: absoluteUrl(a.trackViewUrl, 'https://apps.apple.com'),
      promo_start: null,
      promo_end: null,
      // 来自付费榜探测池 + 现价 0 → 有证据判定为限时免费
      free_kind: price === 0 ? 'limited' : null,
      tags: [a.primaryGenreName, '限免探测'].filter(Boolean),
      supports_zh: 'unknown',
      players_online: null,
      note: price === 0 ? '付费榜曾出现，现价 0（判定为限时免费）' : '付费中'
    };
  });
}

export async function fetchAppStore(entry, country = 'cn') {
  const term = typeof entry === 'string' ? entry : entry && entry.term;
  const id = entry && typeof entry === 'object' ? entry.id : null;

  const url = id
    ? 'https://itunes.apple.com/lookup?id=' + encodeURIComponent(id) + '&country=' + country
    : 'https://itunes.apple.com/search?term=' + encodeURIComponent(term || '') + '&country=' + country + '&entity=software&limit=5';

  const j = await fetchJson(url, { timeoutMs: 8000 });
  const results = j.results || [];
  if (!results.length) throw new Error('无结果: ' + (term || id));

  // 无 id 时优先取「有价格」的结果，避免抓到免费同名应用
  const a = id ? results[0] : (results.find((r) => Number(r.price) > 0) || results[0]);
  const price = Number(a.price);

  return {
    source: 'appstore',
    id: String(a.trackId),
    name: a.trackName,
    free: price === 0,
    price,
    initial: price,
    cut: 0,
    currency: a.currency || 'CNY',
    url: absoluteUrl(a.trackViewUrl, 'https://apps.apple.com'),
    promo_start: null,
    promo_end: null,
    free_kind: null,
    tags: [a.primaryGenreName].filter(Boolean),
    supports_zh: 'unknown',
    players_online: null,
    seller: a.sellerName,
    note: 'App Store 无折扣字段，此为当前售价'
  };
}
