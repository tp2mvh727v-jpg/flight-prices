# CONTEXT.md — Flight Price Explorer 项目状态

> 最后更新: 2026-05-23 (v3.7 史诗更新)
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
  │        【v3.7】segments 数组携带每段 origin/destination IATA 代码
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

## 3. 战略定位 — 飞友极客面板 v3.7

**放弃商业化订票/支付/值机流程**，转向航空爱好者专属极客探索平台。

### 3.1 飞行器深度档案面板 (flight-profile.js v3.7, ~1058 行)

点击 "飞行器深度档案" 按钮 → 右侧滑出 **640px** 玻璃面板，包含：

1. **档案头部**: 飞机注册号、精确型号、航司、特殊涂装徽章
2. **多舱位 SeatGuru 级客舱座舱图**:
   - 按机型自动生成多舱位分段布局
   - A380/B748 双甲板 (一楼/二楼) 动态选项卡切换
   - 真实航空列映射: 宽体商务 1-2-1 (A-D,G-K), 窄体商务 2-2 (A,C-D,F)
   - 每个舱位 (含首个) 均显示 Title Banner 分隔徽章
   - 4 级座位色彩编码 (绿/黄/红/白)
   - 纯 HTML `<button>` + CSS Grid，零 ASCII 字符
3. **座位硬件解密弹窗 (Seat Inspector Modal)**:
   - 毛玻璃 backdrop-filter: blur(16px) 弹出卡片
   - 飞友幽默点评: 根据座位品质动态注入中文锐评
   - 座椅硬件微型博物馆: 按舱位等级展示座椅型号、间距、宽度、后仰角度
   - 纯 CSS 座椅侧面剪影比例简图
   - 客舱音量降噪雷达 (保留)
4. **3D 互动地球 (Globe.gl WebGL)**:
   - 动态大圆航线: 从航班数据提取真实起降 IATA 代码
   - 中转航班多段弧线: PEK → DXB → LHR 绘制 2 条弧线
   - 中转机场橙色标签 + 橙色脉冲光环
   - 50 机场本地坐标字典 + CDN 动态回退 (mwgg/Airports)
   - Globe.gl 自动旋转 + 拖拽 + 缩放 + POV 自动聚焦
5. **飞行遥测大盘**: 巡航高度/速度/风况/飞行时间
6. **历史飞行日志**: 该注册号近期 3 条执飞记录

### 3.2 核心功能函数索引

| 函数 | 职责 |
|------|------|
| `_getAcInfo(acCode)` | 机型→多舱位/双甲板配置 |
| `generateSeatMap(acCode)` | 生成完整座位矩阵 + 噪声数据 |
| `_buildSeatExplorer(seatMap)` | 渲染座舱图 HTML (含 inspector 容器) |
| `_getAvgeekCommentary(quality, cabinClass)` | 飞友幽默点评生成 |
| `_getHardwareKey(cabinClass, acCode)` | 舱位→硬件规格键值 |
| `_populateHardwareSection(cabinClass, acCode)` | 填充硬件博物馆 |
| `_buildSeatProfileHTML(profile)` | CSS 座椅剪影 HTML |
| `_initGlobe3D(el, originIATA, ...)` | 单段直飞 Globe.gl 初始化 |
| `_initMultiSegmentGlobe3D(el, flight, allCoords)` | 多段中转 Globe.gl 初始化 |
| `_lookupCoordsAsync(iata)` | 机场坐标查询 (本地 + CDN 回退) |
| `_resolveAllCoordsAsync(flight)` | 批量异步坐标解析 |
| `_initGlobeAsync(container, flight)` | 异步 Globe 启动入口 |
| `_fetchAirportDatabase()` | CDN 机场数据库单例获取 |

### 3.3 座椅硬件规格矩阵 (HARDWARE_SPECS)

| 舱位 | 代号 | 间距 | 宽度 | 后仰 |
|------|------|------|------|------|
| 头等 | The Suite 豪华全封闭套房 | 82" (208cm) | 22.5" | 180° 全平躺 |
| 宽体商务 | Reverse Herringbone 1-2-1 反鱼骨 | 45" (114cm) | 21" | 180° 全平躺 |
| 窄体商务 | Regional Recliner 2-2 大板凳 | 38" (96cm) | 20" | 125° |
| 超级经济 | Premium Comfort 舒适超经 | 38" (96cm) | 19" | 120° |
| 经济 | Standard Slimline 标配 | 31-32" (79cm) | 17.5" | 110° |

