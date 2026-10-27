# 游戏价格雷达 · game-price-radar

> 每天自动抓取游戏平台的**官方公开接口**，生成当日折扣 / 限时免费榜单与静态页，用来做「史低情报」类内容。
> **零 API key、零运行时依赖、单源失效不影响整站。**

- 🌐 在线页面：<https://yundaishu.github.io/game-price-radar/>
- 📄 数据快照：[`data/latest.json`](data/latest.json)（历史在 [`data/history/`](data/history)）
- 📘 字段字典：[`docs/FIELDS.md`](docs/FIELDS.md)
- ⚖️ 许可证：MIT

---

## 这是什么

一个**只做一件事**的小工具：定时把各家商店的公开价格抓下来，整理成能直接看的表，并留档成按日快照。

它面向的场景很具体——**做游戏内容的人每天都要回答「今天哪款值得买」**。手工抄太慢，抓取脚本又容易因为站点改版就废掉，所以这里按「每个源一个文件、单源失败不影响整站」组织。

## 它能做什么

| 能力 | 说明 |
|---|---|
| **来源筛选** | 顶部筛选条：全部 / Steam / Epic / GOG / App Store，一键只看某一来源，再点「全部」还原；实时显示「显示 n / 总数」；切换带淡出/错峰淡入 |
| **卡片式布局** | 参考 ipkk.com/app-store-free 的信息层级：一屏多卡的网格 + 卡面直接挂「来源 / 限免 / 中文 / 新史低」徽章 |
| **限时免费标记** | 限免条目在榜单里用**绿色左边框 +「限免」徽章 + 领取截止倒计时**标出；**永久免费一律不收录**（例外：看板里显式钉住的常驻条目，如 F2P 的《Sky 光·遇》） |
| **促销倒计时** | 有结束时间的源显示「还剩 x 天 / x 小时」；无起止字段的源显示「未公布」 |
| **新史低标记** | 与本地全部历史快照对比，刷新纪录的条目打「新史低」金色角标 |
| **中文支持标识** | 可判定的源显示「中文 / 无中文」，判定不了的不显示徽章 |
| **实时在线人数** | Steam 条目显示当前在线人数，其它源不显示 |
| **多平台横评** | Steam / Epic / GOG / App Store 汇总在同一张榜单 |
| 当前特惠榜 | 自动拉取 Steam 当期折扣列表，无需维护名单 |
| 指定游戏监控 | 在 `data/watchlist.json` 里填 appid / 关键词 |
| 按日留档 | 每次运行写一份 `data/history/YYYY-MM-DD.json` |
| 失败可见 | 抓不到的源写入 `errors`，页面底部标红，不静默失败 |

## 数据来源与合规

| 源 | 获取方式 | 用途 | 可覆盖字段 | 状态 |
|---|---|---|---|---|
| **Steam** | `appdetails` / `featuredcategories` / `GetNumberOfCurrentPlayers` | 价格、折扣、特惠榜 | 促销**截止**、中文支持、**在线人数**、分类 | ✅ 可用 |
| **Epic** | 官方 CDN `store-site-backend-static.ak.epicgames.com/freeGamesPromotions` | 折价、周免 | 促销**起止**、限免判定 | ✅ 可用 |
| **GOG** | 官方 `catalog.gog.com/v1/catalog` | 折价、标签 | 价格、折扣、**标签** | ⚠️ 接口可用，但 `catalog.gog.com` 在**部分网络**（如本机）TCP 不可达；GitHub Actions 环境正常 |
| **Apple App Store** | 官方 `iTunes Search` / `Lookup` | 付费手游当前价 | 价格（含限免判定） | ✅ 可用（**只能用付费应用做监控词**；免费应用按规则不收录，故 `watchlist` 里放的是付费游戏） |
| **SteamPY（匹歪）** | 站点为纯 SPA：`/`、`/robots.txt`、`/api/game/list` 均返回同一份 120,631 字节 HTML（实测 2026-10-27），HTML 内无 inline state、无 `/api/` 路径、无公开文档 | — | — | ❌ **不可用**（无公开接口；需自建代理并设 `STEAMPY_API_URL`） |
| **杉果 Sonkwo** | `www.sonkwo.com/api/v2/products` → **410 Gone** | — | — | ❌ **不可用**（端点已下线，需商务授权） |
| **SteamDB** | `steamdb.info/api/…` → **403** | — | — | ❌ **不可用/需授权**（ToS 禁止抓取，API 仅赞助者可用） |
| **Humble Bundle** | `www.humblebundle.com/store/api/search` → **403** | — | — | ❌ **不可用/需授权**（接口拒绝非浏览器请求） |

> 三个不可用来源**不做替代、不猜数据**，页面上也不出现其占位条目。

**原则**

