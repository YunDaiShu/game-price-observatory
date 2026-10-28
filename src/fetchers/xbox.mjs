import { fetchJson } from '../lib/http.mjs';

// 微软商店站内公开接口（无鉴权，非官方文档化，与 Epic/GOG/Switch 同级）
const SEARCH = 'https://storeedgefd.dsx.mp.microsoft.com/v9.0/pages/searchResults';
const MARKET = 'US';
// 排除订阅/会员类（不是单个游戏，价格不可比）
const EXCLUDE = /(game pass|pc game pass|live gold|membership|subscription|ultimate|premium edition bundle)/i;

const numOf = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object') return numOf(v.ListPrice ?? v.Price ?? v.MSRP ?? null);
  if (typeof v === 'string') {
    const m = v.replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : null;
  }
  return null;
};

const imgOf = (images) => {
  const list = Array.isArray(images) ? images : [];
  const wide = list.find((i) => i && (i.Purpose === 'SuperHeroArt' || i.Purpose === 'BoxArt' || i.Purpose === 'Poster'));
  const pick = wide || list[0];
  const u = pick && (pick.Uri || pick.Url);
  return u ? (String(u).startsWith('//') ? 'https:' + u : String(u)) : null;
};

export async function fetchXbox(queries = [], { max = 40 } = {}) {
  const out = [];
  const seen = new Set();
  const errors = [];
  for (const q of queries) {
    if (out.length >= max) break;
    try {
      const j = await fetchJson(SEARCH + '?query=' + encodeURIComponent(q) + '&market=' + MARKET + '&locale=en-US&deviceFamily=Windows.Desktop', { timeoutMs: 15000, tries: 1 });
      const page = (Array.isArray(j) ? j : []).find((x) => x && x.Payload && Array.isArray(x.Payload.SearchResults));
      const results = (page && page.Payload && page.Payload.SearchResults) || [];
      for (const it of results) {
        if (out.length >= max) break;
        const id = it.ProductId || it.ProductIdString;
        if (!id || seen.has(id)) continue;
        const price = numOf(it.Price ?? it.DisplayPrice);
        const original = numOf(it.StrikethroughPrice ?? it.ListPrice ?? null);
        if (EXCLUDE.test(String(it.Title || ''))) continue;
        if (!price || !original || !(original > price)) continue;   // 只收在打折的
        seen.add(id);
        out.push({
          source: 'xbox',
          id: String(id),
          name: it.Title,
          price,
          initial: original,
          cut: Math.round((1 - price / original) * 100),
          currency: 'USD',
          url: 'https://www.microsoft.com/store/productId/' + id,
          cover: imgOf(it.Images),
          promo_start: null,
          promo_end: null,
          free_kind: null,
          tags: Array.isArray(it.Categories) ? it.Categories.slice(0, 3) : [],
          supports_zh: null,
          players_online: null,
          region: 'US'
        });
      }
    } catch (e) {
      errors.push({ query: q, error: String((e && e.message) || e).slice(0, 80) });
    }
  }
  return { items: out, errors };
}
