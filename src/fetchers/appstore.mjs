const UA = 'game-price-radar/0.1 (open source; contact via repo)';

// Apple 官方公开接口：iTunes Search API（无需 key，允许公开查询）
export async function fetchAppStore(term, country = 'cn') {
  const url = 'https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&country=' + country + '&entity=software&limit=1';
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const a = (j.results || [])[0];
  if (!a) throw new Error('no result for term');
  const price = Number(a.price);
  return {
    source: 'appstore', id: String(a.trackId), name: a.trackName,
    free: price === 0, price, initial: price, cut: 0,
    currency: a.currency || 'CNY', url: a.trackViewUrl, seller: a.sellerName,
    note: 'App Store 无折扣字段，此为当前售价'
  };
}