1. 只使用**公开、无需登录**的接口；
2. 只保存**名称、价格、折扣、促销时间、标签、在线人数、时间戳**这类事实数据，**不保存**简介、图片、评测正文等版权内容；
3. 遵守对方 `robots.txt` 与调用频率，不做高频轮询，不绕过任何访问限制；
4. 若确认某源已禁止抓取，**直接移除该源**，不做规避。

## 已知数据缺口（不估算，如实标注）

| 缺口 | 原因 | 表现 |
|---|---|---|
| Epic 标签 | 官方标签目录接口不可得（launcher GraphQL 403、graphql.epicgames.com 404、storefront 403） | Epic 条目 `tags` 为空，页面显示 — |
| Epic 币种 | 该 CDN 接口返回 **USD** | 页面按 $ 显示；**不参与跨币种史低比较** |
| Steam 促销开始时间 | `featuredcategories` 无该字段 | 显示「未公布」 |
| Steam 用户标签 | 官方无标签字段（第三方 SteamSpy 403） | 只显示官方「分类」，非用户标签 |
| Steam 限时免费（周末试玩） | 官方无对应字段 | 不判定、不展示（不猜测） |
| GOG 促销起止 | `catalog` 接口不含 | 显示「未公布」 |
| 手游折扣 | App Store 无折扣概念 | 只显示当前售价，靠「曾付费→现免费」识别限免 |
| SteamPY 数据 | 站点是纯 SPA，无公开接口（`/robots.txt` 也被 SPA 接管）；且其价格来自用户挂单，与官方商店口径不同 | 默认不抓；`errors` 里明确记录原因，页面不出现假数据 |

## 快速开始

```bash
node src/index.mjs
```

产物：

| 路径 | 内容 |
|---|---|
| `data/latest.json` | 最新结果（含 `counts` / `by_source` / `errors`） |
| `data/history/YYYY-MM-DD.json` | 按日快照（git 内**永久保留**，史低判定依赖它） |
| `docs/index.html` | 自包含静态页（无框架、无 CDN，GitHub Pages 发布目录） |

## 目录结构

```text
game-price-radar/
├─ src/
│  ├─ index.mjs              主流程：抓取 → 归一 → 史低 → 限免过滤 → 排序 → 输出
│  ├─ render.mjs             页面模板（限免专区 / 榜单 / 倒计时 / 徽章）
│  ├─ fetchers/              每个数据源一个文件
│  │  ├─ steam.mjs           指定游戏价格 + 中文 + 在线人数
│  │  ├─ steam-specials.mjs  当期特惠（含促销截止）
│  │  ├─ epic.mjs            周免/折价（促销起止）
│  │  ├─ gog.mjs             折价 + 标签（已过滤原声带/DLC）
│  │  └─ appstore.mjs        App Store 公开接口
│  └─ lib/
│     ├─ fields.mjs          字段归一（缺失一律 null/[]/unknown）
│     ├─ history.mjs         历史快照读取 + 史低 / 新史低判定
│     └─ free.mjs            限时免费 vs 永久免费判定 + 永久免费过滤
├─ data/
│  ├─ watchlist.json         监控名单
│  ├─ latest.json            最新结果
│  └─ history/               按日快照（史低依据）
├─ docs/
│  ├─ index.html             生成的静态页（Pages 发布目录）
│  ├─ FIELDS.md              字段字典
│  └─ ADD-A-SOURCE.md        怎么新增一个抓取源
└─ .github/workflows/daily.yml
```

## 史低与「新史低」判定

```text
对每个 (source, id)：
  history      = data/history/*.json 中该条目的 price（排除今天、排除免费、排除非 CNY）
  lowest_price = min(history ∪ {today.price})
  prev_low     = history 非空 ? min(history) : null
  is_new_low   = prev_low !== null && today.price < prev_low
```

| 规则 | 取值 |
|---|---|
| 对比数据 | 仓库内 `data/history/` |
| 对比窗口 | 该条目**自首次观察以来的全部历史**（不做滚动窗口） |
| 保留周期 | **git 内永久保留**（每日约 7 KB，一年约 2.5 MB） |
| 首次观察 | `prev_low === null` → `is_new_low = null`（不标新史低） |
| 免费/限免 | 不参与史低计算，避免 0 元污染历史 |
| 跨币种 | 不比较（Epic 为 USD，故不参与史低） |

## 时区与倒计时

- 快照内所有时间字段一律 **UTC ISO 8601**；
- 页面顶部显示**北京时间（UTC+8）**的抓取时刻；
- 倒计时由页面 JS 用 `Date.now()` 与 `promo_end` **现算**（绝对时间差，与时区无关）；
- 格式：超过 7 天显示「还剩 n 天」，1–7 天显示「还剩 n 天 m 小时」，不足 1 天显示「还剩 n 小时 m 分」，到期显示「已结束」。

## 自动化

