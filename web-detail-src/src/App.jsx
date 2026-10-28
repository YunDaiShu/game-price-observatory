import React, { useEffect, useMemo, useRef, useState } from 'react';

const PLAT = { steam: 'Steam', epic: 'Epic', gog: 'GOG', appstore: 'App Store', switch: 'Switch 日服' };
const INITIAL = { steam: 'S', epic: 'E', gog: 'G', appstore: 'A', switch: 'N' };
const GRAD = {
  steam: 'linear-gradient(135deg,#1b2838,#0b1219)', epic: 'linear-gradient(135deg,#2b2b2b,#0a0a0a)',
  gog: 'linear-gradient(135deg,#4a1030,#2a0a1a)', appstore: 'linear-gradient(135deg,#4dabf7,#5f3dc4)',
  switch: 'linear-gradient(135deg,#E60012,#8f0009)', none: 'linear-gradient(135deg,#667eea,#764ba2)'
};
const CTA = { steam: '#171A21', epic: '#000000', gog: '#8A4FFF', appstore: '#007AFF', switch: '#E60012', none: '#4E5969' };
const YEN = '\u00A5';
const platOf = (s) => (String(s).indexOf('steam') === 0 ? 'steam' : s);
const curOf = (c) => (c === 'USD' ? '$' : c === 'JPY' ? '\uFFE5' : YEN);
const money = (v, c) => (v === null || v === undefined ? '—'
  : v === 0 ? '免费'
    : c === 'JPY' ? curOf(c) + Number(v).toLocaleString('en-US') + '\u5186'
      : curOf(c) + (c === 'CNY' ? v : Number(v).toLocaleString('en-US')));
const fmtDay = (s) => { const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); return m ? (m[1] + '年' + Number(m[2]) + '月' + Number(m[3]) + '日') : String(s); };

function useData() {
  const [s, setS] = useState({ loading: true, items: [], index: [], series: {}, key: null, at: null });
  useEffect(() => {
    const key = new URLSearchParams(location.search).get('key');
    Promise.all([
      fetch('../latest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('../search-index.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]).then(([latest, idx]) => setS({
      loading: false, items: (latest && latest.items) || [], index: Array.isArray(idx) ? idx : [],
      series: (latest && latest.series) || {}, at: latest && latest.generated_at_bj, key
    }));
  }, []);
  return s;
}

function resolve(st) {
  const k = st.key || (st.items[0] ? st.items[0].source + ':' + st.items[0].id : null);
  if (!k) return null;
  const p = k.split(':');
  const full = st.items.find((i) => i.source === p[0] && String(i.id) === p[1]);
  if (full) return { rec: full, partial: false };
  const slim = st.index.find((r) => r.s === p[0] && String(r.i) === p[1]);
  if (!slim) return null;
  return { partial: true, rec: {
    source: slim.s, id: slim.i, name: slim.n, price: slim.p, initial: slim.o, cut: slim.c, url: slim.u,
    promo_end: slim.e, players_online: slim.pl, lowest_price: slim.lo, cover: slim.cv, currency: slim.cur || 'CNY',
    tags: slim.tg || [], supports_zh: slim.zh, developer: slim.dv, publishers: slim.pb, release_date: slim.rd, metacritic: slim.mc
  } };
}

function coverSrc(rec) {
  if (!rec.cover) return null;
  if (platOf(rec.source) === 'gog') return 'https://images.weserv.nl/?url=' + encodeURIComponent(rec.cover) + '&w=460&h=215&fit=cover&output=jpg&q=80';
  return rec.cover;
}

function Cover({ rec, className }) {
  const plat = platOf(rec.source);
  const [failed, setFailed] = useState(false);
  const src = coverSrc(rec);
  return (
    <div className={'relative overflow-hidden rounded-xl ' + (className || '')} style={{ background: GRAD[plat] || GRAD.none }}>
      {src && !failed
        ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
        : <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-3xl font-bold text-white/85">{INITIAL[plat] || '?'}</div>}
    </div>
  );
}

function TopNav({ name, onSearch }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <a href="../" className="flex items-center gap-1 text-sm text-[#6B7280] transition hover:text-[#F59E0B]">← 返回</a>
        <div className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-[#111827]">{name || '加载中…'}</div>
        <button onClick={onSearch} className="text-[#9CA3AF] hover:text-[#111827]" aria-label="搜索">⌕</button>
      </div>
    </header>
  );
}

function Countdown({ end }) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!end) { setLeft(null); return; }
    const tick = () => setLeft(Date.parse(end) - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [end]);
  if (left === null || Number.isNaN(left)) return null;
  if (left <= 0) return <div className="mt-2 text-[13px] font-semibold text-[#9CA3AF]">促销已结束</div>;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const urgent = left < 3600000;
  return (
    <div className={'mt-2 text-[13px] font-semibold ' + (urgent ? 'text-[#EF4444]' : 'text-[#F59E0B]')}>
      {urgent ? '即将截止 · ' : '距离截止约还有 '}{d}天 {h}小时 {m}分钟 {sec}秒
    </div>
  );
}

