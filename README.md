# 游戏价格雷达 · game-price-radar

抓取各平台**官方公开接口**，生成每日价格表 + 静态页，用于「史低/折扣情报」内容生产。
零 API key，clone 下来直接跑。

## 数据来源（全部公开、无需登录）

| 源 | 用途 | 状态 |
|---|---|---|
| Steam `appdetails` | 指定游戏的当前价 / 原价 / 折扣 | ✅ 可用 |
| Steam `featuredcategories` | 当前特惠列表（自动，不用维护名单） | ✅ 可用 |
| Apple `iTunes Search` | 付费手游当前售价 | ⚠️ 仅付费游戏有意义（免费游戏无折扣概念） |
| TapTap | — | ❌ 不抓（无公开接口，且存在平台风险） |
| 主机（PS/Xbox/Switch） | — | ❌ 暂不抓（无公开合法接口，或 ToS 不明确） |

## 快速开始

```bash
node src/index.mjs
```

产物：

- `data/latest.json` —— 最新一次结果（含 `errors`）
- `data/history/YYYY-MM-DD.json` —— 按日快照，可做历史价格曲线
- `docs/index.html` —— 自包含静态页（无框架、无 CDN，GitHub Pages 直接从这里发布）

## 监控名单

编辑 `data/watchlist.json`：

```json
{
  "steam": [730, 1245620],
  "appstore": ["原神", "星露谷物语"]
}
```

## 自动化

`.github/workflows/daily.yml` 每天 UTC 00:10（北京 08:10）跑一次，自动提交快照并更新页面；
失败会自动开 issue。也可在 Actions 页面手动触发。

## 维护

加新平台见 [docs/ADD-A-SOURCE.md](docs/ADD-A-SOURCE.md)。每个源一个文件，单源失效不影响整站。

## 许可与合规

- 代码：MIT（见 LICENSE）
- 数据：仅收录价格、名称、折扣、时间戳等**事实性数据**，不含简介/图片/评测等版权内容
- 请遵守各平台 ToS 与 `robots.txt`；本项目不做高频轮询，也不绕过任何访问限制
- 价格会变，以商店页面为准
