import React, { useEffect, useMemo, useState } from 'react';

const PLAT = { steam: 'Steam', epic: 'Epic', gog: 'GOG', appstore: 'App Store', switch: 'Switch 日服' };
const INITIAL = { steam: 'S', epic: 'E', gog: 'G', appstore: 'A', switch: 'N' };
const GRAD = {
  steam: 'linear-gradient(135deg,#1b2838,#0b1219)',
  epic: 'linear-gradient(135deg,#2b2b2b,#0a0a0a)',
  gog: 'linear-gradient(135deg,#4a1030,#2a0a1a)',
  appstore: 'linear-gradient(135deg,#4dabf7,#5f3dc4)',
  switch: 'linear-gradient(135deg,#E60012,#8f0009)',
  none: 'linear-gradient(135deg,#667eea,#764ba2)'
};
const CTA = { steam: '#171A21', epic: '#000000', gog: '#8A4FFF', appstore: '#007AFF', switch: '#E60012', none: '#4E5969' };

const platOf = (s) => (String(s).indexOf('steam') === 0 ? 'steam' : s);
const curOf = (c) => (c === 'USD' ? '$' : c === 'JPY' ? '\uFFE5' : '\u00A5');
const money = (v, c) => (v === null || v === undefined ? '—'
  : v === 0 ? '免费'
    : c === 'JPY' ? curOf(c) + Number(v).toLocaleString('en-US') + '\u5186'
      : curOf(c) + (c === 'CNY' ? v : Number(v).toLocaleString('en-US')));
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

