# CONTEXT.md — Flight Price Explorer 项目状态

> 最后更新: 2026-05-23 (夜间自动开发会话 v3.0)
> 目的: 跨对话压缩保持项目上下文连续性

---

## 1. 核心数据流架构

```
搜索首页 (index.html)
  │  用户输入: 出发城市、到达城市、出发日期、往返/单程
  │  自动补全: airports.js (CODE_MAP)
  ▼
AppState.setSearchParams()   ───  state.js (单例全局状态)
  │  设置 origin, dest, originalSearchDate, currentFocusDate, tripType
  ▼
结果页渲染 (results-page.js)
  │
  ├─ 单日航班: fetchPrices() → api.js → flightService.js.getFlights()
  │     └─ ENABLE_REAL_API = false → generateMockFlightAPIResponse()
  │        生成符合 FlightAPI.io 格式的高仿真模拟数据
  │        【v3】每航班注入 geek 对象 (注册号/机龄/涂装/发动机/遥测/历史日志/多舱位)
  │
  └─ 趋势面板 (懒加载): fetchDateRange() → api.js → flightService.js.getDateRange()
        └─ 循环调用 getFlights() N 次，聚合为 { results: [{date, lowest, offers, best, geek}, ...] }
```

**关键开关**: `flightService.js` 中 `ENABLE_REAL_API = false`

---

## 2. 双日期状态模型 (Dual-Date Model)

定义在 `static/js/state.js` — AppState 单例:

```
originalSearchDate   ← 用户首次搜索时输入的日期。**永远不变**。
                       趋势图 X 轴始终以此为起点。

currentFocusDate     ← 用户当前正在浏览的单日航班日期。
                       点击趋势图日期格时更新。
                       默认 = originalSearchDate。

departDate           ← currentFocusDate 的便捷别名，始终保持同步。
```

**关键规则**:
- 趋势图的 X 轴永远从 `originalSearchDate` 开始
- 点击趋势图日期格 **绝不** 重新获取趋势数据
- 点击趋势图日期格 **绝不** 销毁/重建 Chart.js 实例
- 只通过 `trendChart.update('none')` 做轻量级高亮点更新

---

## 3. 战略定位 — 飞友极客面板 v3.0

**放弃商业化订票/支付/值机流程**，转向航空爱好者专属极客探索平台。

### 3.1 飞行器深度档案面板 (flight-profile.js v3, ~648 行)

点击 "飞行器深度档案" 按钮 → 右侧滑出 **640px** 玻璃面板，包含：

1. **档案头部**: 飞机注册号、精确型号、航司、特殊涂装徽章
2. **多舱位 SeatGuru 级客舱座舱图**:
   - 按机型自动生成多舱位分段布局
   - 宽体机: 公务舱 (1-2-1, Row 1-4) → 超级经济舱 (2-3-2, Row 5-8) → 经济舱 (3-3-3, Row 9+)
   - 窄体机: 公务舱 (2-2, Row 1-3) → 经济舱 (3-3, Row 4+)
   - 舱位分隔横幅 (紫色公务/蓝色超经/灰色经济)
   - 4 级座位色彩编码 (绿/黄/红/白)
   - 纯 HTML `<button>` + CSS Grid，零 ASCII 字符
   - 红色无窗靠窗座带脉冲动画警示
3. **客舱音量降噪雷达**:
   - 按舱位差异化噪声基线: 公务 58dB / 超经 64dB / 经济 70dB
   - 前排 (62dB) → 翼根 (78dB) → 尾排 (83dB)
   - 可视化 dB 进度条 + ANC 降噪建议
4. **3D 粒子线框旋转地球 (纯 Canvas 正射投影, 零 Three.js)**:
   - 星空粒子背景 (80 颗固定种子星点)
   - 球体径向渐变光晕
   - 纬度圈 (每 30°) + 经线 (每 30°) 线框网格
   - 6 大洲多边形轮廓 (欧亚/非洲/北美/南美/澳洲/东亚)
   - 城市标记点 (PEK 北京/SYD 悉尼 绿色高亮)
   - 大圆航线弧线 (虚线底色 + 亮色已飞段带 shadowBlur)
   - 三角飞机图标沿弧线动画飞行 + 8 粒子尾迹
   - 旋转动画 (Y 轴 0.3°/帧) + 尾迹相位动画
   - 底部标注: 急流信息 + ETOPS 180min 安全圈
5. **飞行遥测大盘**: 巡航高度/速度/风况/飞行时间
6. **历史飞行日志**: 该注册号近期 3 条执飞记录

### 3.2 核心 3D 地球渲染函数