function Hero({ rec }) {
  const plat = platOf(rec.source);
  const discounted = rec.cut > 0 && rec.initial && rec.initial > rec.price;
  const lowMatters = rec.lowest_price !== null && rec.lowest_price !== undefined && (discounted || rec.lowest_price < rec.price);
  return (
    <section className="mx-auto max-w-5xl px-4 pt-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,380px)_1fr]">
        <Cover rec={rec} className="aspect-video w-full self-start" />
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#111827]">{rec.name}</h1>
            <span className="rounded bg-[#F3F4F6] px-2 py-0.5 text-[11px] text-[#6B7280]">{PLAT[plat] || rec.source}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(rec.tags || []).slice(0, 6).map((t) => (
              <span key={t} className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px] text-[#6B7280]">{t}</span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="text-[34px] font-bold leading-none" style={{ color: rec.price === 0 ? '#10B981' : (discounted ? '#F59E0B' : '#111827') }}>
              {money(rec.price, rec.currency)}
            </span>
            {discounted && <span className="rounded bg-[#F59E0B] px-1.5 py-0.5 text-[12px] font-medium text-white">-{Math.abs(rec.cut)}%</span>}
            {discounted && <s className="text-[13px] text-[#9CA3AF]">{money(rec.initial, rec.currency)}</s>}
            {rec.free_kind === 'limited' && <span className="rounded bg-[#10B981] px-1.5 py-0.5 text-[12px] text-white">限免</span>}
            {lowMatters && (rec.price !== null && rec.lowest_price === rec.price
              ? <span className="rounded bg-[#F59E0B] px-1.5 py-0.5 text-[12px] font-medium text-white">🏷 史低</span>
              : <span className="text-[12px] text-[#9CA3AF]">史低 {money(rec.lowest_price, rec.currency)}</span>)}
          </div>
          <Countdown end={rec.promo_end} />
          {rec.url && (
            <a href={rec.url} target="_blank" rel="noopener noreferrer"
               className="mt-3 block w-full rounded-lg py-2.5 text-center text-[15px] font-semibold text-white transition hover:opacity-85"
               style={{ background: CTA[plat] || CTA.none }}>
              打开 {PLAT[plat] || rec.source} 商店页 →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function metricsOf(series, rec) {
  const pts = (series || []).filter((p) => typeof p[1] === 'number' && p[1] >= 0);
  if (!pts.length) return { count: 0, pts: [] };
  const prices = pts.map((p) => p[1]);
  const lowest = Math.min(...prices);
  const lowestDate = (pts.find((p) => p[1] === lowest) || [])[0];
  const highest = Math.max(...prices);
  const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
  const recent = pts.filter((p) => Date.now() - Date.parse(p[0]) <= 365 * 864e5).map((p) => p[1]);
  const avgRecent = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : null;
  const base = rec.initial || null;
  const disc = base ? pts.filter((p) => p[1] < base) : [];
  const lastDisc = disc.length ? disc[disc.length - 1][0] : null;
  const daysAgo = lastDisc ? Math.round((Date.now() - Date.parse(lastDisc)) / 864e5) : null;
  return { count: pts.length, pts, lowest, lowestDate, highest, avg, avgRecent, discountCount: disc.length, daysAgo };
}

function PriceChart({ pts, rec, lowest }) {
  const boxRef = useRef(null);
  const pathRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [mouse, setMouse] = useState(null);
  const W = 1000, H = 280, padL = 56, padR = 20, padT = 18, padB = 34;
  const prices = pts.map((p) => p[1]);
  const min = lowest * 0.85;
  const max = (Math.max(...prices) || 1) * 1.1;
  const X = (i) => padL + (W - padL - padR) * (i / Math.max(1, pts.length - 1));
  const Y = (v) => padT + (H - padT - padB) * (1 - (v - min) / (max - min || 1));
  const ticks = [0, 1, 2, 3, 4].map((i) => min + ((max - min) / 4) * i).reverse();
  const months = [];
  pts.forEach((p, i) => {
    const key = String(p[0]).slice(0, 7);
    if (!months.length || months[months.length - 1].key !== key) months.push({ key, i, label: Number(key.slice(5, 7)) + '月' });
  });
  const lowIdx = pts.findIndex((p) => p[1] === lowest);
  const hiIdx = pts.reduce((bi, p, i) => (p[1] > pts[bi][1] ? i : bi), 0);
  const curIdx = pts.length - 1;
  const hover = mouse ? mouse.idx : null;
  const hp = hover !== null ? pts[hover] : null;

  useEffect(() => {
    if (!boxRef.current) return;
    const ob = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setInView(true); ob.disconnect(); } }), { threshold: 0.2 });
    ob.observe(boxRef.current);
    return () => ob.disconnect();
  }, []);

  useEffect(() => {
    const el = pathRef.current;
    if (!el || !el.getTotalLength) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = inView ? '0' : String(len);
    el.style.transition = inView ? 'stroke-dashoffset 1200ms cubic-bezier(0.25,1,0.5,1)' : 'none';
  }, [inView, pts.length]);

  const onMove = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * W;
    let best = 0, bd = Infinity;
    pts.forEach((pt, i) => { const dd = Math.abs(X(i) - x); if (dd < bd) { bd = dd; best = i; } });
    setMouse({ idx: best, px: e.clientX - b.left, boxW: b.width });
  };

  return (
    <div ref={boxRef} className="relative px-3 py-4">
      <svg viewBox={'0 0 ' + W + ' ' + H} className="h-[280px] w-full" onMouseMove={onMove} onMouseLeave={() => setMouse(null)}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(245,158,11,0.15)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0)" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={'y' + i}>
            <line x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke="#F3F4F6" strokeWidth="1" />
            <text x={padL - 8} y={Y(t) + 4} textAnchor="end" fontSize="12" fill="#9CA3AF">{YEN + Number(t).toFixed(2)}</text>
          </g>
        ))}
        {months.map((mo) => (
          <g key={'m' + mo.key}>
            <line x1={X(mo.i)} y1={padT} x2={X(mo.i)} y2={H - padB} stroke="#F3F4F6" strokeWidth="1" />
            <text x={X(mo.i)} y={H - 10} textAnchor="middle" fontSize="12" fill="#9CA3AF">{mo.label}</text>
          </g>
        ))}
        <path d={pts.map((pt, i) => (i ? 'L' : 'M') + X(i) + ',' + Y(pt[1])).join(' ') + ' L' + X(curIdx) + ',' + (H - padB) + ' L' + X(0) + ',' + (H - padB) + ' Z'} fill="url(#priceFill)" />
        <path ref={pathRef} d={pts.map((pt, i) => (i ? 'L' : 'M') + X(i) + ',' + Y(pt[1])).join(' ')} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={padL} y1={Y(lowest)} x2={W - padR} y2={Y(lowest)} stroke="#10B981" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx={X(lowIdx)} cy={Y(lowest)} r="6" fill="#10B981" stroke="#fff" strokeWidth="2" />
        <text x={X(lowIdx) + 10} y={Y(lowest) - 10} fontSize="13" fontWeight="600" fill="#10B981">{'史低 ' + YEN + Number(lowest).toFixed(2)}</text>
        {hiIdx !== curIdx && hiIdx !== lowIdx && (
          <g>
            <circle cx={X(hiIdx)} cy={Y(pts[hiIdx][1])} r="6" fill="#EF4444" stroke="#fff" strokeWidth="2" />
            <text x={X(hiIdx) + 10} y={Y(pts[hiIdx][1]) + 18} fontSize="13" fontWeight="600" fill="#EF4444">最高 {money(pts[hiIdx][1], rec.currency)}</text>
          </g>
        )}
        <circle cx={X(curIdx)} cy={Y(pts[curIdx][1])} r="6" fill="#F59E0B" stroke="#fff" strokeWidth="2" />
        {hp && <line x1={X(hover)} y1={padT} x2={X(hover)} y2={H - padB} stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3 3" />}
        {hp && <circle cx={X(hover)} cy={Y(hp[1])} r="4" fill="#fff" stroke="#F59E0B" strokeWidth="2" />}
      </svg>
      {hp && mouse && (
        <div className="pointer-events-none absolute z-10 w-[150px] rounded-lg bg-white px-4 py-3 text-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
             style={{ left: Math.min(Math.max(mouse.px - 75, 4), Math.max(4, mouse.boxW - 154)) + 'px', top: 10 }}>
          <div className="font-medium text-[#111827]">{fmtDay(hp[0])}</div>
          <div className="mt-1 text-[#6B7280]">当日价格 <span className="font-semibold text-[#111827]">{money(hp[1], rec.currency)}</span></div>
          {rec.initial && hp[1] < rec.initial && <div className="text-[#10B981]">折扣 -{Math.round((1 - hp[1] / rec.initial) * 100)}%</div>}
        </div>
      )}
      <div className="mt-2 text-center text-[12px] text-[#9CA3AF]">共 {pts.length} 条价格记录 · 悬停查看每日价格</div>
    </div>
  );
}

