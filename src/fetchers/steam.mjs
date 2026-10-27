const UA = 'game-price-radar/0.1 (open source; contact via repo)';

export async function fetchSteam(appid, cc = 'cn') {
  const url = 'https://store.steampowered.com/api/appdetails?appids=' + appid + '&cc=' + cc + '&l=schinese';
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const node = j[String(appid)];
  if (!node || !node.success) throw new Error('no data');
  const d = node.data;
  const link = 'https://store.steampowered.com/app/' + appid + '/';
  if (d.is_free) {
    return { source: 'steam', id: String(appid), name: d.name, free: true, price: 0, initial: 0, cut: 0, currency: 'CNY', url: link };
  }
  const p = d.price_overview;
  if (!p) throw new Error('no price_overview (可能该区不可售)');
  return {
    source: 'steam', id: String(appid), name: d.name, free: false,
    price: p.final / 100, initial: p.initial / 100, cut: p.discount_percent,
    currency: p.currency, url: link
  };
}
