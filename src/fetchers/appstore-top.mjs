import { fetchJson } from '../lib/http.mjs';
import { absoluteUrl } from '../lib/url.mjs';

// Apple 官方旧版 RSS：付费榜（含价格），genre=6014 = Games
// 用途：作为「限免探测池」——记录哪些 app 曾经是付费的
export async function fetchAppStoreTopPaid({ genre = 6014, limit = 100 } = {}) {
  const url = 'https://itunes.apple.com/cn/rss/toppaidapplications/limit=' + limit + '/genre=' + genre + '/json';
  const j = await fetchJson(url, { timeoutMs: 10000 });
  const feed = j.feed || j;
  const entries = feed.entry || [];
  if (!entries.length) throw new Error('付费榜为空');

  return entries.map((e) => {
    const id = e.id?.attributes?.['im:id'] || e.id?.label || '';
    const price = Number(e['im:price']?.attributes?.amount ?? NaN);
    return {
      id: String(id),
      name: e['im:name']?.label || '',
      price: Number.isFinite(price) ? price : null,
      currency: e['im:price']?.attributes?.currency || 'CNY',
      url: absoluteUrl(e.link?.attributes?.href || e.link?.[0]?.attributes?.href, 'https://apps.apple.com'),
      tags: e.category?.attributes?.label ? [e.category.attributes.label] : []
    };
  }).filter((x) => x.id && x.name);
}