| 函数 | 职责 |
|------|------|
| `latLngTo3D(lat, lng, r)` | 经纬度 → 球面 3D 笛卡尔坐标 |
| `rotateY(p, angle)` | Y 轴旋转矩阵 (驱动地球自转) |
| `project(p, cx, cy)` | 正射投影 → 2D Canvas 坐标 (z≥0 可见性裁剪) |
| `greatCirclePoints(lat1, lng1, lat2, lng2, steps)` | 球面线性插值生成大圆航线点集 |
| `_startGlobeAnimation(canvas, origin, dest)` | 主动画循环: 星空→球体→大陆→城市→弧线→飞机→尾迹 |

### 3.3 多舱位配置系统

`_getAcInfo(acCode)` 返回 `cabins[]` 数组:

| 舱位 | cls | 宽体布局 | 窄体布局 | 噪声基线 |
|------|-----|----------|----------|----------|
| 公务舱 | `business` | 1-2-1, Row 1-4 | 2-2, Row 1-3 | 58dB |
| 超级经济舱 | `premium` | 2-3-2, Row 5-8 | — | 64dB |
| 经济舱 | `economy` | 3-3-3, Row 9+ | 3-3, Row 4+ | 70dB |

`_buildCabinSeatsHTML(seats, cols)` 按舱位分段渲染独立 CSS Grid，段间插入 `.fp-cabin-divider` 分隔横幅。

### 3.4 极客数据注入 (flightService.js)

`adaptFlightAPIResponse()` 为每条航班注入 `geek` 对象：

| 字段 | 说明 | 示例 |
|------|------|------|
| `registration` | 飞机注册号/机尾号 | B-1083, JA801J |
| `exactModel` | 精确机型全称 | 空客 A350-900 |
| `modelCode` | 型号代号 | A350-941 |
| `manufacturer` | 制造商 | 空客 |
| `aircraftAge` | 机龄 | 2.4年 |
| `ageLabel` | 机龄标签 | 次新机 |
| `liveryName` | 涂装名称 | "墨镜侠"标准涂装 |
| `liveryType` | 涂装类型 | standard/special |
| `engines` | 发动机规格 | 2x Rolls-Royce Trent XWB-84 |
| `seatCount` | 座位数 | 300 |
| `seatLayout` | 座位布局 | [3,3,3] |
| `seatRows` | 座位排数 | 34 |
| `cabins` | 多舱位配置 | [{cls, name, rowStart, rowEnd, layout, noiseBase}] |
| `telemetry` | 遥测数据 | { altitude, mach, groundSpeed, headwind, estFlightTime } |
| `recentLogs` | 历史日志 | [{ date, from, to, flightNo, duration }] |

**数据库**:
- `AIRCRAFT_DB`: 18 种机型精确档案
- `ENGINE_DB`: 16 种发动机精准匹配
- `LIVERY_POOL`: 12 家航司涂装池 (80/20 标准/特殊)

---

## 4. 交互特性清单

### 4.1 图表十字准星线 (results-page.js)
- 自定义 Chart.js `crosshairPlugin`: 垂直虚线跟随鼠标 + 交点蓝点
- 轴触发模式 (`mode: 'index', intersect: false`)
- Tooltip: `5月23日 (周五) | 最低价: ¥12,345`

### 4.2 30 天横向滚动卡片 + 双向联动
- 图表点击 → 卡片自动 `scrollIntoView` 居中 + 高亮
- 卡片点击 → 图表高亮同步 + 单日航班刷新
- 水平滑动容器 `overflow-x: auto; scroll-behavior: smooth`

---

## 5. 设计系统速查

| Token | 值 | 用途 |
|---|---|---|
| --primary | #2563eb | 主色调 |
| --radius | 16px | 卡片圆角 |
| --shadow-card | 0 1px 3px + 0 6px 16px | 卡片阴影 |
| --accent-mint | #d1fae5 | 最低价/优质座高亮 |
| Panel width | 640px | 飞友档案面板宽度 |

---

## 6. 关键文件索引

| 文件 | 职责 |
|------|------|
| `static/js/state.js` | AppState 单例，双日期模型 |
| `static/js/flightService.js` | 数据层 + 极客数据注入 (~750 行) |
| `static/js/flight-profile.js` | **飞友档案面板 v3** (~648 行，含 3D 地球渲染引擎) |
| `static/js/results-page.js` | 结果页 + 趋势图 + 十字准星 + 横向卡片 |
| `static/js/flight-card.js` | 航班行渲染 (按钮→飞行器深度档案) |
| `static/js/app.js` | 入口 (含 initFlightProfile) |
| `static/js/utils.js` | 公共渲染辅助 |
| `static/css/style.css` | 全局样式 (~2259 行，含 globe/多舱位/噪声雷达) |
| `templates/index.html` | SPA 双视图 HTML |
| `server.py` | Flask 静态服务器 (端口 5088) |
| `MORNING_REPORT.md` | 每日开发晨报 |
