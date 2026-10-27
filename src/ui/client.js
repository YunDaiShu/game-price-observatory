(function () {
  var cards = [].slice.call(document.querySelectorAll('.card'));
  var tabs = [].slice.call(document.querySelectorAll('.tab'));
  var pills = [].slice.call(document.querySelectorAll('.pill[data-filter]'));
  var sorts = [].slice.call(document.querySelectorAll('.pill[data-sort]'));
  var grid = document.getElementById('grid');
  var empty = document.getElementById('empty');
  var showing = document.getElementById('showing');
  var toggleFree = document.getElementById('toggleFree');
  var qInput = document.getElementById('q');
  var stickyBar = document.querySelector('.sticky-bar');
  var total = cards.length;

  var PLAT = { steam: 'Steam', epic: 'Epic', gog: 'GOG', appstore: 'App Store' };
  var INITIAL = { steam: 'S', epic: 'E', gog: 'G', appstore: 'A' };
  var LABEL = { steam: 'Steam', 'steam-specials': 'Steam 特惠', epic: 'Epic', gog: 'GOG', appstore: 'App Store' };
  var state = { tab: 'all', freeOnly: false, newLow: false, hasEnd: false, sort: 'cut', q: '' };
  var EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  var MOVE_MS = 260;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtEnd(ms) { var d = new Date(ms); return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function fmtLeft(ms) {
    if (ms <= 0) return '已结束';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    var hms = pad(Math.floor((s % 86400) / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
    return d > 0 ? '剩余 ' + d + '天 ' + hms : '剩余 ' + hms;
  }
  function tick() {
    var now = Date.now();
    [].forEach.call(document.querySelectorAll('[data-end-abs]'), function (el) {
      var end = Number(el.getAttribute('data-end-abs'));
      if (!end) return;
      if (el.classList.contains('cd')) el.textContent = fmtLeft(end - now);
      else el.textContent = '截止 ' + fmtEnd(end);
    });
    if (modalOpen && current && current.end) {
      var rem = document.getElementById('mRemain');
      if (rem) rem.textContent = fmtLeft(current.end - now);
    }
  }
  setInterval(tick, 1000);

  /* ---------- 文案：共 N 款游戏 / 共找到 N 款游戏 ---------- */
  function updateShowing(visible) {
    if (!showing) return;
    var filtered = state.tab !== 'all' || state.freeOnly || state.newLow || state.hasEnd || state.q;
    showing.textContent = filtered ? ('共找到 ' + visible + ' 款游戏') : ('共 ' + total + ' 款游戏');
  }

  /* ---------- FLIP ---------- */
  function flip(update) {
    var first = new Map();
    cards.forEach(function (c) { if (!c.hidden) first.set(c, c.getBoundingClientRect()); });
    update();
    var last = new Map();
    cards.forEach(function (c) { if (!c.hidden) last.set(c, c.getBoundingClientRect()); });
    cards.forEach(function (c) {
      var f = first.get(c), l = last.get(c);
      if (!f || !l) return;
      var dx = f.left - l.left, dy = f.top - l.top;
      if (!dx && !dy) return;
      c.style.transition = 'none';
      c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    requestAnimationFrame(function () {
      cards.forEach(function (c) {
        if (!c.style.transform) return;
        c.style.willChange = 'transform';
        c.style.transition = 'transform ' + MOVE_MS + 'ms ' + EASE;
        c.style.transform = '';
        c.addEventListener('transitionend', function () {
          c.style.transition = ''; c.style.transform = ''; c.style.willChange = '';
        }, { once: true });
      });
    });
  }

  function matches(card) {
    var okTab = state.tab === 'all' || card.getAttribute('data-group') === state.tab;
    var okFree = !state.freeOnly || card.getAttribute('data-free') === '1';
    var okLow = !state.newLow || card.getAttribute('data-newlow') === '1';
    var okEnd = !state.hasEnd || Number(card.getAttribute('data-end')) > 0;
    var okQ = !state.q || String(card.getAttribute('data-name') || '').indexOf(state.q) >= 0;
    return okTab && okFree && okLow && okEnd && okQ;
  }
  function orderBy() {
    var key = state.sort;
    return cards.slice().sort(function (a, b) {
      if (key === 'price') return Number(a.getAttribute('data-price')) - Number(b.getAttribute('data-price'));
      if (key === 'players') return Number(b.getAttribute('data-players')) - Number(a.getAttribute('data-players'));
      if (key === 'end') return (Number(a.getAttribute('data-end')) || Infinity) - (Number(b.getAttribute('data-end')) || Infinity);
      return Number(b.getAttribute('data-cut')) - Number(a.getAttribute('data-cut'));
    });
  }
  var applyTimer = null;
  function apply() {
    if (applyTimer) { clearTimeout(applyTimer); applyTimer = null; }
    var want = new Map();
    cards.forEach(function (c) { want.set(c, matches(c)); });
    var leaving = [], entering = [], visible = 0;
    cards.forEach(function (c) {
      var ok = want.get(c);
      if (ok) visible++;
      if (ok && c.hidden) entering.push(c);
      if (!ok && !c.hidden) leaving.push(c);
    });

    function commit() {
      flip(function () {
        cards.forEach(function (c) { c.hidden = !want.get(c); });
        orderBy().forEach(function (c) { grid.appendChild(c); });
        if (empty) grid.appendChild(empty);
      });
      entering.forEach(function (c, i) {
        c.classList.add('card--enter');
        c.style.animationDelay = Math.min(i * 14, 120) + 'ms';
        setTimeout(function () { c.classList.remove('card--enter'); c.style.animationDelay = ''; }, 520);
      });
      if (grid) grid.classList.toggle('single', visible === 1);
      updateShowing(visible);
      if (empty) empty.hidden = visible > 0;
      applyTimer = null;
    }

    if (!leaving.length) { commit(); return; }
    // 第一段：离场卡片淡出（保留占位）→ 第二段：补位 FLIP
    leaving.forEach(function (c) { c.classList.add('card--leave'); });
    updateShowing(visible);
    if (grid) grid.classList.toggle('single', visible === 1);
    applyTimer = setTimeout(function () {
      leaving.forEach(function (c) { c.classList.remove('card--leave'); });
      commit();
    }, 140);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (tab.getAttribute('aria-selected') === 'true') return;
      state.tab = tab.getAttribute('data-group');
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
      apply();
    });
  });
  pills.forEach(function (p) {
    p.addEventListener('click', function () {
      var f = p.getAttribute('data-filter');
      if (f === 'newlow') { state.newLow = !state.newLow; p.setAttribute('aria-pressed', state.newLow ? 'true' : 'false'); }
      if (f === 'hasend') { state.hasEnd = !state.hasEnd; p.setAttribute('aria-pressed', state.hasEnd ? 'true' : 'false'); }
      apply();
    });
  });
  sorts.forEach(function (s) {
    s.addEventListener('click', function () {
      state.sort = s.getAttribute('data-sort');
      sorts.forEach(function (x) { x.setAttribute('aria-pressed', x === s ? 'true' : 'false'); });
      flip(function () { orderBy().forEach(function (c) { grid.appendChild(c); }); });
    });
  });
  if (toggleFree) toggleFree.addEventListener('click', function () {
    state.freeOnly = toggleFree.getAttribute('aria-pressed') !== 'true';
    toggleFree.setAttribute('aria-pressed', state.freeOnly ? 'true' : 'false');
    apply();
  });

  /* ---------- Sticky ---------- */
  if (stickyBar) {
    var onScroll = function () { stickyBar.classList.toggle('stuck', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Toast：sessionStorage + localStorage 双保险 ---------- */
  var toast = document.getElementById('toast');
  if (toast) {
    var store = {
      get: function () { try { return sessionStorage.getItem('gpr.toast') || localStorage.getItem('gpr.toast'); } catch (e) { return null; } },
      set: function () { try { sessionStorage.setItem('gpr.toast', '1'); } catch (e) {} try { localStorage.setItem('gpr.toast', '1'); } catch (e) {} }
    };
    if (store.get() === '1') { toast.hidden = true; toast.style.display = 'none'; }
    var x = toast.querySelector('.x');
    if (x) x.addEventListener('click', function () { toast.hidden = true; toast.style.display = 'none'; store.set(); });
  }

  /* ---------- 卡片组件（搜索与列表同一套结构） ---------- */
  function cardFromRecord(r) {
    var g = String(r.s).indexOf('steam') === 0 ? 'steam' : r.s;
    var key = r.s + ':' + r.i;
    var endMs = r.e ? (Date.parse(r.e) || 0) : 0;
    var hasCover = String(r.s).indexOf('steam') === 0 && /^[0-9]+$/.test(String(r.i));
    var price = (r.p === null || r.p === undefined) ? '—' : (r.p === 0 ? '免费' : '¥' + r.p);
    var priceRow = r.p === 0
      ? '<span class="price free">免费</span>'
      : (r.c > 0 ? '<span class="badge">-' + r.c + '%</span>' : '') + '<span class="price">' + price + '</span>'
        + (r.o && r.o > r.p ? '<span class="origin">¥' + r.o + '</span>' : '');
    var meta = '';
    if (r.lo) meta += '<span>史低 ¥' + r.lo + '</span>';
    meta += endMs
      ? '<span data-end-abs="' + endMs + '">截止 ' + fmtEnd(endMs) + '</span><span class="cd" data-end-abs="' + endMs + '">' + fmtLeft(endMs - Date.now()) + '</span>'
      : '<span>截止未公布</span>';
    var tags = (r.tg || []).slice(0, 3).map(function (t) { return '<span>' + t + '</span>'; }).join('');
    return '<article class="card" data-group="' + g + '" data-key="' + key + '" tabindex="0">'
      + '<div class="cover"><span class="cover-tag">' + (LABEL[r.s] || r.s) + '</span>'
      + '<a class="cover-go" href="detail/?key=' + encodeURIComponent(key) + '" title="打开详情页">↗</a>'
      + (INITIAL[g] || '?')
      + (hasCover ? '<img class="cover-img" loading="lazy" alt="" src="https://cdn.cloudflare.steamstatic.com/steam/apps/' + r.i + '/header.jpg" onerror="this.remove()">' : '')
      + '</div><h3 class="name">' + r.n + '</h3><div class="price-row">' + priceRow + '</div>'
      + '<div class="card-meta">' + meta + '</div><div class="tags">' + tags + '</div></article>';
  }

  /* ---------- 搜索 ---------- */
  var SEARCH = null, loading = false, sres = null;
  function panel() {
    if (sres) return sres;
    var host = qInput && qInput.closest('.search');
    if (!host) return null;
    sres = document.createElement('div');
    sres.className = 'sres';
    sres.hidden = true;
    host.appendChild(sres);
    document.addEventListener('click', function (e) { if (!host.contains(e.target)) sres.hidden = true; });
    return sres;
  }
  function loadIndex(cb) {
    if (SEARCH) { cb(); return; }
    if (loading) return;
    loading = true;
    fetch('search-index.json').then(function (r) { return r.ok ? r.json() : []; })
      .then(function (a) { SEARCH = Array.isArray(a) ? a : []; })
      .catch(function () { SEARCH = []; })
      .then(function () { loading = false; cb(); });
  }
  function renderSearch(q) {
    var box = panel();
    if (!box) return;
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    var pool = (SEARCH && SEARCH.length) ? SEARCH : DATA.map(function (d) {
      return { s: d.source, i: d.id, n: d.name, p: d.price, o: d.initial, c: d.cut, lo: d.lowest, u: d.url, e: d.end, pl: d.players, zh: d.zh, tg: d.tags };
    });
    var hits = pool.filter(function (r) { return String(r.n).toLowerCase().indexOf(q) >= 0; }).slice(0, 12);
    box.hidden = false;
    if (!hits.length) { box.innerHTML = '<div class="sres-head">没有匹配结果</div>'; return; }
    box.innerHTML = '<div class="sres-head">找到 <b>' + hits.length + '</b> 个结果</div>'
      + '<div class="sres-grid' + (hits.length <= 1 ? ' single' : '') + '">' + hits.map(cardFromRecord).join('') + '</div>';
    [].forEach.call(box.querySelectorAll('.card'), function (el) {
      el.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('.cover-go')) return;
        openModal(el.getAttribute('data-key'));
        box.hidden = true;
      });
    });
  }
  if (qInput) qInput.addEventListener('input', function () {
    state.q = String(qInput.value || '').trim().toLowerCase();
    apply();
    if (state.q.length >= 1) loadIndex(function () { renderSearch(state.q); });
    else renderSearch('');
  });

  /* ---------- Modal ---------- */
  var overlay = document.getElementById('overlay');
  var modalOpen = false, current = null;
  var byKey = {};
  DATA.forEach(function (d) { byKey[d.source + ':' + d.id] = d; });

  function recordOf(key) {
    if (byKey[key]) {
      var d = byKey[key];
      return { source: d.source, id: d.id, name: d.name, price: d.price, initial: d.initial, cut: d.cut, url: d.url, end: d.end, zh: d.zh, lowest: d.lowest, tags: d.tags };
    }
    var hit = (SEARCH || []).find(function (r) { return r.s + ':' + r.i === key; });
    if (!hit) return null;
    return { source: hit.s, id: hit.i, name: hit.n, price: hit.p, initial: hit.o, cut: hit.c, url: hit.u, end: hit.e, zh: hit.zh, lowest: hit.lo, tags: hit.tg };
  }

  function setCover(rec) {
    var cover = document.querySelector('.m-cover');
    if (!cover) return;
    var plat = String(rec.source).indexOf('steam') === 0 ? 'steam' : rec.source;
    cover.setAttribute('data-plat', plat);
    cover.style.backgroundImage = '';
    var url = plat === 'steam' && /^[0-9]+$/.test(String(rec.id))
      ? 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + rec.id + '/header.jpg' : null;
    if (!url) return;
    var probe = new Image();
    probe.onload = function () { cover.style.backgroundImage = 'url("' + url + '")'; };
    probe.onerror = function () { cover.style.backgroundImage = ''; };
    probe.src = url;
  }

  function openModal(key) {
    var d = recordOf(key);
    if (!d) return;
    var plat = String(d.source).indexOf('steam') === 0 ? 'steam' : d.source;
    var endMs = d.end ? (Date.parse(d.end) || 0) : 0;
    current = { key: key, end: endMs };
    document.getElementById('mTitle').textContent = d.name;
    document.getElementById('mSub').textContent = PLAT[plat] || d.source;
    setCover(d);
    var infoCards = [
      ['现价', d.price === 0 ? '免费' : '¥' + d.price, ''],
      ['原价', d.initial ? '¥' + d.initial : '—', (d.initial && d.price !== null && d.initial > d.price) ? 'strike' : ''],
      ['折扣', d.cut > 0 ? '-' + d.cut + '%' : '—', ''],
      ['平台', PLAT[plat] || d.source, '']
    ];
    if (d.lowest !== null && d.lowest !== undefined) infoCards.push(['史低', '¥' + d.lowest, '']);
    var info = document.getElementById('mCards');
    info.className = 'cards4' + (infoCards.length === 3 ? ' n3' : '');
    info.innerHTML = infoCards.map(function (c) {
      return '<div class="info-card"><div class="lb">' + c[0] + '</div><div class="vl ' + c[2] + '">' + c[1] + '</div></div>';
    }).join('');
    var meta = [];
    meta.push(endMs ? ('截止 ' + fmtEnd(endMs)) : '截止未公布');
    if (endMs) meta.push('<span id="mRemain">' + fmtLeft(endMs - Date.now()) + '</span>');
    meta.push(d.zh === true ? '支持中文' : (d.zh === false ? '无中文' : '中文未知'));
    (d.tags || []).slice(0, 3).forEach(function (t) { meta.push(t); });
    document.getElementById('mMeta').innerHTML = meta.join('<span class="sep">|</span>');
    drawChart(SERIES[key] || []);
    var cta = document.getElementById('mCta');
    cta.setAttribute('data-plat', plat);
    cta.textContent = '打开 ' + (PLAT[plat] || d.source) + ' 商店页 →';
    if (d.url) { cta.href = d.url; cta.style.display = 'block'; } else { cta.style.display = 'none'; }
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('open'); });
    modalOpen = true;
  }
  function closeModal() {
    if (!modalOpen) return;
    overlay.classList.remove('open');
    modalOpen = false;
    setTimeout(function () { overlay.hidden = true; }, 200);
  }
  function drawChart(points) {
    var svg = document.getElementById('mChart');
    var wrap = document.getElementById('mChartWrap');
    var emptyBox = document.getElementById('mChartEmpty');
    var pts = (points || []).filter(function (p) { return typeof p[1] === 'number' && p[1] > 0; });
    if (pts.length < 2) { if (wrap) wrap.hidden = true; if (emptyBox) emptyBox.hidden = false; return; }
    if (wrap) wrap.hidden = false;
    if (emptyBox) emptyBox.hidden = true;
    var W = 560, H = 160, padL = 44, padR = 14, padT = 12, padB = 24, ns = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    function el(n, a) { var e = document.createElementNS(ns, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
    var ys = pts.map(function (p) { return p[1]; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    function X(i) { return padL + (W - padL - padR) * (i / (pts.length - 1)); }
    function Y(v) { return padT + (H - padT - padB) * (1 - (v - min) / (max - min || 1)); }
    [0, .5, 1].forEach(function (t) { svg.appendChild(el('line', { x1: padL, y1: padT + (H - padT - padB) * t, x2: W - padR, y2: padT + (H - padT - padB) * t, stroke: '#E5E6EB' })); });
    svg.appendChild(el('polyline', { points: pts.map(function (p, i) { return X(i) + ',' + Y(p[1]); }).join(' '), fill: 'none', stroke: '#FF6A00', 'stroke-width': 2 }));
    pts.forEach(function (p, i) { svg.appendChild(el('circle', { cx: X(i), cy: Y(p[1]), r: 2.5, fill: '#FF6A00' })); });
  }

  cards.forEach(function (c) {
    c.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.cover-go')) return;
      openModal(c.getAttribute('data-key'));
    });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter') openModal(c.getAttribute('data-key')); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  var mx = document.getElementById('mClose');
  if (mx) mx.addEventListener('click', closeModal);

  apply();
  tick();
})();
