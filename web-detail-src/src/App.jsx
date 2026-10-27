import React, { useEffect, useMemo, useState } from 'react';

const money = (v, cur) => (v === null || v === undefined ? null : v === 0 ? '免费' : (cur === 'USD' ? '$' : '¥') + v);
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

function useCountdown(iso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!iso) return null;
  const left = Date.parse(iso) - now;
  if (Number.isNaN(left)) return null;
  if (left <= 0) return '已结束';
  const s = Math.floor(left / 1000), pad = (n) => (n < 10 ? '0' + n : '' + n);
  const d = Math.floor(s / 86400);
  const hms = pad(Math.floor((s % 86400) / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
  return d > 0 ? '剩余 ' + d + '天 ' + hms : '剩余 ' + hms;
}

function useData() {
  const [state, setState] = useState({ loading: true, items: [], index: [], series: {}, error: null, key: null });
  useEffect(() => {
    const key = new URLSearchParams(location.search).get('key');
    Promise.all([
      fetch('../latest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('../search-index.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]).then(([latest, idx]) => {
      const items = (latest && latest.items) || [];
      setState({
        loading: false,
        items,
        index: Array.isArray(idx) ? idx : [],
        series: (latest && latest.series) || {},
        error: latest ? null : '没能读取 ../latest.json',
        key,
        generatedAt: latest && latest.generated_at_bj
      });
    });
  }, []);
  return state;
}

function resolveItem(state) {
  const { items, index, key } = state;
  const k = key || (items[0] && items[0].source + ':' + items[0].id);
  if (!k) return null;
  const [src, id] = k.split(':');
  const full = items.find((i) => i.source === src && String(i.id) === id);
  if (full) return { rec: full, partial: false, key: k };
  const slim = index.find((r) => r.s === src && String(r.i) === id);
  if (slim) return { rec: { source: slim.s, id: slim.i, name: slim.n, price: slim.p, initial: slim.o, cut: slim.c, url: slim.u, promo_end: slim.e, players_online: slim.pl, lowest_price: slim.lo, free_kind: slim.fk, tags: slim.tg || [], supports_zh: slim.zh, developer: slim.dv, publishers: slim.pb, release_date: slim.rd, metacritic: slim.mc, short_desc: slim.sd }, partial: true, key: k };
  return null;
}

function Icon({ d, className = 'w-5 h-5' }) {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d={d} strokeLinecap="round" strokeLinejoin="round" /></svg>);
}

function TopNav({ name, onSearch }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2a475e] bg-[#171a21]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <a href="../" className="flex items-center gap-2 text-[#c7d5e0] hover:text-white"><Icon d="M15 19l-7-7 7-7" className="h-4 w-4" /><span className="text-sm">返回</span></a>
        <div className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white">{name || '加载中…'}</div>
        <div className="flex items-center gap-3 text-[#8f98a0]">
          <button onClick={onSearch} className="hover:text-white" aria-label="搜索"><Icon d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" /></button>
          <a href="../" className="hover:text-white" aria-label="站点"><Icon d="M4 12h16M12 4v16" /></a>
        </div>
      </div>
    </header>
  );
}

function Notice({ children, tone = 'warn' }) {
  const cls = tone === 'warn' ? 'border-[#4a3a22] bg-[#2a2118] text-[#d8c9a8]' : 'border-[#2f6b46] bg-[#14251c] text-[#8fd7a8]';
  return <div className={'mx-auto max-w-6xl px-4 pt-3'}><div className={'rounded border px-3 py-2 text-[11.5px] ' + cls}>{children}</div></div>;
}

