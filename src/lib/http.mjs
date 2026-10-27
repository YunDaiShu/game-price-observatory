import dns from 'node:dns';

// 优先 IPv4：部分网络里 IPv6/特定 Fastly 边缘不可达，会表现成 connect timeout
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const UA = 'game-price-radar/0.1 (open source; contact via repo)';

// 若设置了代理但没开 Node 的环境代理开关，给一次提示（不报错、不打断）
const proxyVar = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
if (proxyVar && !process.env.NODE_USE_ENV_PROXY && !process.env.__GPR_PROXY_HINTED) {
  process.env.__GPR_PROXY_HINTED = '1';
  console.warn('提示：检测到代理 ' + proxyVar + '，但 Node 内置 fetch 默认不读环境代理；如需走代理请加 NODE_USE_ENV_PROXY=1');
}

/**
 * 带超时与重试的 JSON 抓取。
 * - 每次尝试独立超时（默认 8s），避免单源拖长整个 job
 * - 失败抛出的错误包含真实原因（undici 的 "fetch failed" 不足以定位）
 */
export async function fetchJson(url, { tries = 2, timeoutMs = 8000, headers = {}, retryOnTimeout = false } = {}) {
  let last = 'unknown';
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
        signal: ctrl.signal
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      const isTimeout = e?.name === 'AbortError' || /TIMEOUT/i.test(String(e?.cause?.code || ''));
      last = isTimeout ? 'TIMEOUT' : String(e?.cause?.code || e?.cause?.message || e?.message || e);
      if (e?.message && e.message.startsWith('HTTP ')) last = e.message;
      // 连接超时不做重试（封锁类问题重试只会白等）
      if (isTimeout && !retryOnTimeout) break;
      if (i < tries - 1) await new Promise((res) => setTimeout(res, 800));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(last);
}
