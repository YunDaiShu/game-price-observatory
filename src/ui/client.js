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

  var PLAT = { steam: 'Steam', epic: 'Epic', gog: 'GOG', appstore: 'App Store', switch: 'Switch 日服', xbox: 'Xbox' };
  var INITIAL = { steam: 'S', epic: 'E', gog: 'G', appstore: 'A', switch: 'N', xbox: 'X' };
  var LABEL = { steam: 'Steam', 'steam-specials': 'Steam 特惠', epic: 'Epic', gog: 'GOG', appstore: 'App Store', switch: 'Switch 日服' };
  /* ---------- Tab 底部橙色指示条（滑动 250ms） ---------- */
  var tabRow = document.querySelector('.tabs');
  var ind = null;
  function moveIndicator(tab) {
    if (!tabRow || !tab) return;
    if (!ind) { ind = document.createElement('span'); ind.className = 'tab-indicator'; tabRow.appendChild(ind); }
    var tr = tabRow.getBoundingClientRect(), br = tab.getBoundingClientRect();
    ind.style.width = Math.round(br.width) + 'px';
    ind.style.transform = 'translateX(' + Math.round(br.left - tr.left + tabRow.scrollLeft) + 'px)';
  }
  var state = { tab: 'all', freeOnly: false, newLow: false, hasEnd: false, sort: 'cut', q: '' };

  function curOf(cur) { return cur === 'USD' ? '$' : cur === 'JPY' ? '\uFFE5' : '\u00A5'; }
  function fmtMoney(v, cur) { return cur === 'JPY' ? '\uFFE5' + Number(v).toLocaleString('en-US') + '\u5186' : curOf(cur) + (cur === 'CNY' ? v : Number(v).toLocaleString('en-US')); }
  var EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

  /* ---------- 迷你 Toast ---------- */
  var toastEl = null, toastTimer = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'mini-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }

  var MOVE_MS = 260;

  /* ---------- 封面兜底：6s 未加载成功则移除 img，露出平台渐变 ---------- */
  /* ---------- GOG 封面三级降级：直连 → weserv 代理 → 移除(渐变) ---------- */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.classList || !img.classList.contains('cover-img')) return;
    var proxy = img.getAttribute('data-proxy');
    if (proxy && img.dataset.proxied !== '1') {
      img.dataset.proxied = '1';
      img.src = proxy;
      setTimeout(function () { if (!img.complete || img.naturalWidth === 0) img.remove(); }, 12000);
      return;
    }
    img.remove();
  }, true);
  function coverFallback() {
    // 只守护"静默挂起"的图（GOG 经代理）。其它平台失败会触发 onerror，无需定时器；
    // 且列表用 loading=lazy，未进入视口的图根本没开始请求，定时器会误杀。
    var imgs = [].slice.call(document.querySelectorAll('.cover-img'));
    imgs.forEach(function (img) {
      if (img.dataset.guarded) return;
      var isProxy = img.src.indexOf('weserv') >= 0 || !!img.getAttribute('data-proxy');
      if (!isProxy) return;
      img.dataset.guarded = '1';
      var killed = false;
      img.addEventListener('load', function () { killed = true; });
      img.addEventListener('error', function () { killed = true; img.remove(); });
      setTimeout(function () {
        if (!killed && (!img.complete || img.naturalWidth === 0)) img.remove();
      }, 20000);
    });
  }

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
      if (el.classList.contains('cd')) {
        el.textContent = fmtLeft(end - now);
        el.classList.toggle('urgent', end - now > 0 && end - now < 86400000);
      }
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
    showing.textContent = filtered ? ('筛选结果：' + visible + ' 款') : ('共 ' + total + ' 款游戏');
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

  /* ---------- 滚动进入视口淡入：下方 30px → 0（300ms） ---------- */
  if ('IntersectionObserver' in window && !reduced) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('card-reveal'); revealIO.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
    cards.forEach(function (card) { revealIO.observe(card); });
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
  function pulsePrices() {
    if (reduced) return;
    [].forEach.call(grid ? grid.querySelectorAll('.card:not([hidden]) .price') : [], function (el) {
      if (el.classList.contains('price-pulse')) return;
      el.classList.add('price-pulse');
      setTimeout(function () { el.classList.remove('price-pulse'); }, 220);
    });
  }

  function apply() {
    pulsePrices(); /* PULSE_V2 */
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
      pulsePrices();
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
      pulsePrices();
      moveIndicator(tab);
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
      if (state.freeOnly) { showToast('仅显示限免模式下不支持排序，请先关闭该开关'); return; }
      state.sort = s.getAttribute('data-sort');
      sorts.forEach(function (x) { x.setAttribute('aria-pressed', x === s ? 'true' : 'false'); });
      pulsePrices();
      flip(function () { orderBy().forEach(function (c) { grid.appendChild(c); }); });
    });
  });
  if (toggleFree) toggleFree.addEventListener('click', function () {
    state.freeOnly = toggleFree.getAttribute('aria-pressed') !== 'true';
    toggleFree.setAttribute('aria-pressed', state.freeOnly ? 'true' : 'false');
    // 只看限免时，排序 Pill 无意义 → 置灰禁用
    sorts.forEach(function (s) {
      s.classList.toggle('is-off', state.freeOnly);
      s.setAttribute('aria-disabled', state.freeOnly ? 'true' : 'false');
    });
    apply();
  });

  /* ---------- 移动端导航收起 ---------- */
  var navToggle = document.getElementById('navToggle');
  var tabsRow = document.getElementById('tabsRow');
  if (navToggle && tabsRow) {
    navToggle.addEventListener('click', function () {
      var open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      tabsRow.classList.toggle('open', !open);
      if (!open) moveIndicator(document.querySelector('.tab[aria-selected="true"]'));
    });
  }

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
    var coverUrl = r.cv || (String(r.s).indexOf('steam') === 0 && /^[0-9]+$/.test(String(r.i)) ? 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + r.i + '/header.jpg' : null);
    var price = (r.p === null || r.p === undefined) ? '—' : (r.p === 0 ? '免费' : '¥' + r.p);
    var priceRow = r.p === 0
      ? '<span class="price free">免费</span>'
      : (r.c > 0 ? '<span class="badge">-' + r.c + '%</span>' : '') + '<span class="price">' + price + '</span>'
        + (r.o && r.o > r.p ? '<span class="origin">' + fmtMoney(r.o, r.cur) + '</span>' : '');
    var meta = '';
    if (r.lo) meta += '<span>史低 ¥' + r.lo + '</span>';
    meta += endMs
      ? '<span data-end-abs="' + endMs + '">截止 ' + fmtEnd(endMs) + '</span><span class="cd" data-end-abs="' + endMs + '">' + fmtLeft(endMs - Date.now()) + '</span>'
      : '<span>截止未公布</span>';
    var proxyUrl = (r.s === 'gog' && coverUrl) ? 'https://images.weserv.nl/?url=' + encodeURIComponent(coverUrl) + '&w=460&h=215&fit=cover&output=jpg&q=80' : null;
    if (proxyUrl) coverUrl = proxyUrl;
    var tags = (r.tg || []).slice(0, 3).map(function (t) { return '<span>' + t + '</span>'; }).join('');
    return '<article class="card" data-group="' + g + '" data-key="' + key + '" tabindex="0">'
      + '<div class="cover"><span class="cover-tag">' + (LABEL[r.s] || r.s) + '</span>'
      + '<a class="cover-go" href="detail/?key=' + encodeURIComponent(key) + '" title="打开详情页">↗</a>'
      + (INITIAL[g] || '?')
      + (coverUrl ? '<img class="cover-img" loading="lazy" alt="" src="' + coverUrl + '"' + (proxyUrl ? ' data-proxy="' + proxyUrl + '"' : ' onerror="this.remove()"') + '>' : '')
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
  function thumbOf(r) {
    var cover = r.cv || (String(r.s).indexOf('steam') === 0 && /^[0-9]+$/.test(String(r.i))
      ? 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + r.i + '/header.jpg' : null);
    if (r.s === 'gog' && cover) cover = 'https://images.weserv.nl/?url=' + encodeURIComponent(cover) + '&w=460&h=215&fit=cover&output=jpg&q=80';
    var g = String(r.s).indexOf('steam') === 0 ? 'steam' : r.s;
    var init = ({ steam: 'S', epic: 'E', gog: 'G', appstore: 'A' })[g] || '?';
    return '<span class="sres-thumb" data-group="' + g + '">' + init
      + (cover ? '<img class="cover-img" loading="lazy" alt="" src="' + cover + '" onerror="this.remove()">' : '')
      + '</span>';
  }
  function rowOf(r) {
    var cut = Number(r.c) || 0;
    var hasCut = cut > 0 && r.o && r.p !== null && r.p !== undefined && r.o > r.p;
    var priceRow = r.p === 0
      ? '<span class="price free">免费</span>'
      : (hasCut ? '<span class="badge">-' + cut + '%</span>' + '<span class="origin">' + fmtMoney(r.o, r.cur) + '</span>' : '')
        + '<span class="price">' + (r.p === null || r.p === undefined ? '—' : fmtMoney(r.p, r.cur)) + '</span>';
    return '<button class="sres-row" type="button" data-key="' + r.s + ':' + r.i + '">'
      + thumbOf(r)
      + '<span class="sres-main"><span class="sres-name">' + r.n + '</span><span class="sres-price">' + priceRow + '</span></span>'
      + '</button>';
  }
  function renderSearch(q) {
    var box = panel();
    if (!box) return;
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    var pool = (SEARCH && SEARCH.length) ? SEARCH : DATA.map(function (d) {
      return { s: d.source, i: d.id, n: d.name, p: d.price, o: d.initial, c: d.cut, lo: d.lowest, u: d.url, e: d.end, cv: d.cover, tg: d.tags };
    });
    var hits = pool.filter(function (r) { return String(r.n).toLowerCase().indexOf(q) >= 0; }).slice(0, 12);
    box.hidden = false;
    if (!hits.length) {
      box.innerHTML = '<div class="sres-head"><span>搜索结果</span><span>0 个</span></div>'
        + '<div class="sres-empty">'
        + '<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#D1D5DB" stroke-width="2"><circle cx="28" cy="28" r="14"/><path d="M38 38l12 12" stroke-linecap="round"/></svg>'
        + '<p class="sres-empty-t">没有找到相关游戏</p>'
        + '<p class="sres-empty-s">试试更短的关键词，或切换到对应平台 Tab 浏览</p>'
        + '<button class="sres-empty-btn btn btn-ghost" type="button">清空搜索</button>'
        + '</div>';
      return;
    }
    box.innerHTML = '<div class="sres-head"><span>搜索结果</span><span><b>' + hits.length + '</b> 个</span></div>'
      + '<div class="sres-list">' + hits.map(rowOf).join('') + '</div>'
      + '<button class="sres-more btn btn-ghost btn-block" type="button">在列表中查看 ' + hits.length + ' 个结果 ›</button>';
    [].forEach.call(box.querySelectorAll('.sres-row'), function (el) {
      el.addEventListener('click', function () { openModal(el.getAttribute('data-key')); dimGrid(true); box.hidden = true; });
    });
    var more = box.querySelector('.sres-more');
    if (more) more.addEventListener('click', function (e) {
      e.stopPropagation();
      box.hidden = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (qInput) {
    qInput.addEventListener('focus', function () { document.body.classList.add('search-focus'); });
    qInput.addEventListener('blur', function () { document.body.classList.remove('search-focus'); });
  }

  if (qInput) qInput.addEventListener('input', function () {
    state.q = String(qInput.value || '').trim().toLowerCase();
    apply();
    if (state.q.length >= 1) loadIndex(function () { renderSearch(state.q); });
    else renderSearch('');
  });

  /* ---------- Hero Transition：卡片 → 弹窗 ---------- */
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroRect = null;
  function dimGrid(on) {
    if (grid) grid.classList.toggle('hero-dim', !!on);
  }
  function heroOpen(card, key) {
    var r = card.getBoundingClientRect();
    heroRect = { left: r.left, top: r.top, width: r.width, height: r.height, key: key };
    var modal = document.querySelector('.modal');
    openModal(key);
    dimGrid(true);
    modal.classList.add('hero-in');
    if (reduced) return;
    var mr = modal.getBoundingClientRect();
    if (!mr.width || !mr.height) return;
    var dx = r.left - mr.left, dy = r.top - mr.top;
    var sx = r.width / mr.width, sy = r.height / mr.height;
    modal.style.setProperty('--hx', dx + 'px');
    modal.style.setProperty('--hy', dy + 'px');
    modal.style.setProperty('--hsx', String(sx));
    modal.style.setProperty('--hsy', String(sy));
    modal.classList.add('hero-run');
    setTimeout(function () { modal.classList.remove('hero-run'); }, 460);
  }

  function heroClose() {
    var modal = document.querySelector('.modal');
    if (reduced || !heroRect || !modal) { dimGrid(false); closeModal(); return; }
    var card = document.querySelector('.card[data-key="' + heroRect.key + '"]');
    var target = card ? card.getBoundingClientRect() : heroRect;
    var mr = modal.getBoundingClientRect();
    modal.classList.remove('hero-in');
    dimGrid(false);
    var done = function () {
      closeModal();
      modal.style.transform = '';
      modal.style.borderRadius = '';
    };
    if (!mr.width) { done(); return; }
    var dx = target.left - mr.left, dy = target.top - mr.top;
    var sx = target.width / mr.width, sy = target.height / mr.height;
    modal.style.setProperty('--hx', dx + 'px');
    modal.style.setProperty('--hy', dy + 'px');
    modal.style.setProperty('--hsx', String(sx));
    modal.style.setProperty('--hsy', String(sy));
    modal.classList.add('hero-back');
    setTimeout(function () { modal.classList.remove('hero-back'); done(); }, 330);
  }
  /* ---------- Modal ---------- */
  var overlay = document.getElementById('overlay');
  var modalOpen = false, current = null;
  var byKey = {};
  DATA.forEach(function (d) { byKey[d.source + ':' + d.id] = d; });

  function recordOf(key) {
    if (byKey[key]) {
      var d = byKey[key];
    return { source: d.source, id: d.id, name: d.name, price: d.price, initial: d.initial, cut: d.cut, url: d.url, end: d.end, zh: d.zh, lowest: d.lowest, tags: d.tags, cover: d.cover || null, needsBase: d.needsBase || null, currency: d.currency || 'CNY' };
    }
    var hit = (SEARCH || []).find(function (r) { return r.s + ':' + r.i === key; });
    if (!hit) return null;
    return { source: hit.s, id: hit.i, name: hit.n, price: hit.p, initial: hit.o, cut: hit.c, url: hit.u, end: hit.e, zh: hit.zh, lowest: hit.lo, tags: hit.tg, cover: hit.cv || null, currency: hit.cur || 'CNY' };
  }

  function setCover(rec) {
    var cover = document.querySelector('.m-cover');
    if (!cover) return;
    var plat = String(rec.source).indexOf('steam') === 0 ? 'steam' : rec.source;
    cover.setAttribute('data-plat', plat);
    cover.style.backgroundImage = '';
    var url = rec.cover || (plat === 'steam' && /^[0-9]+$/.test(String(rec.id))
      ? 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + rec.id + '/header.jpg' : null);
    if (!url) return;
    var proxy = (plat === 'gog' && url) ? 'https://images.weserv.nl/?url=' + encodeURIComponent(url) + '&w=460&h=215&fit=cover&output=jpg&q=80' : null;
    var probe = new Image();
    probe.onload = function () { cover.style.backgroundImage = 'url("' + url + '")'; };
    probe.onerror = function () {
      if (!proxy) { cover.style.backgroundImage = ''; return; }
      var p2 = new Image();
      p2.onload = function () { cover.style.backgroundImage = 'url("' + proxy + '")'; };
      p2.onerror = function () { cover.style.backgroundImage = ''; };
      p2.src = proxy;
    };
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
      ['现价', d.price === 0 ? '免费' : fmtMoney(d.price, d.currency), ''],
      ['原价', d.initial ? fmtMoney(d.initial, d.currency) : '—', (d.initial && d.price !== null && d.initial > d.price) ? 'strike' : ''],
      ['折扣', d.cut > 0 ? '-' + d.cut + '%' : '—', ''],
      ['平台', PLAT[plat] || d.source, '']
    ];
    var hasCut = d.cut > 0 && d.initial && d.initial > d.price;
    var lowMatters = d.lowest !== null && d.lowest !== undefined && (hasCut || d.lowest < d.price);
    if (lowMatters) infoCards.push(['史低', fmtMoney(d.lowest, d.currency), '']);
    var info = document.getElementById('mCards');
    info.className = 'cards4' + (infoCards.length === 3 ? ' n3' : '');
    info.innerHTML = infoCards.map(function (c) {
      return '<div class="info-card"><div class="lb">' + c[0] + '</div><div class="vl ' + c[2] + '">' + c[1] + '</div></div>';
    }).join('');
    var meta = [];
    meta.push(endMs ? ('截止 ' + fmtEnd(endMs)) : '截止未公布');
    if (endMs) meta.push('<span id="mRemain">' + fmtLeft(endMs - Date.now()) + '</span>');
    if (d.needsBase) meta.push('<span class="warn-tag">需本体</span>');
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
      if (e.target && e.target.closest && (e.target.closest('.cover-go') || e.target.closest('.card-shop'))) return;
      heroOpen(c, c.getAttribute('data-key'));
    });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter') openModal(c.getAttribute('data-key')); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') heroClose(); });
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) heroClose(); });
  var mx = document.getElementById('mClose');
  if (mx) mx.addEventListener('click', heroClose);

  coverFallback();
  /* 禁用态解释：button:disabled 不派发 click，用父容器捕获（pillsRowCapture） */
  (function () {
    var row = document.querySelector('.pills');
    if (!row) return;
    row.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.pill') : null;
      if (t && t.disabled) showToast('仅显示限免模式下不支持排序，请先关闭该开关');
    });
  })();
  apply();
  tick();
  moveIndicator(document.querySelector('.tab[aria-selected="true"]'));
  window.addEventListener('resize', function () { moveIndicator(document.querySelector('.tab[aria-selected="true"]')); });
})();
