const UA = 'game-price-radar/0.1 (open source; contact via repo)';

// 可读 slug 判定：排除 32 位十六进制（那是 offerId，拼出来的路径会 404）
const HEX32 = /^[0-9a-f]{32}$/i;
const readable = (s) => !!s && /^[a-z0-9][a-z0-9_-]*$/i.test(s) && !HEX32.test(s);

function pageSlugOf(el) {
  const fromMappings = [
    ...(el.catalogNs?.mappings || []),
    ...(el.offerMappings || [])
  ].map((m) => m && m.pageSlug).filter(Boolean);
  const cand = [el.productSlug, el.urlSlug, ...fromMappings].map((s) => String(s || '').replace(/^\//, '').split('/')[0]);
  return cand.find(readable) || null;
}

// Epic 官方 CDN 接口（公开、无需 key）
// 促销窗口：promotions.promotionalOffers[0].promotionalOffers[0].{startDate,endDate,discountSetting.discountPercentage}
// 价格以美分计；币种取 totalPrice.currencyCode（CN 区仍为 USD）
// 官方标签目录接口不可得（launcher GraphQL 403 / graphql.epicgames.com 404）→ tags 留空
function coverOf(el) {
  const imgs = el && el.keyImages ? el.keyImages : [];
  const pick = imgs.find((i) => i.type === 'OfferImageWide')
    || imgs.find((i) => i.type === 'OfferImageTall')
    || imgs.find((i) => i.type === 'Thumbnail')
    || imgs[0];
  return pick && pick.url ? pick.url : null;
}
export async function fetchEpic(country = 'CN', locale = 'zh-CN') {
  const url = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=' + locale + '&country=' + country;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const els = j?.data?.Catalog?.searchStore?.elements || [];
  if (!els.length) throw new Error('elements 为空');

  const now = Date.now();
  const out = [];
  for (const el of els) {
    const tp = el.price?.totalPrice;
    if (!tp) continue;

    const price = Number(tp.discountPrice) / 100;
    const initial = Number(tp.originalPrice) / 100;
    const currency = tp.currencyCode || 'USD';

    const active = el.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0] || null;
    const inWindow = active && active.startDate && new Date(active.startDate).getTime() <= now && (!active.endDate || new Date(active.endDate).getTime() > now);
    const promo = inWindow ? active : null;

    let freeKind = null;
    if (price === 0 && initial > 0) {
      const pct = promo?.discountSetting?.discountPercentage;
      freeKind = (promo && pct === 0 && promo.endDate) ? 'limited' : 'permanent';
    }

    const slug = pageSlugOf(el);
    out.push({
      source: 'epic',
      id: String(el.id),
      name: el.title,
      price,
      initial,
      cut: initial > 0 && price < initial ? Math.round((1 - price / initial) * 100) : 0,
      currency,
      url: slug ? 'https://store.epicgames.com/zh-CN/p/' + slug : null,
      cover: coverOf(el),
      promo_start: promo?.startDate || null,
      promo_end: promo?.endDate || null,
      free_kind: freeKind,
      tags: [],
      supports_zh: 'unknown',
      players_online: null
    });
  }
  return out;
}