function Hero({ rec, series }) {
  const left = useCountdown(rec.promo_end);
  const pts = (series || []).slice(-8).reverse();
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <div className="rounded-lg border border-[#2a475e] bg-gradient-to-br from-[#1b2838] to-[#12202c] p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="text-5xl font-bold text-white">{money(rec.price, rec.currency) ?? '—'}</div>
          {rec.initial > rec.price && <s className="pb-1 text-sm text-[#738895]">{money(rec.initial, rec.currency)}</s>}
          {rec.cut > 0 && <span className="mb-1 rounded bg-[#4c6b22] px-2 py-0.5 text-sm font-bold text-[#a4d007]">-{rec.cut}%</span>}
          {rec.lowest_price !== null && rec.price !== null && rec.price <= rec.lowest_price && (
            <span className="mb-1 rounded bg-[#1d3b28] px-2 py-0.5 text-xs font-semibold text-[#5ee08a] ring-1 ring-[#2f6b46]">史低 {money(rec.lowest_price, rec.currency)}</span>
          )}
          {rec.free_kind === 'limited' && <span className="mb-1 rounded bg-[#12351f] px-2 py-0.5 text-xs text-[#5ee08a]">限时免费</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-[#8f98a0]">
          <span className="rounded bg-[#2a475e] px-2 py-0.5 text-[#c7d5e0]">{rec.source}</span>
          {left && <span className="text-[#f5c451]">促销{left}</span>}
          {rec.promo_end && <span>截止 {new Date(rec.promo_end).toLocaleString('zh-CN', { hour12: false })}</span>}
          {typeof rec.players_online === 'number' && <span>在线 {rec.players_online.toLocaleString('en-US')}</span>}
          {rec.url && <a className="text-[#66c0f4] hover:underline" href={rec.url} target="_blank" rel="noopener">打开商店页 ›</a>}
        </div>
        {pts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#5b6b78]">
            <span>价格快照：</span>
            {pts.map((p) => <span key={p[0]} className="rounded bg-[#1b2838] px-1.5 py-0.5">{p[0]} {money(p[1], rec.currency)}</span>)}
          </div>
        )}
      </div>
    </section>
  );
}

function BasicInfo({ rec }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <h1 className="text-2xl font-bold text-white">{rec.name || '—'}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-[#2a475e] px-2 py-0.5 text-[#c7d5e0]">{rec.source}</span>
        {rec.supports_zh === true && <span className="rounded bg-[#13351f] px-2 py-0.5 text-[#5ee08a]">中文</span>}
        {rec.supports_zh === false && <span className="rounded bg-[#2a475e] px-2 py-0.5 text-[#8f98a0]">无中文</span>}
        {typeof rec.players_online === 'number' && <span className="rounded bg-[#2a475e] px-2 py-0.5 text-[#c7d5e0]">在线 {rec.players_online.toLocaleString('en-US')}</span>}
        {rec.is_new_low === true && <span className="rounded bg-[#3a2e1d] px-2 py-0.5 text-[#f0ce9a]">新史低</span>}
      </div>
      {(rec.tags || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {rec.tags.map((t) => <span key={t} className="rounded bg-[#2a475e] px-2.5 py-1 text-xs text-[#c7d5e0]">{t}</span>)}
        </div>
      )}
    </section>
  );
}

