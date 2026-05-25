# Aero-Hub — Explore the Sky, Decipher the Craft

全球航班价格搜索与航空极客数据控制台。v5.11

## 功能

- **FMC 玻璃驾驶舱搜索** — 全球航线矩阵，单程/往返，多舱位（经济/超值经济/商务/头等），联盟偏好筛选
- **智能结果展示** — PC 端 8 列表格（航司/起降时间/飞行时长/中转详情/机型/价格/收藏/更多信息），移动端自适应卡片
- **跨天到达标记** — 长途航班到达日期 `+1` / `+n` 橙色标签
- **中转航班独立选型** — 每段独立机型（窄体衔接+宽体长程），逐段飞行时长合理推算
- **飞友档案面板** — 三栏 Tab（飞行数据/座舱图/航线轨迹），机型实拍图、座舱检查器、硬件博物馆、航司联盟徽标
- **3D 互动地球** — 大圆航线轨迹可视化，多段航程 Globe.gl/Three.js，懒加载
- **航司归属逻辑** — 航司仅运营涉及本国的航线，中转枢纽为本国机场，绕路比 >2x 过滤
- **真实机队映射** — 45 家航司 × 14 种机型，基于 planespotters.net 数据，266 组精确映射
- **航空器实拍图库** — Wikimedia Commons 高清图片，按航司×机型分类存储
- **价格追踪** — 本地收藏航线价格监控，趋势变化提示
- **浅深色自适应** — `prefers-color-scheme` 自动切换，纯 CSS 变量驱动
- **PWA 离线支持** — 可安装到桌面，Service Worker 缓存（network-first for JS）

## 技术栈

| 层 | 技术 |
|------|------|
| 后端 | Python / Flask |
| 数据采集 | Playwright + Google Flights |
| 前端 | 原生 ES Module JS（状态驱动 SPA，无构建工具） |
| 可视化 | Chart.js + Globe.gl (Three.js) |
| 主题 | CSS 变量 + `prefers-color-scheme` 媒体查询 |
| E2E 测试 | Playwright (Python) |

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动服务
python server.py
# → http://localhost:5088
```

## 项目结构

```
├── server.py                  # Flask 后端 + API + 埋点
├── scraper.py                 # Google Flights Playwright 采集器
├── build_fleet_library.py     # 机队图片库构建器（45航司×14机型）
├── sync_aircraft_images.py    # 图片清单同步脚本
├── requirements.txt
├── templates/
│   └── index.html             # SPA 三视图入口
├── static/
│   ├── icon.svg               # PWA 图标
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                  # Service Worker
│   ├── css/
│   │   └── style.css          # 全局样式（~4848 行）
│   ├── js/
│   │   ├── app.js             # 应用入口 + Splash + 视图路由
│   │   ├── state.js           # 全局状态管理
│   │   ├── search-page.js     # 搜索页（自动补全 + 表单验证）
│   │   ├── results-page.js    # 结果页（筛选/排序/渲染/往返选择）
│   │   ├── flight-card.js     # 航班卡片组件（PC + 移动端）
│   │   ├── flight-profile.js  # 飞友档案面板（3D地球/座舱/实拍图）
│   │   ├── flightService.js   # 数据层（模拟航班 + API适配）
│   │   ├── api.js             # API 请求适配层
│   │   ├── utils.js           # 公共渲染辅助
│   │   ├── autocomplete.js    # 机场自动补全组件
│   │   ├── airports.js        # 153 条机场数据库
│   │   ├── analytics.js       # 隐私埋点
│   │   └── watchlist.js       # 价格追踪
│   └── images/
│       └── aircraft/          # 航司×机型图片库
│           ├── A388/          # 机型目录
│           │   ├── CA/        # 航司子目录
│           │   ├── EK/
│           │   └── ...
│           ├── B77W/
│           └── ... (14 机型)
├── tests/
│   └── e2e_test.py            # Playwright E2E 测试（7 项）
└── CONTEXT.md                 # 完整项目状态（v5.11）
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|---------|
| `FLASK_PORT` | 服务端口 | `5088` |
| `FLASK_DEBUG` | 调试模式 | `false` |

## 版本历史

| 版本 | 日期 | 关键变更 |
|------|------|---------|
| v5.11 | 2026-05-25 | 移动端排版重构 + PC列宽调优 + 操作列拆分（收藏/更多信息） + Cloudflare 隧道 |
| v5.10 | 2026-05-25 | 搜索质量：时间跨天/独立选型/分钟规范化/时长推算/联盟排序 |
| v5.9 | 2026-05-25 | 航司归属全链路 + 中转扩展 + 机队验证 + 图片库完善 |
| v5.8 | 2026-05-24 | Playwright E2E + Splash 恢复 + 飞行时间格式修复 |
| v5.0 | 2026-05-24 | 真实飞机图片库 + PM审查全量修复 |
| v4.1 | 2026-05-23 | 往返查询 + History API + 移动端卡片 |
| v3.7 | 2026-05-22 | 座位检查器 + 硬件博物馆 + 多段 Globe |

详细版本记录见 [CONTEXT.md](./CONTEXT.md)。

## License

MIT