function MetricBlock({ label, value, hint, color }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[13px] text-[#6B7280]">{label}</div>
      <div className="mt-1 text-[24px] font-bold leading-tight" style={{ color: color || '#111827' }}>{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-[#9CA3AF]">{hint}</div>}
    </div>
  );
}

function AlertBar() {
  const [v, setV] = useState('');
  const [ok, setOk] = useState(false);
  const submit = () => {
    if (!v) return;
    try { localStorage.setItem('gpr.alert', v); } catch (e) {}
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  };
  return (
    <div className="border-t border-[#E5E7EB] px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-[#6B7280]">当价格低于</span>
        <span className="flex h-9 items-center rounded-lg border border-[#D1D5DB] bg-white px-3 focus-within:border-[#F59E0B] focus-within:ring-4 focus-within:ring-[#F59E0B]/20">
          <span className="mr-1 text-[14px] text-[#9CA3AF]">{YEN}</span>
          <input value={v} onChange={(e) => setV(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="输入期望价格"
                 className="h-full w-[88px] text-[15px] font-semibold text-[#111827] outline-none placeholder:font-normal placeholder:text-[#9CA3AF]" />
        </span>
        <button onClick={submit}
                className={'h-9 w-20 rounded-lg text-[14px] font-semibold text-white transition ' + (ok ? 'bg-[#10B981]' : 'bg-[#F59E0B] hover:bg-[#D97706]')}>
          {ok ? '✓ 已设置' : '提醒我'}
        </button>
      </div>
      <p className="mt-2 text-[12px] text-[#9CA3AF]">价格到达设定值时，我们将通过网站通知提醒你</p>
    </div>
  );
}

function PriceDynamics({ rec, series }) {
  const m = metricsOf(series, rec);
  const cur = rec.price;
  const curColor = cur === 0 ? '#10B981' : (rec.cut > 0 ? '#F59E0B' : '#111827');
  const hasChart = m.count >= 2;
  const progress = Math.min(100, Math.round((m.count / 5) * 100));
  const estDays = Math.max(0, 5 - m.count);
  const subcopy = cur === 0
    ? '当前免费领取中' + (rec.initial ? '（原价 ' + money(rec.initial, rec.currency) + '），相当于省下 ' + money(rec.initial, rec.currency) : '')
    : (rec.cut > 0 ? '当前折扣力度 -' + Math.abs(rec.cut) + '%，是入手好时机'
      : '当前无折扣，建议设置降价提醒，低价时第一时间通知你');
  return (
    <section className="mx-auto max-w-5xl px-4 pt-5">
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="px-5 pt-4"><h2 className="text-[15px] font-semibold text-[#111827]">价格动态</h2></div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-[#E5E7EB]">
          <MetricBlock label="当前价格" value={money(cur, rec.currency)} color={curColor} />
          <MetricBlock label="历史最低" value={m.count ? money(m.lowest, rec.currency) : '暂无'}
                       hint={m.count ? String(m.lowestDate).replace(/-/g, '.') : ''} />
          <MetricBlock label="平均价格" value={m.count ? money(Math.round(m.avg * 100) / 100, rec.currency) : '—'}
                       hint={m.avgRecent !== null ? '近一年均价 ' + money(Math.round(m.avgRecent * 100) / 100, rec.currency) : ''} />
          <MetricBlock label="打折次数" value={m.count ? m.discountCount + ' 次' : '0 次'}
                       hint={m.daysAgo !== null ? '最近一次 ' + m.daysAgo + ' 天前' : ''} />
        </div>
        <div className="border-t border-[#E5E7EB]">
          {hasChart ? <PriceChart pts={m.pts} rec={rec} lowest={m.lowest} /> : (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <svg viewBox="0 0 120 120" className="clock-breathe h-[120px] w-[120px]" fill="none" stroke="#D1D5DB" strokeWidth="2">
                <path d="M12 88l22-20 18 12 24-30 20 14" strokeLinecap="round" strokeDasharray="6 6" />
                <circle cx="60" cy="46" r="20" /><path d="M60 34v12l8 6" strokeLinecap="round" />
              </svg>
              <p className="text-[16px] font-medium text-[#374151]">价格数据正在收集中</p>
              <p className="text-[14px] text-[#9CA3AF]">{subcopy}</p>
              <div className="h-1.5 w-[240px] overflow-hidden rounded-full bg-[#E5E7EB]">
                <div className="h-full rounded-full" style={{ width: progress + '%', background: 'linear-gradient(90deg,#F59E0B,#FBBF24)' }} />
              </div>
              <p className="text-[12px] text-[#9CA3AF]">已有 {m.count} 条记录，预计 {estDays} 天后生成完整价格曲线</p>
              <div className="mt-1 flex gap-3">
                <button className="rounded-lg bg-[#F59E0B] px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-[#D97706]">设置降价提醒</button>
                <a href="../" className="rounded-lg border border-[#D1D5DB] bg-white px-6 py-2.5 text-[14px] text-[#6B7280] hover:bg-[#F9FAFB]">返回上一页</a>
              </div>
            </div>
          )}
        </div>
        <AlertBar />
      </div>
    </section>
  );
}

function Similar({ rec, items }) {
  const list = useMemo(() => {
    const tags = new Set(rec.tags || []);
    return items
      .filter((i) => !(i.source === rec.source && String(i.id) === String(rec.id)))
      .filter((i) => (i.tags || []).some((t) => tags.has(t)) || i.source === rec.source)
      .sort((a, b) => (b.cut || 0) - (a.cut || 0))
      .slice(0, 10);
  }, [rec, items]);
  if (!list.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-5">
      <h2 className="text-[15px] font-semibold text-[#111827]">相似游戏</h2>
      <div className="relative">
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-[100px] w-12 bg-gradient-to-l from-[#F5F7FA] to-transparent" />
        <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
          {list.map((s) => (
            <a key={s.source + ':' + s.id} href={'?key=' + encodeURIComponent(s.source + ':' + s.id)}
               className="w-[180px] shrink-0 self-start overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
              <Cover rec={s} className="aspect-video w-full" />
              <div className="p-2">
                <div className="truncate text-[12.5px] font-medium text-[#111827]">{s.name}</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[13px] font-semibold text-[#111827]">{money(s.price, s.currency)}</span>
                  {s.cut > 0 && <span className="rounded bg-[#F59E0B] px-1 text-[10px] text-white">-{Math.abs(s.cut)}%</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SearchOverlay({ open, onClose, index, onPick }) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => {
    const pool = index || [];
    if (!q) return pool.slice(0, 20);
    return pool.filter((r) => String(r.n).toLowerCase().includes(q.toLowerCase())).slice(0, 20);
  }, [q, index]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] p-3">
          <span className="text-[#9CA3AF]">⌕</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索全部数据源"
                 className="w-full text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]" />
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111827]">关闭</button>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {hits.map((c) => (
            <button key={c.s + c.i} onClick={() => onPick(c.s + ':' + c.i)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#111827] hover:bg-[#F9FAFB]">
              <span className="flex-1 truncate">{c.n}</span>
              <span className="rounded bg-[#F3F4F6] px-1.5 text-[10px] text-[#6B7280]">{c.s}</span>
              <span className="text-[12px] text-[#6B7280]">{money(c.p, c.cur)}</span>
            </button>
          ))}
          {!hits.length && <div className="p-6 text-center text-[13px] text-[#9CA3AF]">没有匹配结果</div>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const st = useData();
  const [searchOpen, setSearchOpen] = useState(false);
  const r = useMemo(() => resolve(st), [st]);
  const titleName = r && r.rec ? r.rec.name : '';

  useEffect(() => {
    document.title = titleName ? titleName + ' · 游戏价格观测站' : '游戏价格观测站 · 详情';
  }, [titleName]);

  if (st.loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <TopNav name="加载中…" onSearch={() => {}} />
        <div className="mx-auto max-w-5xl px-4 pt-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,380px)_1fr]">
            <div className="aspect-video animate-pulse rounded-xl bg-white" />
            <div className="space-y-2">
              <div className="h-6 w-2/3 animate-pulse rounded bg-white" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white" />
              <div className="h-10 w-1/3 animate-pulse rounded bg-white" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!r) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] p-10 text-center text-sm text-[#9CA3AF]">
        没找到条目（key={st.key || '空'}）<br /><a className="mt-3 inline-block text-[#165DFF]" href="../">返回列表 ›</a>
      </div>
    );
  }

  const rec = r.rec;
  const series = st.series[rec.source + ':' + rec.id] || [];

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-10">
      <TopNav name={rec.name} onSearch={() => setSearchOpen(true)} />
      <Hero rec={rec} />
      <PriceDynamics rec={rec} series={series} />
      <Similar rec={rec} items={st.items} />
      <footer className="mx-auto mt-6 max-w-5xl px-4 text-center text-[11px] text-[#9CA3AF]">
        数据来源公开接口 · 暂不支持玩家评论
      </footer>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} index={st.index}
                     onPick={(k) => { location.href = '?key=' + encodeURIComponent(k); }} />
    </div>
  );
}