- 每天 **UTC 00:10（北京 08:10）** 自动运行，也可在 Actions 页面手动触发；
- 运行后自动提交 `data/` 与 `docs/`，页面随之更新；
- **运行失败自动开 issue**，正文带日志链接。

## 熔断与健康度

单源连续失败会触发**短期熔断**，避免每天白等超时：

- 状态文件**按环境隔离**：CI 写 `data/health.ci.json`，本机写 `data/health.local.json`（避免"本机病态"被提交后让 CI 误熔断）
- 规则：连续失败 **3 次** → 暂停该源 **2 天**（`pausedUntil`），到期自动重试
- 熔断期间该源不出现在抓取流程里，页面提示「已熔断跳过（连续 N 次失败，YYYY-MM-DD 后重试）」
- 任意一次成功即重置 `failStreak`

实测：GOG 在本机不可达时，第 1–3 次运行各耗时约 5s，第 4 次熔断后整条流水线 **1.8s**。

### 本机走代理

若你的网络需要代理才能访问某些商店，Node 内置 fetch 默认**不读**环境代理，需显式开启：

```bash
export HTTPS_PROXY=http://127.0.0.1:7890
export NODE_USE_ENV_PROXY=1
node src/index.mjs
```

（只需设 `HTTPS_PROXY` 时会打印一条提示，不会中断。）

## 监控名单

```json
{
  "steam": [730, 1245620, 1086940],
  "appstore": ["原神", "星露谷物语"]
}
```

- `steam`：Steam appid，或 `{ "id": 2325290, "always": true }` 形式——`always` 表示"钉住常驻"，即使该游戏是永久免费（F2P）也会展示（例：《Sky 光·遇》）；
- `appstore`：搜索关键词，取第一条结果；
- Epic / GOG / Steam 特惠榜：**自动抓取，无需配置**；
- SteamPY：默认不抓（无公开接口）。如你已获授权或有自建代理端点，设置环境变量 `STEAMPY_API_URL` 即可启用，条目会自动并入同一套字段与校验流程。

```bash
STEAMPY_API_URL=https://your-proxy.example.com/steampy.json node src/index.mjs
```

## 怎么新增数据源

见 [`docs/ADD-A-SOURCE.md`](docs/ADD-A-SOURCE.md)：写 fetcher → 接进主流程 → 跑一次验证。

## 设计原则

1. **多源降级**：任一源失败，其余照常输出，失败项写入 `errors`；
2. **缺失即不显示**：拿不到就是 null，绝不估算、绝不编造；
3. **可维护优先于聪明**：每个源独立文件，改版只改那一个；
4. **零密钥**：全公开接口，clone 下来直接能跑；
5. **静态优先**：页面是自包含 HTML，五年后仍能打开；
6. **只存事实**：价格会变，只记录抓取时刻的数据。

## 免责声明

- 本项目为个人开源工具，**与任何游戏平台无隶属关系**；
- 游戏名称、商标归其各自权利人所有；
- 价格与活动实时变动，**以商店页面为准**；
- 因使用本项目产生的后果由使用者自行承担。

## 许可证

[MIT](LICENSE) © 2026 YunDaiShu

## Roadmap

- [x] 限时免费专列（仅限免，永久免费不收录）
- [x] 促销倒计时 / 中文标识 / 新史低 / 在线人数
- [x] Epic、GOG 数据源
- [ ] 快照契约测试（站点改版时 CI 立刻报红）
- [ ] 发帖文案生成器（今日史低｜这 5 款…）
- [ ] 主机平台：仅聚合官方促销公告，不做逐款抓取


## Steam 风格详情页（/detail/）

一个用 React + Tailwind 构建的独立详情页，随主站同一次 GitHub Pages 部署（产物在 `docs/detail/`，源码在仓库 `web-detail-src/`）。

- 入口：`/detail/?key=<source>:<id>`，例如 `/detail/?key=steam:1245620`（不带 key 时取榜单第一条）
- 数据来源：`docs/latest.json`（实时榜单 + `series` 价格/在线序列）与 `docs/search-index.json`（全量索引，含历史与 App Store 池）
- **字段缺失一律显示「—」**，不估算；该条目只在索引里时会提示「今日未在榜」
- 真实展示：价格 / 原价 / 折扣 / 史低 / 在线人数 / 标签 / 中文支持 / 促销倒计时（逐秒）/ 价格历史表 / 相似游戏（按真实标签匹配）
- Steam 额外字段：开发商、发行商、发行日期、简介、媒体评分（来自 `appdetails`）
- **玩家评价不展示**：各平台均无公开评论接口，故本页明确说明而不使用示例数据
- 搜索浮层使用同一份 `search-index.json`（当前索引约 130+ 条，随每日抓取增长）

> 说明：搜索匹配的是**展示名**（国区为中文名），暂无英文别名索引。

