// 字段归一：所有缺失一律显式 null / [] / 'unknown'，禁止 undefined 落库
export const FIELD_DEFAULTS = {
  promo_start: null,
  promo_end: null,
  tags: [],
  supports_zh: 'unknown',
  lowest_price: null,
  is_new_low: null,
  players_online: null,
  free_kind: null,
  currency: 'CNY'
};

export const toNum = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const cents = (v) => { const n = toNum(v); return n === null ? null : Math.round(n) / 100; };

export const toIso = (v) => {
  if (!v) return null;
  if (typeof v === 'number' || /^\d+$/.test(String(v))) {
    const n = Number(v);
    const ms = n > 1e11 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export function normalizeItem(raw) {
  const out = { ...FIELD_DEFAULTS, ...raw };
  if (!Array.isArray(out.tags)) out.tags = [];
  out.tags = out.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim()).slice(0, 12);
  if (!['limited', 'permanent', null].includes(out.free_kind)) out.free_kind = null;
  if (typeof out.supports_zh !== 'boolean') out.supports_zh = out.supports_zh === true ? true : (out.supports_zh === false ? false : 'unknown');
  for (const k of ['price', 'initial', 'cut', 'lowest_price', 'players_online']) {
    if (out[k] === undefined) out[k] = null;
  }
  out.promo_start = toIso(out.promo_start);
  out.promo_end = toIso(out.promo_end);
  return out;
}