function Stats({ rec, series }) {
  const cells = [
    ['现价', money(rec.price, rec.currency)],
    ['原价', money(rec.initial, rec.currency)],
    ['折扣', rec.cut > 0 ? '-' + rec.cut + '%' : '—'],
    ['史低', money(rec.lowest_price, rec.currency)],
    ['当前在线', typeof rec.players_online === 'number' ? rec.players_online.toLocaleString('en-US') : '—'],
    ['价格快照', (series || []).length ? (series || []).length + ' 个' : '0 个'],
    ['媒体评分', dash(rec.metacritic)],
    ['支持中文', rec.supports_zh === true ? '是' : rec.supports_zh === false ? '否' : '—']
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pt-5">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cells.map(([k, v]) => (
          <div key={k} className="rounded border border-[#2a475e] bg-[#1b2838] px-3 py-3 transition hover:-translate-y-0.5 hover:border-[#66c0f4] hover:shadow-lg hover:shadow-black/40">
            <div className="text-lg font-semibold text-white">{v === null || v === undefined ? '—' : v}</div>
            <div className="mt-0.5 text-[11px] text-[#8f98a0]">{k}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-[#5b6b78]">数据来自各平台公开接口 · 「—」表示该来源没有此字段</p>
    </section>
  );
}

function Overview({ rec }) {
  const [open, setOpen] = useState(false);
  const has = !!rec.short_desc;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">游戏简介</h2>
        {has && <button onClick={() => setOpen((v) => !v)} className="text-xs text-[#66c0f4] hover:underline">{open ? '收起 ' : '全部 >'}</button>}
      </div>
      <p className={'mt-2 text-[13px] leading-7 text-[#acb7c2] ' + (open ? '' : 'line-clamp-3')}>{has ? rec.short_desc : '该来源未提供简介字段（—）。'}</p>
      <dl className="mt-3 grid grid-cols-1 gap-1 text-[12.5px] text-[#8f98a0] md:grid-cols-2">
        <div className="flex gap-2"><dt>发行日期：</dt><dd className="text-[#c7d5e0]">{dash(rec.release_date)}</dd></div>
        <div className="flex gap-2"><dt>开发商：</dt><dd className="text-[#c7d5e0]">{dash(rec.developer)}</dd></div>
        <div className="flex gap-2"><dt>发行商：</dt><dd className="text-[#c7d5e0]">{dash(rec.publishers)}</dd></div>
        <div className="flex gap-2"><dt>媒体评分：</dt><dd className="text-[#c7d5e0]">{rec.metacritic !== null && rec.metacritic !== undefined ? <span className="rounded bg-[#4c6b22] px-1.5 text-[#a4d007]">{rec.metacritic}</span> : '—'}</dd></div>
      </dl>
    </section>
  );
}

function PriceChart({ series }) {
  const pts = (series || []).filter((p) => typeof p[1] === 'number' && p[1] > 0);
  const W = 620, H = 170, padL = 42, padR = 14, padT = 14, padB = 26;
  if (pts.length < 2) {
    return <div className="rounded border border-[#2a475e] bg-[#1b2838] p-4 text-[12px] text-[#5b6b78]">价格历史积累中：当前 {pts.length} 个快照，满 2 天后自动生成曲线。</div>;
  }
  const ys = pts.map((p) => p[1]);
  const min = Math.min(...ys), max = Math.max(...ys);
  const x = (i) => padL + (W - padL - padR) * (i / (pts.length - 1));
  const y = (v) => padT + (H - padT - padB) * (1 - (v - min) / (max - min || 1));
  return (
    <div className="rounded border border-[#2a475e] bg-[#1b2838] p-2">
      <svg viewBox={'0 0 ' + W + ' ' + H} className="h-44 w-full">
        {[0, 0.5, 1].map((t) => <line key={t} x1={padL} y1={padT + (H - padT - padB) * t} x2={W - padR} y2={padT + (H - padT - padB) * t} stroke="#2a475e" />)}
        <polyline points={pts.map((p, i) => x(i) + ',' + y(p[1])).join(' ')} fill="none" stroke="#66c0f4" strokeWidth="2" />
        {pts.map((p, i) => <circle key={p[0]} cx={x(i)} cy={y(p[1])} r="2.5" fill="#66c0f4" />)}
        <text x="4" y={padT + 8} fill="#5b6b78" fontSize="10">{max}</text>
        <text x="4" y={H - padB} fill="#5b6b78" fontSize="10">{min}</text>
        <text x={padL} y={H - 6} fill="#5b6b78" fontSize="10">{pts[0][0]}</text>
        <text x={W - padR} y={H - 6} fill="#5b6b78" fontSize="10" textAnchor="end">{pts[pts.length - 1][0]}</text>
      </svg>
    </div>
  );
}

