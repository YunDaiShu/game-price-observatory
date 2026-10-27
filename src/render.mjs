import fs from 'node:fs';
import path from 'node:path';

const UI = path.join(import.meta.dirname, 'ui');
const read = (f) => fs.readFileSync(path.join(UI, f), 'utf8');

const LABEL = { steam: 'Steam', 'steam-specials': 'Steam 特惠', epic: 'Epic', gog: 'GOG', appstore: 'App Store' };
const GROUP = (it) => (String(it.source).startsWith('steam') ? 'steam' : it.source);
const TAB_LABEL = { steam: 'Steam', epic: 'Epic', gog: 'GOG', appstore: 'App Store' };
const INITIAL = { steam: 'S', epic: 'E', gog: 'G', appstore: 'A' };
const fmtEnd = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
};

function coverOf(it) {
  if (it.source === 'gog' && it.cover) return 'https://images.weserv.nl/?url=' + encodeURIComponent(it.cover) + '&w=460&h=215&fit=cover&output=jpg&q=80';
  if (it.cover) return it.cover;
  if (String(it.source).startsWith('steam') && /^[0-9]+$/.test(String(it.id))) {
    return 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + it.id + '/header.jpg';
  }
  return null;
}
function proxyOf(it) {
  if (it.source !== 'gog' || !it.cover) return null;
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(it.cover) + '&w=460&h=215&fit=cover&output=jpg&q=80';
}
function card(it) {
  const g = GROUP(it);
  const key = it.source + ':' + it.id;
  const sym = it.currency === 'USD' ? '$' : '¥';
  const endMs = it.promo_end ? Date.parse(it.promo_end) || 0 : 0;
  const endText = fmtEnd(it.promo_end);

  const priceRow = it.price === 0
    ? '<span class="price free">免费</span>'
    : ((it.cut > 0 && it.initial && it.initial > it.price ? '<span class="badge">-' + it.cut + '%</span><span class="origin">' + sym + it.initial + '</span>' : '')
      + '<span class="price">' + sym + it.price + '</span>');

  const meta = [];
  if (it.lowest_price !== null && it.lowest_price !== undefined && it.price > 0) {
    meta.push('<span>史低 ' + sym + it.lowest_price + '</span>');
  }
  if (endText) {
    meta.push('<span data-end-abs="' + endMs + '">截止 ' + endText + '</span>');
    meta.push('<span class="cd" data-end-abs="' + endMs + '">剩余 --</span>');
  } else {
    meta.push('<span>截止未公布</span>');
  }
  if (typeof it.players_online === 'number') meta.push('<span>在线 ' + it.players_online.toLocaleString('en-US') + '</span>');

  const tags = (it.tags || []).slice(0, 3).map((t) => '<span>' + escapeHtml(t) + '</span>').join('');

  return '<article class="card" data-group="' + g + '" data-key="' + key + '" data-name="' + escapeHtml(String(it.name).toLowerCase()) + '"'
    + ' data-cut="' + (it.cut || 0) + '" data-price="' + (it.price === null || it.price === undefined ? 999999 : it.price) + '"'
    + ' data-players="' + (typeof it.players_online === 'number' ? it.players_online : -1) + '"'
    + ' data-end="' + endMs + '" data-free="' + (it.free_kind === 'limited' ? 1 : 0) + '"'
    + ' data-newlow="' + (it.is_new_low === true ? 1 : 0) + '" tabindex="0">'
    + '<div class="cover"><span class="cover-tag">' + (LABEL[it.source] || it.source) + '</span>'
    + (coverOf(it) ? '<img class="cover-img" loading="lazy" alt="" src="' + coverOf(it) + '"' + (proxyOf(it) ? ' data-proxy="' + proxyOf(it) + '"' : ' onerror="this.remove()"') + '>' : '')
    + '<a class="cover-go" href="detail/?key=' + encodeURIComponent(key) + '" title="打开详情页">↗</a>'
    + (INITIAL[g] || '?') + '</div>'
    + '<h3 class="name" title="' + escapeHtml(it.name) + '">' + escapeHtml(it.name) + '</h3>'
    + '<div class="price-row">' + priceRow + '</div>'
    + '<div class="card-meta">' + meta.join('') + '</div>'
    + '<div class="tags">' + tags + '</div>'
    + '</article>';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function renderPage(payload) {
  const items = payload.items || [];
  const series = payload.series || {};
  const groupCount = {};
  for (const it of items) { const g = GROUP(it); groupCount[g] = (groupCount[g] || 0) + 1; }

  const tabs = [{ key: 'all', text: '全部', n: items.length }]
    .concat(['steam', 'epic', 'gog', 'appstore']
      .filter((g) => groupCount[g])
      .map((g) => ({ key: g, text: TAB_LABEL[g], n: groupCount[g] })));

  const tabsHtml = tabs.map((t) =>
    '<button class="tab" type="button" role="tab" data-group="' + t.key + '" aria-selected="' + (t.key === 'all' ? 'true' : 'false') + '">'
    + escapeHtml(t.text) + '<span class="n">' + t.n + '</span></button>'
  ).join('');

  const errors = payload.errors || [];
  const toastHtml = errors.length
    ? '<div class="toast" id="toast">⚠️ <ul class="list">'
      + errors.map((e) => '<li><b>' + escapeHtml(e.source) + '</b> 数据源暂不可用，已跳过。</li>').join('')
      + '</ul><button class="x" type="button" aria-label="关闭">✕</button></div>'
    : '';

  const data = items.map((it) => ({
    source: it.source, id: it.id, name: it.name, price: it.price, initial: it.initial, cut: it.cut,
    currency: it.currency, url: it.url, end: it.promo_end, players: it.players_online,
    zh: it.supports_zh, lowest: it.lowest_price, freeKind: it.free_kind, tags: it.tags || [], newLow: it.is_new_low, cover: coverOf(it), proxy: proxyOf(it)
  }));

  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>免费游戏雷达 · 限免 / 折扣 / 史低</title>'
    + '<style>' + read('styles.css') + '</style></head><body>'
    + '<header class="header"><div class="in">'
    + '<div class="brand"><span class="brand-dot"></span><h1>免费游戏雷达</h1><small>限免 · 折扣 · 史低</small></div>'
    + '<label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>'
    + '<input id="q" type="search" placeholder="搜索全部数据源（游戏名）" aria-label="搜索游戏" autocomplete="off"></label>'
    + '</div></header>'
    + '<div class="wrap">'
    + toastHtml
    + '<div class="meta-row"><span><b>' + items.length + '</b>在榜</span><span><b>' + (payload.counts ? payload.counts.limited_free : 0) + '</b>限免</span>'
    + '<span><b>' + (payload.counts ? payload.counts.new_low : 0) + '</b>新史低</span><span>抓取 ' + escapeHtml(payload.generated_at_bj || '') + '（北京）</span></div>'
    + '<div class="sticky-bar"><div class="tabs" role="tablist">' + tabsHtml + '</div>'
    + '<div class="pills">'
    + '<button class="pill" type="button" data-filter="newlow" aria-pressed="false">只看新史低</button>'
    + '<button class="pill" type="button" data-filter="hasend" aria-pressed="false">有截止时间</button>'
    + '<span style="width:8px"></span>'
    + '<button class="pill" type="button" data-sort="cut" aria-pressed="true">折扣</button>'
    + '<button class="pill" type="button" data-sort="price" aria-pressed="false">价格</button>'
    + '<button class="pill" type="button" data-sort="players" aria-pressed="false">在线</button>'
    + '<button class="pill" type="button" data-sort="end" aria-pressed="false">截止</button>'
    + '<button class="toggle" type="button" id="toggleFree" aria-pressed="false"><span class="track"></span>只看限免</button>'
    + '<span class="showing" id="showing">显示 ' + items.length + ' / ' + items.length + '</span>'
    + '</div></div>'
    + '<main class="grid" id="grid">' + items.map(card).join('') + '<div class="empty" id="empty" hidden>没有匹配的条目</div></main>'
    + '<footer>数据来源各平台公开接口 · 价格以商店页面为准 · <a href="https://github.com/YunDaiShu/game-price-radar">game-price-radar</a> · <a href="about/">关于</a></footer>'
    + '</div>'
    + '<div class="overlay" id="overlay" hidden><div class="modal" role="dialog" aria-modal="true">'
    + '<div class="m-cover"><button class="m-x" id="mClose" type="button" aria-label="关闭">✕</button>'
    + '<div class="ov"><h2 id="mTitle"></h2><div class="sub" id="mSub"></div></div></div>'
    + '<div class="m-body"><div class="cards4" id="mCards"></div>'
    + '<div class="m-meta" id="mMeta"></div>'
    + '<div class="chart-wrap" id="mChartWrap"><svg id="mChart" viewBox="0 0 560 160" preserveAspectRatio="none"></svg></div>'
    + '<div class="chart-empty" id="mChartEmpty" hidden>'
    + '<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="28"/><path d="M40 26v16l10 8"/><path d="M12 62l12-10 10 6 12-14 10 8" stroke-linecap="round"/></svg>'
    + '<p>历史数据积累中，预计 2 天后自动生成价格曲线</p></div>'
    + '<a class="cta" id="mCta" href="#" target="_blank" rel="noopener"></a>'
    + '</div></div></div>'
    + '<script>var DATA=' + JSON.stringify(data) + ';var SERIES=' + JSON.stringify(series) + ';</script>'
    + '<script>' + read('client.js') + '</script>'
    + '</body></html>';
}
