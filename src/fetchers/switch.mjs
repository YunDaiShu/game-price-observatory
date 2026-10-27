import { fetchJson } from '../lib/http.mjs';

// 任天堂日本站内搜索接口（站内公开接口，无鉴权，与 Epic/GOG 同性质）
// 促销标记：sale_flg==='1'，折扣率 drate[0]，截止时间 sedate
const SEARCH = 'https://search.nintendo.jp/nintendo_soft/search.json';

function saleEnd(raw) {
  if (!raw) return null;
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + m[6] + '+09:00'; // JST
}

// 排除 DLC / 升级包 / 追加内容（不是独立游戏，价格对比无意义）
const EXCLUDE_RE = /(アップグレード|追加コンテンツ|追加ストーリー|追加の仲間|シーズンパス|ダウンロードコンテンツ|拡張パス|アップデートパス|\bDLC\b)/i;

function drateOf(it) {
  const d = Array.isArray(it.drate) ? it.drate[0] : it.drate;
  const n = Number(d);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function fetchSwitch({ pages = 8, limit = 100, max = 40 } = {}) {
  const out = [];
  const errors = [];
  for (let page = 1; page <= pages && out.length < max; page++) {
    try {
      const j = await fetchJson(SEARCH + '?q=&limit=' + limit + '&page=' + page, { timeoutMs: 20000, tries: 1 });
      const items = (j && j.result && j.result.items) || [];
      if (!items.length) break;
      for (const it of items) {
        if (out.length >= max) break;
        if (String(it.sale_flg) !== '1') continue;
        if (EXCLUDE_RE.test(String(it.title || ''))) continue;
        if ((typeof it.price === 'number' ? it.price : 0) < 100) continue;   // 低于 100 円视为异常
        const price = typeof it.price === 'number' ? it.price : null;
        const drate = drateOf(it);
        if (!price || !drate) continue;
        if (drate > 95) continue;   // 折扣率异常（多为套装/数据错误）
        const initial = Math.round(price / (1 - drate / 100));
        if (!(initial > price)) continue;
        const nsuid = String(it.nsuid || it.id || '');
        if (!nsuid) continue;
        out.push({
          source: 'switch',
          id: nsuid,
          name: it.title,
          price,
          initial,
          cut: Math.round(drate),
          currency: 'JPY',
          url: it.url || ('https://store-jp.nintendo.com/list/software/' + nsuid + '.html'),
          cover: it.iurl ? 'https://img-eshop.cdn.nintendo.net/i/' + it.iurl + '.jpg' : null,
          promo_start: null,
          promo_end: saleEnd(it.sedate),
          free_kind: null,
          tags: Array.isArray(it.genre) ? it.genre.filter(Boolean).slice(0, 3) : [],
          supports_zh: null,
          players_online: null,
          release_date: it.sdate || null,
          region: 'JP'
        });
      }
    } catch (e) {
      errors.push({ page, error: String((e && e.message) || e).slice(0, 80) });
      break;
    }
  }
  return { items: out, errors };
}