function useData() {
  const [s, setS] = useState({ loading: true, items: [], index: [], series: {}, key: null, at: null });
  useEffect(() => {
    const key = new URLSearchParams(location.search).get('key');
    Promise.all([
      fetch('../latest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('../search-index.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]).then(([latest, idx]) => {
      setS({
        loading: false,
        items: (latest && latest.items) || [],
        index: Array.isArray(idx) ? idx : [],
        series: (latest && latest.series) || {},
        at: latest && latest.generated_at_bj,
        key
      });
    });
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
  return {
    partial: true,
    rec: {
      source: slim.s, id: slim.i, name: slim.n, price: slim.p, initial: slim.o, cut: slim.c, url: slim.u,
      promo_end: slim.e, players_online: slim.pl, lowest_price: slim.lo, cover: slim.cv, currency: slim.cur || 'CNY',
      tags: slim.tg || [], supports_zh: slim.zh, developer: slim.dv, publishers: slim.pb, release_date: slim.rd, metacritic: slim.mc
    }
  };
}

function Cover({ rec, className }) {
  const plat = platOf(rec.source);
  const [failed, setFailed] = useState(false);
  const showImg = rec.cover && !failed;
  return (
    <div className={'relative overflow-hidden rounded-xl ' + (className || '')} style={{ background: GRAD[plat] || GRAD.none }}>
      {showImg ? (
        <img src={rec.cover} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/80">{INITIAL[plat] || '?'}</div>
      )}
    </div>
  );
}

function TopNav({ name, onSearch }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E6EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <a href="../" className="flex items-center gap-1 text-sm text-[#4E5969] hover:text-[#1D2129]">‹ 返回</a>
        <div className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-[#1D2129]">{name || '加载中…'}</div>
        <button onClick={onSearch} className="text-[#86909C] hover:text-[#1D2129]" aria-label="搜索">⌕</button>
      </div>
    </header>
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
            <h1 className="text-2xl font-semibold text-[#1D2129]">{rec.name}</h1>
            <span className="rounded bg-[#F2F3F5] px-2 py-0.5 text-[11px] text-[#4E5969]">{PLAT[plat] || rec.source}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(rec.tags || []).slice(0, 6).map((t) => (
              <span key={t} className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-[12px] text-[#4E5969]">{t}</span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="text-[34px] font-bold leading-none text-[#1D2129]">{money(rec.price, rec.currency)}</span>
            {discounted && <span className="rounded bg-[#FF6A00] px-1.5 py-0.5 text-[12px] font-medium text-white">-{Math.abs(rec.cut)}%</span>}
            {discounted && <s className="text-[13px] text-[#86909C]">{money(rec.initial, rec.currency)}</s>}
            {rec.free_kind === 'limited' && <span className="rounded bg-[#00B578] px-1.5 py-0.5 text-[12px] text-white">限免</span>}
            {lowMatters && <span className="text-[12px] text-[#86909C]">史低 {money(rec.lowest_price, rec.currency)}</span>}
          </div>
          {rec.promo_end && <div className="mt-2 text-[12px] text-[#86909C]">促销截止 {new Date(rec.promo_end).toLocaleString('zh-CN', { hour12: false })}</div>}
          {rec.url && (
            <a href={rec.url} target="_blank" rel="noopener noreferrer"
               className="mt-4 block w-full rounded-lg py-2.5 text-center text-[15px] font-semibold text-white transition hover:opacity-85"
               style={{ background: CTA[plat] || CTA.none }}>
              打开 {PLAT[plat] || rec.source} 商店页 →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function InfoGrid({ rec, series }) {
  const cells = [
    ['开发商', dash(rec.developer)],
    ['发行商', dash(rec.publishers)],
    ['支持中文', rec.supports_zh === true ? '是' : rec.supports_zh === false ? '否' : '—'],
    ['媒体评分', dash(rec.metacritic)],
    ['当前在线', typeof rec.players_online === 'number' ? rec.players_online.toLocaleString('en-US') : '—'],
    ['价格快照', (series || []).length ? (series || []).length + ' 个' : '0 个']
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 pt-5">
      <div className="rounded-xl border border-[#E5E6EB] bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {cells.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-[#F7F8FA] px-3 py-2">
              <div className="text-[11px] text-[#86909C]">{k}</div>
              <div className="mt-0.5 text-[14px] font-semibold text-[#1D2129]">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function History({ rec, series }) {
  const pts = (series || []).filter((p) => typeof p[1] === 'number' && p[1] > 0);
  const hasData = pts.length >= 2;
  const W = 620, H = 160, padL = 42, padR = 12, padT = 12, padB = 24;
  const ys = hasData ? pts.map((p) => p[1]) : [0, 1];
  const min = Math.min(...ys), max = Math.max(...ys);
  const X = (i) => padL + (W - padL - padR) * (i / Math.max(1, pts.length - 1));
  const Y = (v) => padT + (H - padT - padB) * (1 - (v - min) / (max - min || 1));
  return (
    <section className="mx-auto max-w-5xl px-4 pt-5">
      <div className="rounded-xl border border-[#E5E6EB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <h2 className="text-[15px] font-semibold text-[#1D2129]">价格历史</h2>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <svg viewBox="0 0 80 80" className="h-16 w-16" fill="none" stroke="#C9CDD4" strokeWidth="2">
              <circle cx="40" cy="40" r="26" /><path d="M40 26v14l9 7" strokeLinecap="round" /><path d="M14 60l11-9 9 6 11-13 9 7" strokeLinecap="round" />
            </svg>
            <p className="text-[13px] text-[#86909C]">数据积累中，预计 2 天后自动生成价格曲线</p>
          </div>
        ) : (
          <>
            <svg viewBox={'0 0 ' + W + ' ' + H} className="mt-2 h-40 w-full">
              {[0, 0.5, 1].map((t) => <line key={t} x1={padL} y1={padT + (H - padT - padB) * t} x2={W - padR} y2={padT + (H - padT - padB) * t} stroke="#E5E6EB" />)}
              <polyline points={pts.map((p, i) => X(i) + ',' + Y(p[1])).join(' ')} fill="none" stroke="#FF6A00" strokeWidth="2" />
              {pts.map((p, i) => <circle key={p[0]} cx={X(i)} cy={Y(p[1])} r="2.5" fill="#FF6A00" />)}
            </svg>
            <table className="mt-3 w-full text-[12px]">
              <thead><tr className="text-[#86909C]"><th className="py-1 text-left font-normal">日期</th><th className="py-1 text-left font-normal">价格</th><th className="py-1 text-left font-normal">在线</th></tr></thead>
              <tbody>
                {pts.slice().reverse().map((r) => (
                  <tr key={r[0]} className="border-t border-[#F2F3F5]">
                    <td className="py-1.5 text-[#4E5969]">{r[0]}</td>
                    <td className="py-1.5">{money(r[1], rec.currency)}</td>
                    <td className="py-1.5 text-[#86909C]">{r[2] === null || r[2] === undefined ? '—' : r[2].toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
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
      <h2 className="text-[15px] font-semibold text-[#1D2129]">相似游戏</h2>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
        {list.map((s) => {
          const plat = platOf(s.source);
          return (
            <a key={s.source + ':' + s.id} href={'?key=' + encodeURIComponent(s.source + ':' + s.id)}
               className="w-[180px] shrink-0 self-start overflow-hidden rounded-xl border border-[#E5E6EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
              <Cover rec={s} className="aspect-video w-full self-start" />
              <div className="p-2">
                <div className="truncate text-[12.5px] font-medium text-[#1D2129]">{s.name}</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[13px] font-semibold text-[#1D2129]">{money(s.price, s.currency)}</span>
                  {s.cut > 0 && <span className="rounded bg-[#FF6A00] px-1 text-[10px] text-white">-{Math.abs(s.cut)}%</span>}
                </div>
              </div>
            </a>
          );
        })}
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
        <div className="flex items-center gap-2 border-b border-[#E5E6EB] p-3">
          <span className="text-[#86909C]">⌕</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索全部数据源"
                 className="w-full text-sm text-[#1D2129] outline-none placeholder:text-[#86909C]" />
          <button onClick={onClose} className="text-[#86909C] hover:text-[#1D2129]">关闭</button>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {hits.map((c) => (
            <button key={c.s + c.i} onClick={() => onPick(c.s + ':' + c.i)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#1D2129] hover:bg-[#F7F8FA]">
              <span className="flex-1 truncate">{c.n}</span>
              <span className="rounded bg-[#F2F3F5] px-1.5 text-[10px] text-[#86909C]">{c.s}</span>
              <span className="text-[12px] text-[#4E5969]">{money(c.p, c.cur)}</span>
            </button>
          ))}
          {!hits.length && <div className="p-6 text-center text-[13px] text-[#86909C]">没有匹配结果</div>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const st = useData();
  const [searchOpen, setSearchOpen] = useState(false);
  const r = useMemo(() => resolve(st), [st]);

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
      <div className="min-h-screen bg-[#F5F7FA] p-10 text-center text-sm text-[#86909C]">
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
      <InfoGrid rec={rec} series={series} />
      <History rec={rec} series={series} />
      <Similar rec={rec} items={st.items} />
      <footer className="mx-auto mt-6 max-w-5xl px-4 text-center text-[11px] text-[#86909C]">
        数据来自各平台公开接口 · 抓取 {st.at || '—'} · 因平台接口限制，当前暂不支持玩家评论
      </footer>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} index={st.index}
                     onPick={(k) => { location.href = '?key=' + encodeURIComponent(k); }} />
    </div>
  );
}
