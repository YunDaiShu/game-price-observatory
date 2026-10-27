import { absoluteUrl } from '../lib/url.mjs';
import { fetchJson } from '../lib/http.mjs';

const UA = 'game-price-radar/0.1 (open source; contact via repo)';

const num = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return num(v.amount ?? v.value ?? v.price);
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// GOG 官方 catalog 接口（公开）：价格 / 折扣 / 标签 / 类型
// 注：该接口不含促销起止时间，promo_start/promo_end 一律 null（不推测）
const JUNK = /soundtrack|\bost\b|artbook|art book|dlc|expansion|season pass|wallpaper|upgrade pack/i;
const isGameProduct = (p) => {
  if (p.productType && !/game/i.test(String(p.productType))) return false;
  if (JUNK.test(String(p.title || ''))) return false;
  return true;
};

// catalog.gog.com 在部分网络不可达（实测 TCP connect 超时，而 www.gog.com 正常）；
// 这里用 6s × 2 次的短超时，失败即快速降级，不拖累其它来源。
async function getJson(url) {
  try {
    return await fetchJson(url, { tries: 2, timeoutMs: 5000, retryOnTimeout: false });
  } catch (e) {
    const msg = String(e?.message || e);
    if (/TIMEOUT|UND_ERR|ECONN|ETIMEDOUT/i.test(msg)) {
      throw new Error('catalog.gog.com 连接超时（该主机在当前网络不可达；GitHub Actions 环境通常正常）: ' + msg);
    }
    throw e;
  }
}

export async function fetchGog(limit = 24) {
  const url = 'https://catalog.gog.com/v1/catalog?limit=30&locale=en-US&countryCode=CN&currencyCode=CNY&order=desc:discount';
  const j = await getJson(url);
  const products = j.products || [];
  if (!products.length) throw new Error('products 为空');

  const out = [];
  for (const p of products) {
    if (!isGameProduct(p)) continue;
    if (out.length >= limit) break;
    const pr = p.price || {};
    const price = num(pr.final ?? pr.finalMoney);
    const initial = num(pr.base ?? pr.baseMoney);
    if (price === null || initial === null) continue;
    const discount = num(pr.discount);
    const currency = pr.finalMoney?.currency || pr.baseMoney?.currency || 'CNY';
    out.push({
      source: 'gog',
      id: String(p.id),
      name: p.title,
      price,
      initial,
      cut: discount !== null
        ? Math.abs(Math.round(Math.abs(discount) <= 1 && discount !== 0 ? discount * 100 : discount))
        : (initial > 0 && price < initial ? Math.round((1 - price / initial) * 100) : 0),
      currency,
      url: absoluteUrl(p.storeLink, 'https://www.gog.com')
        || absoluteUrl('/game/' + (p.slug || p.id), 'https://www.gog.com'),
      cover: p.coverHorizontal ? (String(p.coverHorizontal).startsWith('//') ? 'https:' + p.coverHorizontal : String(p.coverHorizontal)) : (p.coverVertical ? (String(p.coverVertical).startsWith('//') ? 'https:' + p.coverVertical : String(p.coverVertical)) : null),
      promo_start: null,
      promo_end: null,
      free_kind: price === 0 ? 'permanent' : null,
      tags: (p.tags || []).map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean).slice(0, 8),
      supports_zh: 'unknown',
      players_online: null
    });
  }
  return out;
}
