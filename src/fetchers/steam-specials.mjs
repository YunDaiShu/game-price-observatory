const UA = 'game-price-radar/0.1 (open source; contact via repo)';

// Steam 官方「特惠/精选」接口：一次拿到当前打折游戏，无需维护名单
export async function fetchSteamSpecials(cc = 'cn', limit = 24) {
  const url = 'https://store.steampowered.com/api/featuredcategories?cc=' + cc + '&l=schinese';
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
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
    url: 'https://store.steampowered.com/app/' + it.id + '/'
  }));
}
