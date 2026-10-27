# 怎么加一个新平台的抓取源（3 步）

每个数据源都是 `src/fetchers/` 下的一个独立文件，导出**一个 async 函数**，返回统一结构。
单个源失败不影响其它源——主流程用 `Promise.allSettled`，失败会写进 `data/latest.json` 的 `errors`。

## 第 1 步：写 fetcher

新建 `src/fetchers/your-source.mjs`：

```js
export async function fetchYourSource(param) {
  const r = await fetch('https://example.com/api/...', {
    headers: { 'User-Agent': 'game-price-radar/0.1 (open source; contact via repo)' }
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();

  // 返回数组；每一项必须是下面这个形状
  return [{
    source: 'your-source',   // 平台标识，会显示在表格里
    id: String(j.id),        // 平台内唯一 id，用于去重
    name: j.name,
    free: false,             // 免费游戏为 true
    price: 12.5,             // 当前价（元）
    initial: 25,             // 原价（元）
    cut: 50,                 // 折扣百分比（整数）
    currency: 'CNY',
    url: 'https://example.com/app/123'
  }];
}
```

## 第 2 步：接进主流程

编辑 `src/index.mjs`：

1. 顶部加 `import { fetchYourSource } from './fetchers/your-source.mjs';`
2. 在 `tasks` 数组里加一项，或在特惠段那种 `try/catch` 里直接 push（返回多项时用后者）

## 第 3 步：验证

```bash
node src/index.mjs
```

看到 `OK n 条 / 失败 0 条` 即成功；失败会有 `! your-source ... -> 原因`。

---

## 排查：源失效了怎么办

1. 手动执行一次，看 `errors` 里的报错（HTTP 403 = 被限流/封禁；解析出 undefined = 字段改名）；
2. 用浏览器打开那个接口，确认结构是否变化；
3. 只改对应的 fetcher 文件，其它源不动；
4. 若确认对方已禁止抓取：**直接删掉该源**，不要硬绕（合规优先）。

## 合规底线（加源前先自查）

- 只用**公开、无需登录**的接口；
- 遵守对方的 `robots.txt` 与调用频率，别做高频轮询；
- 只取**价格/名称/时间**这类事实数据，不取简介、图片、评测正文；
- 招聘/平台自有整理数据（如社区 App 的价格模块）不要直接转载。
