# Aero-Hub — Explore the Sky, Decipher the Craft

全球航班价格搜索与航空极客数据控制台。

## 功能

- **FMC 航班搜索** — 全球航线矩阵查询，支持单程/往返、多舱位（经济/超值经济/商务/头等）、航司偏好筛选
- **3D 互动地球** — 大圆航线轨迹可视化，多段航程展示，基于 Globe.gl/Three.js
- **飞友档案面板** — 机型数据、座舱图、航司联盟徽标、飞行里程计算
- **价格追踪** — 本地收藏航线价格监控，趋势变化提示
- **浅深色自适应** — `prefers-color-scheme` 自动切换浅色/深色主题
- **PWA 离线支持** — 可安装到桌面，Service Worker 缓存

## 技术栈

| 层 | 技术 |
|------|------|
| 后端 | Python / Flask |
| 数据采集 | Playwright + Google Flights |
| 前端 | 原生 ES Module JS（状态驱动 SPA） |
| 可视化 | Chart.js + Globe.gl (Three.js) |
| E2E 测试 | Playwright (Python) |

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动服务
python server.py

# 3. 浏览器打开
# http://localhost:5088
```

## 项目结构

```
├── server.py              # Flask 后端 + API
├── scraper.py             # Google Flights 数据采集
├── templates/
│   └── index.html         # 单页应用入口
├── static/
│   ├── css/style.css      # 全局样式
│   └── js/
│       ├── app.js          # 应用入口 + 路由
│       ├── state.js        # 全局状态管理
│       ├── search-page.js  # 搜索页 (自动补全 + 表单验证)
│       ├── results-page.js # 结果页 (筛选/排序/渲染)
│       ├── flight-card.js  # 航班卡片组件
│       ├── flight-profile.js # 飞友档案面板 (3D地球/座舱图)
│       ├── autocomplete.js # 机场自动补全组件
│       ├── airports.js     # 机场数据库
│       └── watchlist.js    # 价格追踪
└── tests/
    └── e2e_test.py         # Playwright E2E 测试
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|---------|
| `FLASK_PORT` | 服务端口 | `5088` |
| `FLASK_DEBUG` | 调试模式 | `false` |

## License

MIT
