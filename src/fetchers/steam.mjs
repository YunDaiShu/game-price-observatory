const UA = 'game-price-radar/0.1 (open source; contact via repo)';

const hasZh = (s) => {
  if (!s) return 'unknown';
  const t = String(s);
  return /简体中文|Simplified Chinese/i.test(t) ? true : false;
};

async function currentPlayers(appid) {
  try {
    const r = await fetch('https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=' + appid, { headers: { 'User-Agent': UA } });
    if (!r.ok) return null;
    const j = await r.json();
    const n = j?.response?.player_count;
    return typeof n === 'number' ? n : null;
  } catch { return null; }
}

export async function fetchSteam(entry, cc = 'cn') {
  const appid = typeof entry === 'object' && entry !== null ? entry.id : entry;
  const always = typeof entry === 'object' && entry !== null ? !!entry.always : false;
  const url = 'https://store.steampowered.com/api/appdetails?appids=' + appid + '&cc=' + cc + '&l=schinese';
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const node = j[String(appid)];
  if (!node || !node.success) throw new Error('no data');
  const d = node.data;
  const link = 'https://store.steampowered.com/app/' + appid + '/';
  const tags = [...(d.genres || []), ...(d.categories || [])]
    .map((x) => x && x.description).filter(Boolean).slice(0, 6);
  const players = await currentPlayers(appid);
  const base = {
    source: 'steam', id: String(appid), name: d.name,
    currency: 'CNY', url: link,
    // —— 以下为详情页所需的真实元数据（取不到即 null，不猜）——
    developer: Array.isArray(d.developers) && d.developers.length ? d.developers.join('、') : null,
    publishers: Array.isArray(d.publishers) && d.publishers.length ? d.publishers.join('、') : null,
    release_date: d.release_date && d.release_date.date ? d.release_date.date : null,
    short_desc: d.short_description || null,
    metacritic: d.metacritic && typeof d.metacritic.score === 'number' ? d.metacritic.score : null,
    promo_start: null, promo_end: null,
    tags, supports_zh: hasZh(d.supported_languages), players_online: players,
    always_show: always
  };
  if (d.is_free) {
    return { ...base, free: true, price: 0, initial: 0, cut: 0, free_kind: 'permanent' };
  }
  const p = d.price_overview;
  if (!p) throw new Error('no price_overview (可能该区不可售)');
  return {
    ...base,
    free: false,
    price: p.final / 100,
    initial: p.initial / 100,
    cut: p.discount_percent,
    free_kind: null
  };
}
