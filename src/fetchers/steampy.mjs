import { absoluteUrl } from '../lib/url.mjs';

const UA = 'game-price-radar/0.1 (open source; contact via repo)';

// ── SteamPY(匹歪) 现状（实测 2026-10-27）───────────────────────────────
// 1) 站点是纯 SPA：/ 、/robots.txt 、/api/game/list 均返回同一份 120,631 字节 index.html；
// 2) HTML 内无 inline state、无 /api/ 路径、无公开接口文档；
// 3) 它本身是「Steam 游戏交易/寄售市场」，价格来自用户挂单，与官方商店价口径不同。
// 结论：没有可用的公开接口 → 本 fetcher 不硬编码任何私有接口、不抓 HTML 反解。
// 若你有合法来源（自建代理/官方授权接口），通过环境变量 STEAMPY_API_URL 注入即可启用。
export async function fetchSteampy(endpoint = process.env.STEAMPY_API_URL) {
  if (!endpoint) {
    throw new Error('未配置公开接口（站点为 SPA，无公开 API；如已获授权可设 STEAMPY_API_URL）');
  }

  const r = await fetch(endpoint, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();

  const list = Array.isArray(j) ? j : (j.items || j.data || j.list || []);
  if (!Array.isArray(list) || !list.length) throw new Error('返回结构无法识别或为空');

  const out = [];
  for (const x of list) {
    const name = x.name ?? x.title ?? x.gameName;
    const id = x.id ?? x.gameId ?? x.appid ?? x.steamAppId;
    if (!name || id === undefined || id === null) continue;

    const price = Number.isFinite(Number(x.price ?? x.currentPrice)) ? Number(x.price ?? x.currentPrice) : null;
    const initial = Number.isFinite(Number(x.initial ?? x.originalPrice ?? x.original)) ? Number(x.initial ?? x.originalPrice ?? x.original) : null;
    const cut = Number.isFinite(Number(x.cut ?? x.discountPercent))
      ? Math.abs(Math.round(Number(x.cut ?? x.discountPercent)))
      : (initial > 0 && price !== null && price < initial ? Math.round((1 - price / initial) * 100) : 0);

    out.push({
      source: 'steampy',
      id: String(id),
      name: String(name),
      price,
      initial,
      cut,
      currency: x.currency || 'CNY',
      url: absoluteUrl(x.url ?? x.link ?? x.detailUrl, 'https://www.steampy.com'),
      promo_start: x.promoStart ?? x.startTime ?? null,
      promo_end: x.promoEnd ?? x.endTime ?? null,
      free_kind: x.freeKind === 'limited' || x.freeKind === 'permanent' ? x.freeKind : null,
      tags: Array.isArray(x.tags) ? x.tags.filter((t) => typeof t === 'string') : [],
      supports_zh: typeof x.supportsZh === 'boolean' ? x.supportsZh : 'unknown',
      players_online: Number.isFinite(Number(x.playersOnline)) ? Number(x.playersOnline) : null
    });
  }
  if (!out.length) throw new Error('返回条目缺少必要字段（name/id）');
  return out;
}