function HistorySection({ rec, series }) {
  const rows = (series || []).slice().reverse();
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <h2 className="text-base font-semibold text-white">价格历史 <span className="ml-2 text-[11px] font-normal text-[#5b6b78]">来自每日快照（真实数据）</span></h2>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_320px]">
        <PriceChart series={series} />
        <div className="overflow-hidden rounded border border-[#2a475e] bg-[#1b2838]">
          <table className="w-full text-[12px]">
            <thead><tr className="text-[#8f98a0]"><th className="px-3 py-2 text-left font-normal">日期</th><th className="px-3 py-2 text-left font-normal">价格</th><th className="px-3 py-2 text-left font-normal">在线</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((r) => (
                <tr key={r[0]} className="border-t border-[#223447]">
                  <td className="px-3 py-1.5 text-[#c7d5e0]">{r[0]}</td>
                  <td className="px-3 py-1.5">{money(r[1], rec.currency)}</td>
                  <td className="px-3 py-1.5 text-[#8f98a0]">{r[2] === null || r[2] === undefined ? '—' : r[2].toLocaleString('en-US')}</td>
                </tr>
              )) : <tr><td colSpan="3" className="px-3 py-6 text-center text-[#5b6b78]">暂无快照</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Similar({ rec, items }) {
  const list = useMemo(() => {
    if (!rec) return [];
    const tags = new Set(rec.tags || []);
    return items
      .filter((i) => !(i.source === rec.source && String(i.id) === String(rec.id)))
      .filter((i) => (i.tags || []).some((t) => tags.has(t)) || i.source === rec.source)
      .sort((a, b) => (b.cut || 0) - (a.cut || 0))
      .slice(0, 10);
  }, [rec, items]);
  if (!list.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <h2 className="text-base font-semibold text-white">相似游戏 <span className="ml-2 text-[11px] font-normal text-[#5b6b78]">按真实标签/同来源匹配</span></h2>
      <div className="hide-scroll mt-3 flex gap-3 overflow-x-auto pb-2">
        {list.map((s) => (
          <a key={s.source + ':' + s.id} href={'?key=' + encodeURIComponent(s.source + ':' + s.id)}
             className="w-44 shrink-0 overflow-hidden rounded border border-[#2a475e] bg-[#1b2838] transition hover:-translate-y-1 hover:border-[#66c0f4] hover:shadow-xl hover:shadow-black/50">
            <div className="flex h-20 items-center justify-center bg-gradient-to-br from-[#20303f] to-[#141d26] text-lg font-bold text-[#3f5566]">{String(s.name).slice(0, 1)}</div>
            <div className="p-2">
              <div className="truncate text-[12.5px] text-[#c7d5e0]">{s.name}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[12.5px] font-semibold text-white">{money(s.price, s.currency)}</span>
                {s.initial > s.price && <s className="text-[10px] text-[#738895]">{money(s.initial, s.currency)}</s>}
                {s.cut > 0 && <span className="rounded bg-[#4c6b22] px-1 text-[10px] text-[#a4d007]">-{s.cut}%</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function SearchOverlay({ open, onClose, index }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const hits = useMemo(() => {
    const pool = index || [];
    if (!q) return pool.slice(0, 40);
    return pool.filter((r) => String(r.n).toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  }, [q, index]);
  if (!open) return null;
  const cur = sel || hits[0];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 md:p-10" onClick={onClose}>
      <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-[#2a475e] bg-[#16202d]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[#2a475e] p-3">
          <Icon d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" className="h-4 w-4 text-[#8f98a0]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索全部数据源（索引来自 search-index.json）" className="w-full bg-transparent text-sm text-[#c7d5e0] outline-none placeholder:text-[#5b6b78]" />
          <button onClick={onClose} className="text-[#8f98a0] hover:text-white">关闭 ×</button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-1 md:grid-cols-[320px_1fr]">
          <div className="hide-scroll max-h-[70vh] overflow-auto border-b border-[#2a475e] md:border-b-0 md:border-r">
            <div className="px-3 py-2 text-[11px] text-[#5b6b78]">索引 {index.length} 条 · 命中 {hits.length}</div>
            {hits.map((c) => (
              <button key={c.s + c.i} onClick={() => setSel(c)} className={'flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] ' + (cur && cur.i === c.i ? 'bg-[#2a475e] text-white' : 'text-[#c7d5e0] hover:bg-[#223447]')}>
                <span className="flex-1 truncate">{c.n}</span>
                <span className="shrink-0 rounded bg-[#1b2838] px-1.5 text-[10px] text-[#8f98a0]">{c.s}</span>
                <span className="shrink-0 text-[11px] text-[#8f98a0]">{money(c.p) ?? '—'}</span>
              </button>
            ))}
            {!hits.length && <div className="px-3 py-6 text-center text-[12px] text-[#5b6b78]">没有匹配结果</div>}
          </div>
          <div className="max-h-[70vh] overflow-auto p-4">
            {cur ? (
              <>
                <div className="flex items-baseline gap-2"><h3 className="text-lg font-semibold text-white">{cur.n}</h3><span className="rounded bg-[#2a475e] px-1.5 text-[10px] text-[#8f98a0]">{cur.s}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[['当前价', money(cur.p)], ['原价', money(cur.o)], ['折扣', cur.c > 0 ? '-' + cur.c + '%' : '—'], ['史低', money(cur.lo)]].map(([k, v]) => (
                    <div key={k} className="rounded border border-[#2a475e] bg-[#1b2838] px-3 py-2"><div className="text-base font-semibold text-white">{v === null || v === undefined ? '—' : v}</div><div className="text-[10.5px] text-[#8f98a0]">{k}</div></div>
                  ))}
                </div>
                <table className="mt-3 w-full text-[12px]"><tbody>
                  {[['开发商', dash(cur.dv)], ['发行商', dash(cur.pb)], ['发行日期', dash(cur.rd)], ['媒体评分', dash(cur.mc)], ['在线人数', cur.pl ? cur.pl.toLocaleString('en-US') : '—'], ['标签', (cur.tg || []).join('、') || '—']].map(([k, v]) => (
                    <tr key={k} className="border-b border-[#223447]"><th className="w-28 py-1.5 text-left font-normal text-[#8f98a0]">{k}</th><td className="py-1.5 text-[#c7d5e0]">{v}</td></tr>
                  ))}
                </tbody></table>
                <a className="mt-3 inline-block text-[12.5px] text-[#66c0f4] hover:underline" href={'?key=' + encodeURIComponent(cur.s + ':' + cur.i)}>在详情页打开 ›</a>
              </>
            ) : <div className="text-[12px] text-[#5b6b78]">无结果</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const state = useData();
  const [searchOpen, setSearchOpen] = useState(false);
  const resolved = useMemo(() => resolveItem(state), [state]);
  const rec = resolved && resolved.rec;
  const series = rec ? state.series[rec.source + ':' + rec.id] || [] : [];

  if (state.loading) return <div className="p-10 text-center text-sm text-[#8f98a0]">加载中…</div>;
  if (!rec) return (
    <div className="p-10 text-center text-sm text-[#8f98a0]">
      没找到条目（key={state.key || '空'}）<br /><a className="mt-3 inline-block text-[#66c0f4]" href="../">返回列表 ›</a>
    </div>
  );

  return (
    <div className="min-h-screen pb-16">
      <TopNav name={rec.name} onSearch={() => setSearchOpen(true)} />
      {resolved.partial && <Notice>该条目只在搜索索引中（今日未在榜），部分字段可能缺失。</Notice>}
      {state.error && <Notice>{state.error}</Notice>}
      <Notice tone="ok">真实数据 · 抓取时间 {state.generatedAt || '—'}（北京） · 来源 {rec.source} · 索引 {state.index.length} 条</Notice>
      <Hero rec={rec} series={series} />
      <BasicInfo rec={rec} />
      <Stats rec={rec} series={series} />
      <Overview rec={rec} />
      <HistorySection rec={rec} series={series} />
      <Similar rec={rec} items={state.items} />
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <h2 className="text-base font-semibold text-white">玩家评价</h2>
        <div className="mt-2 rounded border border-[#2a475e] bg-[#1b2838] p-4 text-[12.5px] text-[#8f98a0]">
          该字段**无可用的公开接口**（各平台均不提供评论 API），因此本页不再展示示例评论。价格与在线数据均为真实抓取结果。
        </div>
      </section>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} index={state.index} />
    </div>
  );
}