### 3.4 机场坐标系统

- **本地字典**: `AIRPORT_COORDS` — 50 个常用 IATA → [lat, lng]
- **CDN 回退**: `_fetchAirportDatabase()` → `cdn.jsdelivr.net/gh/mwgg/Airports@master/airports.json`
  - 单次会话仅 fetch 一次 (模块级 `_airportDbPromise` 单例)
  - 命中后缓存至 `AIRPORT_COORDS` 字典
  - 失败自动重置 promise 以允许重试

### 3.5 极客数据注入 (flightService.js)

`adaptFlightAPIResponse()` 为每条航班注入 `geek` 对象 + `segments[]` 数组:

| 字段 | 说明 | 示例 |
|------|------|------|
| `segments[].origin` | 段起飞机场 IATA | PEK |
| `segments[].destination` | 段到达机场 IATA | DXB |
| `segments[].aircraft` | 段执飞机型 | B789 |
| `segments[].flight_no` | 段航班号 | 173 |
| `geek.registration` | 飞机注册号/机尾号 | B-1083 |
| `geek.exactModel` | 精确机型全称 | 空客 A350-900 |
| `geek.telemetry` | 遥测数据 | { altitude, mach, ... } |
| `geek.recentLogs` | 历史日志 | [{ date, from, to, flightNo, duration }] |

---

## 4. 交互特性清单

### 4.1 图表十字准星线 (results-page.js)
- 自定义 Chart.js `crosshairPlugin`: 垂直虚线跟随鼠标 + 交点蓝点
- 轴触发模式 (`mode: 'index', intersect: false`)

### 4.2 30 天横向滚动卡片 + 双向联动
- 图表点击 → 卡片自动 `scrollIntoView` 居中 + 高亮
- 卡片点击 → 图表高亮同步 + 单日航班刷新

### 4.3 座位硬件解密弹窗 (v3.7 新增)
- 点击座位 → 毛玻璃卡片滑出 + 飞友点评 + 硬件参数 + CSS 剪影 + 噪声雷达
- 点击网格空白 → 弹窗收起

### 4.4 多段中转 3D 地球 (v3.7 新增)
- 直飞: 单条绿色弧线 + 两端绿标 + 绿光环
- 中转: 多条绿色弧线 + 中转站橙标 + 橙光环
- POV 自动框选所有航点

---

## 5. 设计系统速查

| Token | 值 | 用途 |
|---|---|---|
| --primary | #2563eb | 主色调 |
| --radius | 16px | 卡片圆角 |
| --shadow-card | 0 1px 3px + 0 6px 16px | 卡片阴影 |
| --accent-mint | #d1fae5 | 最低价/优质座高亮 |
| Panel width | 640px | 飞友档案面板宽度 |
| Globe arc color | #10b981 | 航线弧线荧光绿 |
| Globe layover color | #f59e0b | 中转机场橙色 |

---

## 6. 关键文件索引

| 文件 | 职责 |
|------|------|
| `static/js/state.js` | AppState 单例，双日期模型 |
| `static/js/flightService.js` | 数据层 + 极客数据注入 + segments (~750 行) |
| `static/js/flight-profile.js` | **飞友档案面板 v3.7** (~1058 行) |
| `static/js/results-page.js` | 结果页 + 趋势图 + 十字准星 + 横向卡片 |
| `static/js/flight-card.js` | 航班行渲染 (按钮→飞行器深度档案) |
| `static/js/app.js` | 入口 (含 initFlightProfile) |
| `static/js/utils.js` | 公共渲染辅助 |
| `static/css/style.css` | 全局样式 (~2460 行) |
| `templates/index.html` | SPA 双视图 HTML + Globe.gl CDN |
| `server.py` | Flask 静态服务器 (端口 5088) |
| `MORNING_REPORT.md` | 每日开发晨报 |
