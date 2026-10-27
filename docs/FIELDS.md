# 字段字典（数据模型）

快照文件：`data/latest.json` 与 `data/history/YYYY-MM-DD.json`。
**所有缺失字段一律为 null / [] / unknown，禁止 undefined，禁止估算值。**

## 顶层结构

| 字段 | 类型 | 含义 |
|---|---|---|
| `generated_at` | string(ISO 8601 UTC) | 抓取时刻（UTC） |
| `generated_at_bj` | string | 同一时刻的北京时间（UTC+8），仅用于展示 |
| `timezone_display` | string | 展示时区基准，固定 `Asia/Shanghai (UTC+8)` |
| `region` | string | 区服，固定 `CN` |
| `counts` | object | `{ total, limited_free, new_low, failed }` |
| `by_source` | object | 各来源在榜条数 |
| `items` | array | 条目列表（见下表） |
| `errors` | array | 抓取失败项 `{ source, target, error }` |

## 条目字段

| 字段 | 类型 | 含义 | 缺失时 |
|---|---|---|---|
| `source` | string | 来源标识：steam / steam-specials / epic / gog / appstore | 必有 |
| `id` | string | 该来源内唯一 ID（去重键 = source:id） | 必有 |
| `name` | string | 名称 | 必有 |
| `price` | number 或 null | 当前价 | 页面显示 — |
| `initial` | number 或 null | 原价 | 不显示划线价 |
| `cut` | number | 折扣百分比（整数） | 显示 — |
| `currency` | string | 币种（CNY / USD） | 默认 CNY |
| `url` | string | 商店页链接 | 必有 |
| `promo_start` | string(ISO) 或 null | 促销开始时间 | 显示「未公布」 |
| `promo_end` | string(ISO) 或 null | 促销结束时间 | 显示「未公布」 |
| `tags` | string[] | 标签（Epic 恒为空；Steam 为官方分类而非用户标签） | 该列不显示内容 |
| `supports_zh` | true / false / unknown | 是否支持中文 | 不显示徽章 |
| `lowest_price` | number 或 null | 历史窗口内最低价（仅 CNY 条目参与） | 显示「历史不足」 |
| `is_new_low` | true / false / null | 是否刷新史低；首次观察为 null | 不打标 |
| `players_online` | number 或 null | 当前在线人数（仅 Steam） | 显示 — |
| `free_kind` | limited / permanent / null | 免费类型；**permanent 条目会被过滤，不进入任何产物** | 正常付费条目 |

## 计算字段（不落库）

| 字段 | 计算方式 |
|---|---|
| 倒计时（promo_left） | 页面 JS 用 `Date.now()` 与 `promo_end` 现算，不写入快照 |

## 各来源字段覆盖

| 字段 | Steam | Epic | GOG | App Store |
|---|---|---|---|---|
| `promo_start` | 无 | 有 | 无 | 无 |
| `promo_end` | 有（仅特惠源） | 有 | 无 | 无 |
| `tags` | 仅官方分类 | 官方目录不可得 | 有 | 无 |
| `supports_zh` | 有 | 无 | 无 | 无 |
| `lowest_price` / `is_new_low` | 有（CNY） | 无（USD 不参与） | 有 | 有 |
| `players_online` | 有 | 无 | 无 | 无 |
| `free_kind` | 仅永久免费可判 | 限免/永久 | 按价格推断 | 曾付费→限免 |

> SteamPY（匹歪）：站点为纯 SPA，无公开接口，默认不产出条目；若通过 `STEAMPY_API_URL` 注入自有端点，
> 字段按本表同一套规则归一（缺字段一律 null / [] / unknown），链接经 `absoluteUrl()` + `isValidHttpUrl()` 双重校验。
