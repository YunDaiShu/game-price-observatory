import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GAME, SERIES, CATALOG, makeComments } from './data/mock.js';

const swatch = (hue) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="338">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="hsl(' + hue + ',38%,22%)"/>' +
      '<stop offset="100%" stop-color="hsl(' + ((hue + 48) % 360) + ',30%,10%)"/>' +
      '</linearGradient></defs><rect width="600" height="338" fill="url(#g)"/></svg>'
  );

const money = (v) => (v === null || v === undefined ? '—' : v === 0 ? '免费' : '¥' + v);

function useCountdown(iso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return '未公布';
  const left = Date.parse(iso) - now;
  if (Number.isNaN(left)) return '未公布';
  if (left <= 0) return '已结束';
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const hms = pad(Math.floor((s % 86400) / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
  return d > 0 ? '剩余 ' + d + '天 ' + hms : '剩余 ' + hms;
}

function Icon({ d, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TopNav({ onSearch }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2a475e] bg-[#171a21]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <button className="flex items-center gap-2 text-[#c7d5e0] hover:text-white">
          <Icon d="M15 19l-7-7 7-7" className="h-4 w-4" />
          <span className="text-sm">返回</span>
        </button>
        <div className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white">影之刃零</div>
        <div className="flex items-center gap-3 text-[#8f98a0]">
          <button onClick={onSearch} className="hover:text-white" aria-label="搜索"><Icon d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" /></button>
          <button className="hover:text-white" aria-label="分享"><Icon d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M12 3v12M8 7l4-4 4 4" /></button>
          <button className="hover:text-white" aria-label="消息"><Icon d="M4 5h16v11H8l-4 4V5z" /></button>
        </div>
      </div>
    </header>
  );
}

function Gallery() {
  const [idx, setIdx] = useState(0);
  const g = GAME.gallery[idx];
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <div className="relative overflow-hidden rounded-lg border border-[#2a475e] bg-[#0e141b]">
        <img src={swatch(g.hue)} alt={g.label} loading="lazy" className="h-[300px] w-full object-cover md:h-[420px]" />
        <div className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{idx + 1}/{GAME.gallery.length}</div>
        <button onClick={() => setIdx((i) => (i - 1 + GAME.gallery.length) % GAME.gallery.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-black/50 px-2 py-1 text-white hover:bg-black/70">‹</button>
        <button onClick={() => setIdx((i) => (i + 1) % GAME.gallery.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-black/50 px-2 py-1 text-white hover:bg-black/70">›</button>
      </div>
      <div className="hide-scroll mt-2 flex gap-2 overflow-x-auto pb-1">
        {GAME.gallery.map((t, i) => (
          <button key={t.id} onClick={() => setIdx(i)} className={'shrink-0 overflow-hidden rounded border ' + (i === idx ? 'border-[#66c0f4]' : 'border-transparent') + ' hover:border-[#66c0f4]'}>
            <img src={swatch(t.hue)} alt={t.label} loading="lazy" className="h-14 w-24 object-cover" />
          </button>
        ))}
      </div>
    </section>
  );
}

function PriceBlock() {
  const left = useCountdown(GAME.promoEnd);
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#2a475e] bg-gradient-to-r from-[#1b2838] to-[#16202d] p-4">
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-white">{money(GAME.price)}</span>
          {GAME.initial > GAME.price && <s className="text-sm text-[#738895]">{money(GAME.initial)}</s>}
          {GAME.cut > 0 && <span className="rounded bg-[#4c6b22] px-2 py-0.5 text-sm font-bold text-[#a4d007]">-{GAME.cut}%</span>}
          {GAME.lowest !== null && GAME.price <= GAME.lowest && (
            <span className="rounded bg-[#1d3b28] px-2 py-0.5 text-xs font-semibold text-[#5ee08a] ring-1 ring-[#2f6b46]">史低 {money(GAME.lowest)}</span>
          )}
          <span className="text-xs text-[#8f98a0]">促销{left}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded bg-[#a83b3b] px-3 py-1.5 text-right">
            <div className="text-sm font-bold text-white">97.0万 好评</div>
            <div className="text-[10px] text-white/80">♥ 心愿单</div>
          </div>
          <button className="rounded bg-[#4c6b22] px-4 py-2 text-sm font-semibold text-[#a4d007] hover:bg-[#5a7f28]">加入愿望单</button>
        </div>
      </div>
    </section>
  );
}

function BasicInfo({ activeTag, onTag }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4">
      <h1 className="text-2xl font-bold text-white">
        {GAME.nameCn} <span className="ml-2 text-base font-normal text-[#8f98a0]">{GAME.nameEn}</span>
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {GAME.platforms.map((p) => (
          <span key={p} className="rounded bg-[#2a475e] px-2 py-0.5 text-[#c7d5e0]">{p}</span>
        ))}
        <span className="rounded bg-[#2a475e] px-2 py-0.5 text-[#c7d5e0]">{GAME.languages.join(' · ')}</span>
        <span className="rounded bg-[#2a475e] px-2 py-0.5 text-[#c7d5e0]">{GAME.players.single ? '单人' : ''}{GAME.players.multi ? ' · 多人' : ''}</span>
        {GAME.rankBadges.map((b) => (
          <span key={b} className="rounded bg-[#1b3a4b] px-2 py-0.5 text-[#66c0f4]">{b}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {GAME.tags.map((t) => (
          <button
            key={t}
            onClick={() => onTag(activeTag === t ? null : t)}
            className={'rounded px-2.5 py-1 text-xs transition ' + (activeTag === t ? 'bg-[#66c0f4] text-[#0e141b]' : 'bg-[#2a475e] text-[#c7d5e0] hover:bg-[#35617f]')}
          >
            {t}
          </button>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-5">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {GAME.stats.map((s) => (
          <div key={s.label} className="rounded border border-[#2a475e] bg-[#1b2838] px-3 py-3 transition hover:-translate-y-0.5 hover:border-[#66c0f4] hover:shadow-lg hover:shadow-black/40">
            <div className="text-lg font-semibold text-white">{s.value}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#8f98a0]">{s.label}{s.hint && <span className="text-[#5b6b78]">{s.hint}</span>}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-[#5b6b78]">{GAME.statsNote}</p>
    </section>
  );
}

function Overview() {
  const [open, setOpen] = useState(false);
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">游戏简介</h2>
        <button onClick={() => setOpen((v) => !v)} className="text-xs text-[#66c0f4] hover:underline">{open ? '收起 ' : '全部 >'}</button>
      </div>
      <p className={'mt-2 text-[13px] leading-7 text-[#acb7c2] ' + (open ? '' : 'line-clamp-3')}>{GAME.overview}</p>
      <dl className="mt-3 grid grid-cols-1 gap-1 text-[12.5px] text-[#8f98a0] md:grid-cols-2">
        <div className="flex gap-2"><dt>发布时间：</dt><dd className="text-[#c7d5e0]">{GAME.releaseDate}</dd></div>
        <div className="flex gap-2"><dt>开发商：</dt><dd className="text-[#c7d5e0]">{GAME.developer}</dd></div>
        <div className="flex gap-2"><dt>发行商：</dt><dd className="text-[#c7d5e0]">{GAME.publisher}</dd></div>
        <div className="flex gap-2"><dt>媒体评分：</dt><dd className="text-[#c7d5e0]"><span className="rounded bg-[#4c6b22] px-1.5 text-[#a4d007]">{GAME.mediaScore}</span> {GAME.mediaCount} 家综评</dd></div>
      </dl>
    </section>
  );
}

function ExtraRows() {
  const [openKey, setOpenKey] = useState(null);
  return (
    <section className="mx-auto max-w-6xl px-4 pt-5">
      <div className="divide-y divide-[#2a475e] overflow-hidden rounded border border-[#2a475e] bg-[#1b2838]">
        {GAME.extra.map((r) => (
          <div key={r.title}>
            <button onClick={() => setOpenKey(openKey === r.title ? null : r.title)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-[#223447]">
              <span>{r.icon}</span>
              <span className="text-[13px] text-[#c7d5e0]">{r.title}</span>
              <span className={'ml-auto text-[12.5px] ' + (r.tone === 'bad' ? 'text-[#e07b7b]' : r.tone === 'good' ? 'text-[#5ee08a]' : 'text-[#8f98a0]')}>{r.value}</span>
              <span className="text-[#5b6b78]">{openKey === r.title ? '▴' : '▾'}</span>
            </button>
            {openKey === r.title && (
              <div className="fade-up px-3 pb-3 text-[12.5px] text-[#8f98a0]">
                这里是「{r.title}」的展开内容（mock）。真实数据接入后展示官方公告 / 配置检测明细 / 各区域延迟。
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Similar({ activeTag, onTag }) {
  const list = activeTag ? GAME.similar.filter((s) => GAME.tags.includes(activeTag)) : GAME.similar;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">相似游戏</h2>
        {activeTag && <button onClick={() => onTag(null)} className="text-xs text-[#66c0f4]">清除标签筛选：{activeTag} ×</button>}
      </div>
      <div className="hide-scroll mt-3 flex gap-3 overflow-x-auto pb-2">
        {(list.length ? list : GAME.similar).map((s) => (
          <div key={s.name} className="w-44 shrink-0 cursor-pointer overflow-hidden rounded border border-[#2a475e] bg-[#1b2838] transition hover:-translate-y-1 hover:border-[#66c0f4] hover:shadow-xl hover:shadow-black/50">
            <div className="relative">
              <img src={swatch(s.hue)} alt={s.name} loading="lazy" className="h-24 w-full object-cover" />
              {s.cut > 0 && <span className="absolute left-1 top-1 rounded bg-[#4c6b22] px-1 text-[10px] font-bold text-[#a4d007]">-{s.cut}%</span>}
            </div>
            <div className="p-2">
              <div className="truncate text-[12.5px] text-[#c7d5e0]">{s.name}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[12.5px] font-semibold text-white">{money(s.price)}</span>
                {s.initial > s.price && <s className="text-[10px] text-[#738895]">{money(s.initial)}</s>}
                {s.low && <span className="rounded bg-[#1d3b28] px-1 text-[10px] text-[#5ee08a]">史低</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Reviews() {
  const [sort, setSort] = useState('推荐');
  const [pages, setPages] = useState(2);
  const [minHours, setMinHours] = useState(0);
  const sentinel = useRef(null);
  const comments = useMemo(() => makeComments(0, pages * 6).filter((c) => c.hours >= minHours), [pages, minHours]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setPages((p) => Math.min(p + 1, 12));
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const total = GAME.rating.total;
  const dist = [[5, 0], [4, 0], [3, 0], [2, 0], [1, 0]];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8 pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">游戏评价</h2>
        <div className="flex gap-1 text-xs">
          {['推荐', '最新', '有用', '欢乐'].map((t) => (
            <button key={t} onClick={() => setSort(t)} className={'rounded px-2.5 py-1 ' + (sort === t ? 'bg-[#66c0f4] text-[#0e141b]' : 'bg-[#2a475e] text-[#c7d5e0] hover:bg-[#35617f]')}>{t}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[280px_1fr]">
        <div className="rounded border border-[#2a475e] bg-[#1b2838] p-3">
          <div className="text-sm text-[#8f98a0]">暂无评分</div>
          <div className="mt-1 text-xs text-[#5b6b78]">{total.toLocaleString('en-US')} 人想玩</div>
          <div className="mt-3 space-y-1">
            {dist.map(([star]) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-3 text-[11px] text-[#8f98a0]">{star}</span>
                <div className="h-1.5 flex-1 rounded bg-[#2a475e]"><div className="h-1.5 rounded bg-[#66c0f4]" style={{ width: '0%' }} /></div>
                <span className="w-8 text-right text-[11px] text-[#5b6b78]">0%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-[#2a475e] bg-[#1b2838] p-3">
          <button className="w-full rounded bg-[#2a475e] py-2 text-sm text-[#c7d5e0] hover:bg-[#35617f]">想玩</button>
          <div className="mt-2 rounded border border-[#2a475e] px-3 py-2 text-[12.5px] text-[#5b6b78]">说点什么吧…</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-[#8f98a0]">
            <span>游玩时长</span>
            {[0, 50, 100].map((h) => (
              <button key={h} onClick={() => setMinHours(h)} className={'rounded px-2 py-0.5 ' + (minHours === h ? 'bg-[#66c0f4] text-[#0e141b]' : 'bg-[#2a475e]')}>{h === 0 ? '全部' : h + 'h+'}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {comments.map((c) => (
          <article key={c.id} className="rounded border border-[#2a475e] bg-[#1b2838] p-3 transition hover:border-[#35617f]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded" style={{ background: 'hsl(' + c.avatarHue + ',40%,35%)' }} />
              <div>
                <div className="text-[13px] text-[#c7d5e0]">{c.user}</div>
                <div className="text-[11px] text-[#5b6b78]">{c.hours}h · {c.date} {c.rating && <span className="text-[#e07b7b]">· {c.rating}</span>}</div>
              </div>
            </div>
            <p className="mt-2 text-[13px] leading-6 text-[#acb7c2]">{c.text}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-[#8f98a0]">
              <span>👍 有用 {c.useful}</span><span>👎 没用 {c.useless}</span><span>😄 欢乐 {c.funny}</span><span>💬 讨论 {c.replies}</span>
            </div>
          </article>
        ))}
        <div ref={sentinel} className="py-6 text-center text-[12px] text-[#5b6b78]">加载更多评论…</div>
      </div>
    </section>
  );
}

function ResultChart({ item }) {
  const pts = SERIES;
  const W = 620, H = 150, padL = 36, padR = 10, padT = 10, padB = 22;
  const ys = pts.map((p) => p.players);
  const min = Math.min(...ys), max = Math.max(...ys);
  const x = (i) => padL + (W - padL - padR) * (i / (pts.length - 1));
  const y = (v) => padT + (H - padT - padB) * (1 - (v - min) / (max - min || 1));
  const poly = pts.map((p, i) => x(i) + ',' + y(p.players)).join(' ');
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="h-40 w-full">
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={padL} y1={padT + (H - padT - padB) * t} x2={W - padR} y2={padT + (H - padT - padB) * t} stroke="#2a475e" />
      ))}
      <polyline points={poly} fill="none" stroke="#66c0f4" strokeWidth="2" />
      <text x={padL} y={H - 6} fill="#5b6b78" fontSize="10">{pts[0].date}</text>
      <text x={W - padR} y={H - 6} fill="#5b6b78" fontSize="10" textAnchor="end">{pts[pts.length - 1].date}</text>
      <text x={4} y={padT + 8} fill="#5b6b78" fontSize="10">{Math.round(max / 1000)}k</text>
      <text x={4} y={H - padB} fill="#5b6b78" fontSize="10">{Math.round(min / 1000)}k</text>
    </svg>
  );
}

function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(CATALOG[0]);
  if (!open) return null;
  const hits = q ? CATALOG.filter((c) => c.n.toLowerCase().includes(q.toLowerCase())) : CATALOG;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 md:p-10" onClick={onClose}>
      <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-[#2a475e] bg-[#16202d]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[#2a475e] p-3">
          <Icon d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" className="h-4 w-4 text-[#8f98a0]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索全部数据源（Steam / Epic / GOG / App Store）" className="w-full bg-transparent text-sm text-[#c7d5e0] outline-none placeholder:text-[#5b6b78]" />
          <button onClick={onClose} className="text-[#8f98a0] hover:text-white">关闭 ×</button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-1 md:grid-cols-[300px_1fr]">
          <div className="hide-scroll max-h-[70vh] overflow-auto border-b border-[#2a475e] md:border-b-0 md:border-r">
            <div className="px-3 py-2 text-[11px] text-[#5b6b78]">命中 {hits.length} 条</div>
            {hits.map((c) => (
              <button key={c.s + c.i} onClick={() => setSel(c)} className={'flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] ' + (sel && sel.i === c.i ? 'bg-[#2a475e] text-white' : 'text-[#c7d5e0] hover:bg-[#223447]')}>
                <span className="flex-1 truncate">{c.n}</span>
                <span className="shrink-0 rounded bg-[#1b2838] px-1.5 text-[10px] text-[#8f98a0]">{c.s}</span>
                <span className="shrink-0 text-[11px] text-[#8f98a0]">{money(c.p)}</span>
              </button>
            ))}
            {!hits.length && <div className="px-3 py-6 text-center text-[12px] text-[#5b6b78]">没有匹配结果</div>}
          </div>
          <div className="max-h-[70vh] overflow-auto p-4">
            {sel ? (
              <>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-semibold text-white">{sel.n}</h3>
                  <span className="rounded bg-[#2a475e] px-1.5 text-[10px] text-[#8f98a0]">{sel.s}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    ['当前价', money(sel.p)],
                    ['原价', money(sel.o)],
                    ['折扣', sel.c > 0 ? '-' + sel.c + '%' : '—'],
                    ['史低', sel.lo ? money(sel.lo) : '—']
                  ].map(([k, v]) => (
                    <div key={k} className="rounded border border-[#2a475e] bg-[#1b2838] px-3 py-2">
                      <div className="text-base font-semibold text-white">{v}</div>
                      <div className="text-[10.5px] text-[#8f98a0]">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded border border-[#2a475e] bg-[#1b2838] p-2">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-[#5b6b78]">
                    <span>在线人数趋势（近 30 天 · mock）</span>
                    <span>Steam charts 风格</span>
                  </div>
                  <ResultChart item={sel} />
                </div>
                <table className="mt-3 w-full text-[12px]">
                  <tbody>
                    {[
                      ['平台', sel.s],
                      ['当前价', money(sel.p)],
                      ['原价', money(sel.o)],
                      ['折扣', sel.c > 0 ? '-' + sel.c + '%' : '—'],
                      ['史低', sel.lo ? money(sel.lo) : '—'],
                      ['在线人数', sel.pl ? sel.pl.toLocaleString('en-US') : '—'],
                      ['标签', (sel.tg || []).join('、') || '—']
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b border-[#223447]">
                        <th className="w-28 py-1.5 text-left font-normal text-[#8f98a0]">{k}</th>
                        <td className="py-1.5 text-[#c7d5e0]">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : <div className="text-[12px] text-[#5b6b78]">选择左侧条目查看详情</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveBar() {
  const [live, setLive] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const key = new URLSearchParams(location.search).get('key');
    fetch('../latest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!doc || !Array.isArray(doc.items)) { setErr(true); return; }
        const all = doc.items.map((i) => ({ key: i.source + ':' + i.id, ...i }));
        const hit = key ? all.find((x) => x.key === key) : all[0];
        setLive(hit || null);
        if (!hit) setErr(true);
      })
      .catch(() => setErr(true));
  }, []);
  if (!live) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <div className="rounded border border-[#4a3a22] bg-[#2a2118] px-3 py-2 text-[11.5px] text-[#d8c9a8]">
          {err ? '未取到实时数据，当前展示示例数据（mock）' : '正在读取实时数据…'}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3">
      <div className="flex flex-wrap items-center gap-2 rounded border border-[#2f6b46] bg-[#14251c] px-3 py-2 text-[11.5px] text-[#8fd7a8]">
        <span className="rounded bg-[#1d3b28] px-1.5 text-[#5ee08a]">实时</span>
        <span className="text-[#c7d5e0]">{live.name}</span>
        <span>·</span><span>{live.source}</span>
        <span>·</span><span>现价 {live.price === 0 ? '免费' : '¥' + live.price}</span>
        {live.cut > 0 && <span className="text-[#ff8a80]">-{live.cut}%</span>}
        {live.promo_end && <span>· 截止 {new Date(live.promo_end).toLocaleString('zh-CN', { hour12: false })}</span>}
        {typeof live.players_online === 'number' && <span>· 在线 {live.players_online.toLocaleString('en-US')}</span>}
        <span className="ml-auto text-[#5b6b78]">数据来自 game-price-radar/latest.json（详情页其余卡片为 mock）</span>
      </div>
    </div>
  );
}

export default function App() {
  const [tag, setTag] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <TopNav onSearch={() => setSearchOpen(true)} />
      <LiveBar />
      <Gallery />
      <PriceBlock />
      <BasicInfo activeTag={tag} onTag={setTag} />
      <Stats />
      <Overview />
      <ExtraRows />
      <Similar activeTag={tag} onTag={setTag} />
      <Reviews />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
