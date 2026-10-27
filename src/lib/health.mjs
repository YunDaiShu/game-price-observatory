import fs from 'node:fs';
import path from 'node:path';

// 单源健康度与熔断：连续失败达到阈值后，暂停该源若干天，避免每天白等超时
const PAUSE_AFTER = 3;   // 连续失败 3 次
const PAUSE_DAYS = 2;    // 暂停 2 天

// 环境隔离：CI 与本机各自一份，避免"本机病态"被提交后让 CI 误熔断
const FILE = (root) => path.join(root, 'data', process.env.CI ? 'health.ci.json' : 'health.local.json');
const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function loadHealth(root) {
  try {
    return JSON.parse(fs.readFileSync(FILE(root), 'utf8'));
  } catch {
    return {};
  }
}

export function saveHealth(root, health) {
  fs.mkdirSync(path.dirname(FILE(root)), { recursive: true });
  fs.writeFileSync(FILE(root), JSON.stringify(health, null, 2) + '\n', 'utf8');
}

export function pausedReason(health, source, today = todayStr()) {
  if (process.env.IGNORE_BREAKER === '1') return null; // 临时强制抓取（排障用）
  const h = health[source];
  if (!h || !h.pausedUntil) return null;
  if (h.pausedUntil < today) return null; // 已到期，恢复尝试
  return h.pausedUntil;
}

export function recordResult(health, source, ok, { today = todayStr(), error = null } = {}) {
  const h = health[source] || { failStreak: 0, pausedUntil: null, lastError: null, lastFail: null, lastOk: null };
  if (ok) {
    h.failStreak = 0;
    h.pausedUntil = null;
    h.lastError = null;
    h.lastOk = today;
  } else {
    h.failStreak = (h.failStreak || 0) + 1;
    h.lastFail = today;
    h.lastError = String(error || '').slice(0, 200);
    if (h.failStreak >= PAUSE_AFTER) h.pausedUntil = addDays(today, PAUSE_DAYS);
  }
  health[source] = h;
  return health;
}
