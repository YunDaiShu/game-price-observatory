const LABEL = { steam: 'Steam', 'steam-specials': 'Steam 特惠', epic: 'Epic', gog: 'GOG', appstore: 'App Store', steampy: 'SteamPY' };
const GROUP = (it) => (String(it.source).startsWith('steam') ? 'steam' : it.source);
const GROUP_LABEL = { steam: 'Steam', epic: 'Epic', gog: 'GOG', steampy: 'SteamPY', appstore: 'App Store' };

export function renderPage(payload) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const items = payload.items || [];

  const groupCount = {};
  for (const it of items) {
    const g = GROUP(it);
    groupCount[g] = (groupCount[g] || 0) + 1;
  }

  // 筛选：全部 + 每个平台分组；0 条的来源也保留，状态明确
  const groups = ['steam', 'epic', 'gog', 'steampy'];
  // 只渲染「有数据」的分组入口：空来源不出现在筛选条里（如未配置端点的 SteamPY）
  const chips = [{ key: 'all', text: '全部', n: items.length }]
    .concat(groups.filter((g) => (groupCount[g] || 0) > 0).map((g) => ({ key: g, text: GROUP_LABEL[g] || g, n: groupCount[g] })));

  const priceBlock = (it) => {
    const sym = it.currency === 'USD' ? '$' : '¥';
    if (it.price === null || it.price === undefined) return '<span class="na">—</span>';
    if (it.price === 0) return '<b class="free">免费</b>';
    const was = it.initial && it.initial > it.price ? '<s>' + sym + it.initial + '</s>' : '';
    const cut = it.cut > 0 ? '<span class="cut">-' + it.cut + '%</span>' : '';
    return '<b>' + sym + it.price + '</b>' + was + cut;
  };

  const card = (it) => {
    const name = it.url
      ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.name) + '</a>'
      : '<span>' + esc(it.name) + '</span>';
    const badges = [];
    badges.push('<span class="b-src s-' + esc(GROUP(it)) + '">' + esc(LABEL[it.source] || it.source) + '</span>');
    if (it.free_kind === 'limited') badges.push('<span class="b-free">限免</span>');
    if (it.supports_zh === true) badges.push('<span class="b-zh">中文</span>');
    if (it.is_new_low === true) badges.push('<span class="b-low">新史低</span>');

    const meta = [];
    if (it.promo_end) meta.push('<span class="cd" data-end="' + esc(it.promo_end) + '">截止时间计算中</span>');
    if (typeof it.players_online === 'number') meta.push('<span>在线 ' + it.players_online.toLocaleString('en-US') + '</span>');
    if (it.lowest_price !== null && it.lowest_price !== undefined && it.is_new_low !== true) {
      meta.push('<span>史低 ' + (it.currency === 'USD' ? '$' : '¥') + it.lowest_price + '</span>');
    }

    const tags = (it.tags && it.tags.length)
      ? '<div class="tags">' + it.tags.slice(0, 3).map((t) => '<span>' + esc(t) + '</span>').join('') + '</div>'
      : '';

    return '<article class="card' + (it.free_kind === 'limited' ? ' is-free' : '') + '" data-group="' + esc(GROUP(it)) + '">'
      + '<div class="card-top"><h3>' + name + '</h3><div class="price">' + priceBlock(it) + '</div></div>'
      + '<div class="badges">' + badges.join('') + '</div>'
      + (meta.length ? '<div class="meta">' + meta.join('') + '</div>' : '')
      + tags
      + '</article>';
  };

  // 未启用 SteamPY 时，页面上完全不出现其字样
  const hasSteampy = items.some((i) => i.source === 'steampy');
  const footerSources = '杉果 / SteamDB / Humble Bundle 无公开可用接口，未收录'
    + (hasSteampy ? '；SteamPY 数据来自你配置的端点' : '') + '。';

  const errorList = (payload.errors || []).length
    ? '<section class="notice"><h2>本次未取到数据的来源（其余照常）</h2><ul>'
      + payload.errors.map((e) => '<li><b>' + esc(e.source) + '</b>：' + esc(e.error) + '</li>').join('')
      + '</ul></section>'
    : '';

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>免费游戏雷达 · 限免 / 折扣 / 史低</title>
<style>
:root{--bg:#f5f6f5;--panel:#fff;--line:#e4e7e4;--fg:#1b1f23;--dim:#6b7280;--muted:#9aa3ac;--hot:#e0393e;--free:#0f9d58;--chip:#eef1ee}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.6 "PingFang SC","Microsoft YaHei",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.wrap{max-width:1160px;margin:0 auto;padding:0 18px 56px}
header{padding:30px 0 6px}
h1{margin:0;font-size:24px;letter-spacing:.02em}
.sub{color:var(--dim);font-size:12.5px;margin-top:6px}
.stats{display:flex;gap:18px;flex-wrap:wrap;margin:14px 0 0;font-size:12.5px;color:var(--dim)}
.stats b{color:var(--fg);font-size:15px;margin-right:3px}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 14px;align-items:center}
.chip{appearance:none;border:1px solid var(--line);background:var(--panel);color:var(--fg);border-radius:999px;padding:7px 14px;font-size:13px;cursor:pointer;font-family:inherit;transition:background .12s,border-color .12s}
.chip{transition:background .14s ease,border-color .14s ease,transform .1s ease,color .14s ease}
.chip:hover{border-color:#c8cfc8}
.chip:active{transform:scale(.97)}
.chip .n{color:var(--muted);margin-left:5px;font-variant-numeric:tabular-nums}
.chip[aria-pressed="true"]{background:#1b1f23;border-color:#1b1f23;color:#fff}
.chip[aria-pressed="true"] .n{color:#b9c2bb}
.showing{margin-left:auto;color:var(--dim);font-size:12.5px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:12px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 15px 13px;display:flex;flex-direction:column;gap:9px}
.card[hidden]{display:none}
.card{transition:opacity .16s ease,transform .16s ease,box-shadow .16s ease}
.card:hover{box-shadow:0 4px 14px rgba(16,24,16,.09);transform:translateY(-2px)}
.card.fade-out{opacity:0;transform:translateY(6px) scale(.985)}
.card.is-free{border-color:#bfe3cd;box-shadow:inset 3px 0 0 var(--free)}
.card-top{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}
.card h3{margin:0;font-size:14.5px;font-weight:600;line-height:1.42}
.card h3 a{color:inherit;text-decoration:none}
.card h3 a:hover{color:#0b6b3a;text-decoration:underline}
.price{white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;flex:none}
.price b{font-size:16px}
.price b.free{color:var(--free)}
.price s{color:var(--muted);font-size:11.5px;margin-left:5px}
.price .cut{color:var(--hot);font-size:12px;font-weight:700;margin-left:5px}
.badges{display:flex;gap:6px;flex-wrap:wrap}
.badges span{font-size:11px;line-height:1.7;border-radius:4px;padding:0 6px;border:1px solid transparent}
.b-src{background:var(--chip);color:#4b5563}
.b-src.s-epic{background:#f0eefc;color:#5b46c4}
.b-src.s-gog{background:#f7eef1;color:#a3415f}
.b-src.s-steam{background:#eaf1fb;color:#2c5d9b}
.b-src.s-steampy{background:#fdf0e6;color:#a05a1f}
.b-free{background:#e6f6ec;color:#0f7a44;border-color:#bfe3cd}
.b-zh{background:#eef4ff;color:#2c5d9b}
.b-low{background:#fff5e0;color:#8a6100;border-color:#f2dca8}
.meta{display:flex;gap:12px;flex-wrap:wrap;color:var(--dim);font-size:12px}
.meta .cd{color:#8a6100;font-variant-numeric:tabular-nums}
.tags{display:flex;gap:5px;flex-wrap:wrap}
.tags span{font-size:11px;color:var(--dim);background:#f6f7f6;border-radius:4px;padding:1px 6px}
.na{color:var(--muted)}
.notice{margin-top:22px;background:#fffaf0;border:1px solid #f0e0bf;border-left:3px solid #d9a300;border-radius:0 8px 8px 0;padding:12px 16px;font-size:12.5px}
.notice h2{margin:0 0 6px;font-size:13px;color:#7a5b00}
.notice ul{margin:0;padding-left:18px;color:#5f5745}
footer{margin-top:28px;border-top:1px solid var(--line);padding-top:14px;color:var(--muted);font-size:11.5px;line-height:1.9}
footer a{color:#6b7280}
</style></head>
<body><div class="wrap">
<header>
  <h1>免费游戏雷达</h1>
  <div class="sub">限免 · 折扣 · 史低 ｜ 抓取 ${esc(payload.generated_at)}（北京 ${esc(payload.generated_at_bj)}）· 区服 ${esc(payload.region)}</div>
  <div class="stats">
    <span><b>${items.length}</b>在榜</span>
    <span><b>${payload.counts?.limited_free ?? 0}</b>限免</span>
    <span><b>${payload.counts?.new_low ?? 0}</b>新史低</span>
    <span><b>${(payload.errors || []).length}</b>来源异常</span>
  </div>
</header>

<div class="filters" role="group" aria-label="按来源筛选">
  ${chips.map((c) => '<button class="chip" type="button" data-group="' + esc(c.key) + '" aria-pressed="' + (c.key === 'all' ? 'true' : 'false') + '">' + esc(c.text) + '<span class="n">' + c.n + '</span></button>').join('')}
  <span class="showing" id="showing">显示 ${items.length} / ${items.length}</span>
</div>

<main class="grid" id="grid">
${items.length ? items.map(card).join('') : '<p class="na">本次没有任何数据</p>'}
</main>

${errorList}

<footer>
数据来自各平台公开接口，仅记录抓取时刻的状态；缺失字段显示「—」，不做估算。<br>
${footerSources}<br>
价格与活动以商店页面为准；游戏名称与商标归其各自权利人所有 · <a href="https://github.com/YunDaiShu/game-price-radar">game-price-radar</a>
</footer>
</div>
<script>
(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var showing = document.getElementById('showing');
  var total = cards.length;

  var counts = { all: total };
  cards.forEach(function (card) {
    var g = card.getAttribute('data-group');
    counts[g] = (counts[g] || 0) + 1;
  });

  var pending = null;
  function apply(group) {
    if (pending) { clearTimeout(pending); pending = null; }

    var toHide = [], toShow = [];
    cards.forEach(function (card) {
      var ok = group === 'all' || card.getAttribute('data-group') === group;
      if (!ok && !card.hidden) toHide.push(card);
      else if (ok && card.hidden) toShow.push(card);
    });

    // 1) 要隐藏的：先淡出，再置 hidden
    toHide.forEach(function (card) { card.classList.add('fade-out'); });

    // 2) 要显示的：解除 hidden 后淡入，按顺序错峰 12ms（封顶 120ms）
    toShow.forEach(function (card, i) {
      card.hidden = false;
      card.classList.add('fade-out');
      card.style.transitionDelay = Math.min(i * 12, 120) + 'ms';
      requestAnimationFrame(function () { card.classList.remove('fade-out'); });
    });

    pending = setTimeout(function () {
      toHide.forEach(function (card) {
        card.hidden = true;
        card.classList.remove('fade-out');
        card.style.transitionDelay = '';
      });
      toShow.forEach(function (card) { card.style.transitionDelay = ''; });
      pending = null;
    }, toHide.length ? 170 : 0);

    if (showing) showing.textContent = '显示 ' + (counts[group] || 0) + ' / ' + total;
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var group = chip.getAttribute('data-group');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      apply(group);
    });
  });

  function fmt(ms) {
    if (ms <= 0) return '已结束';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    if (d >= 1) return d + ' 天' + (d <= 7 ? ' ' + h + ' 小时' : '');
    if (h >= 1) return h + ' 小时 ' + m + ' 分';
    return m + ' 分';
  }
  function tick() {
    var now = Date.now();
    Array.prototype.forEach.call(document.querySelectorAll('.cd[data-end]'), function (el) {
      var end = Date.parse(el.getAttribute('data-end'));
      if (isNaN(end)) { el.textContent = '截止时间未公布'; return; }
      var left = end - now;
      el.textContent = left <= 0 ? '活动已结束' : ('截止还剩 ' + fmt(left));
    });
  }
  tick();
  setInterval(tick, 60000);
})();
</script>
</body></html>`;
}
