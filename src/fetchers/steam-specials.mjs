import { fetchJson } from '../lib/http.mjs';

// Steam 官方「特惠/精选」接口：一次拿到当前打折游戏
// 该接口含 discount_expiration（促销结束时间），但不含开始时间、不含语言/标签
export async function fetchSteamSpecials(cc = 'cn', limit = 24) {
  const url = 'https://store.steampowered.com/api/featuredcategories?cc=' + cc + '&l=schinese';
  const j = await fetchJson(url, { tries: 2, timeoutMs: 8000 });
  const list = (j.specials && j.specials.items) || [];
  if (!list.length) throw new Error('specials 为空');
  return list.slice(0, limit).map((it) => ({
    source: 'steam-specials',
    id: String(it.id),
    name: it.name,
    free: false,
    price: it.final_price / 100,
    initial: it.original_price / 100,
    cut: it.discount_percent,
    currency: 'CNY',
    url: 'https://store.steampowered.com/app/' + it.id + '/',
    promo_start: null,
    promo_end: it.discount_expiration ? new Date(it.discount_expiration * 1000).toISOString() : null,
    free_kind: null,
    tags: [],
    supports_zh: 'unknown',
    players_online: null
  }));
}
