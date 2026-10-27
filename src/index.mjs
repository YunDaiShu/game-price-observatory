import fs from 'node:fs';
import path from 'node:path';
import { fetchSteam } from './fetchers/steam.mjs';
import { fetchAppStore } from './fetchers/appstore.mjs';
import { fetchSteamSpecials } from './fetchers/steam-specials.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const watch = readJson(path.join(ROOT, 'data', 'watchlist.json'));
const errors = [];
const items = [];

const tasks = [
  ...watch.steam.map((id) => ({ kind: 'steam', run: () => fetchSteam(id) })),
  ...watch.appstore.map((t) => ({ kind: 'appstore', run: () => fetchAppStore(t) }))
];

// 额外：当前特惠列表（数量不固定，单独抓，失败不影响主流程）
try {
  const specials = await fetchSteamSpecials();
  for (const s of specials) items.push(s);
} catch (e) {
  errors.push({ source: 'steam-specials', target: 'featuredcategories', error: String(e.message ?? e) });
}

const results = await Promise.allSettled(tasks.map((t) => t.run()));
results.forEach((res, i) => {
  if (res.status === 'fulfilled') items.push(res.value);
  else errors.push({ source: tasks[i].kind, target: String(watch.steam[i] ?? watch.appstore[i - watch.steam.length]), error: String(res.reason?.message ?? res.reason) });
});

// 去重（同源同 id 只留一条），再按折扣排序
const seen = new Set();
const deduped = items.filter((it) => {
  const k = it.source + ':' + it.id;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
items.length = 0;
items.push(...deduped);
items.sort((a, b) => (b.cut - a.cut) || (a.name || '').localeCompare(b.name || '', 'zh'));

const stamp = new Date();
const iso = stamp.toISOString();
const date = iso.slice(0, 10);

const payload = {
  generated_at: iso,
  timezone: 'UTC',
  region: 'CN',
  counts: { ok: items.length, failed: errors.length },
  items,
  errors
};

writeJson(path.join(ROOT, 'data', 'latest.json'), payload);
writeJson(path.join(ROOT, 'data', 'history', date + '.json'), payload);

// —— 渲染自包含静态页（不依赖外部框架，十年后仍能打开）——
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rows = items.map((it) => {
  const price = it.free ? '免费' : '¥' + it.price;
  const was = !it.free && it.initial > it.price ? '<span class="was">¥' + it.initial + '</span>' : '';
  const cut = it.cut > 0 ? '<span class="cut">-' + it.cut + '%</span>' : '';
  return '<tr><td class="n"><a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.name) + '</a></td>'
    + '<td>' + esc(it.source) + '</td><td class="p">' + price + was + '</td><td>' + cut + '</td></tr>';
}).join('\n');

const errBlock = errors.length
  ? '<section class="err"><h2>本次抓取失败（不影响其他条目）</h2><ul>'
    + errors.map((e) => '<li>' + esc(e.source) + ' · ' + esc(e.target) + ' — ' + esc(e.error) + '</li>').join('')
    + '</ul></section>'
  : '';

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>游戏价格雷达 · 每日价格表</title>
<style>
:root{--ink:#0b0d10;--paper:#f5f2ea;--gold:#c9a13f;--line:#e2dccd}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.7 "Noto Serif SC",Georgia,serif}
header{padding:40px 24px 8px;max-width:900px;margin:0 auto}
h1{margin:0;font-size:28px;letter-spacing:.06em}
.sub{color:#6b6459;font-size:13px;margin-top:6px}
main{max-width:900px;margin:0 auto;padding:16px 24px 60px}
table{width:100%;border-collapse:collapse;margin-top:18px;font-size:14px}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}
th{font-weight:600;color:#6b6459;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
td.p{white-space:nowrap;font-variant-numeric:tabular-nums}
.was{color:#9a9384;text-decoration:line-through;margin-left:6px;font-size:12px}
.cut{color:#8a1f1f;font-weight:600}
a{color:inherit;text-decoration:none;border-bottom:1px solid var(--gold)}
a:hover{background:#fff2cc}
.err{margin-top:28px;padding:14px 16px;border-left:3px solid #8a1f1f;background:#fbeeee;font-size:13px}
.err h2{font-size:14px;margin:0 0 6px}
footer{max-width:900px;margin:0 auto;padding:0 24px 48px;color:#6b6459;font-size:12px}
</style></head>
<body>
<header>
  <h1>游戏价格雷达</h1>
  <div class="sub">数据来源：Steam 官方商店接口、Apple App Store 公开接口 · 抓取时间 ${esc(iso)} · 区服 CN · 共 ${items.length} 条</div>
</header>
<main>
<table>
<thead><tr><th>游戏</th><th>平台</th><th>价格</th><th>折扣</th></tr></thead>
<tbody>
${rows || '<tr><td colspan="4">本次没有任何数据</td></tr>'}
</tbody></table>
${errBlock}
</main>
<footer>
本页由开源项目 game-price-radar 生成。价格会变，请以商店页面为准；本页只记录抓取时刻的数据。<br>
仅收录可公开获取的价格与名称，不含游戏简介、图片等版权内容。
</footer>
</body></html>`;

fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(ROOT, 'docs', '.nojekyll'), '', 'utf8');

console.log('OK ' + items.length + ' 条 / 失败 ' + errors.length + ' 条');
for (const it of items.slice(0, 6)) {
  console.log('  ' + it.source.padEnd(9) + (it.free ? '免费' : '¥' + it.price).padEnd(9) + (it.cut ? '-' + it.cut + '%' : '').padEnd(6) + ' ' + it.name);
}
if (errors.length) for (const e of errors) console.log('  ! ' + e.source + ' ' + e.target + ' -> ' + e.error);
