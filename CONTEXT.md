# CONTEXT.md — Aero-Hub 项目状态

> 最后更新: 2026-05-28 (v5.18 体验打磨 — loading反馈 + tooltip增强 + 移动端触控 + E2E修复)

---

## 0. 版本演进

| 版本 | 日期 | 关键变更 |
|------|------|---------|
| v3.7 | 2026-05-22 | 座位检查器 + 硬件博物馆 + 多段Globe + CDN回退 + 首舱横幅 |
| v4.0 | 2026-05-23 | 三视图SPA + Splash + FMC控制台 + 飞友档案面板 |
| v4.1 | 2026-05-23 | 往返查询 + History API路由 + 移动端卡片布局 |
| v4.2 | 2026-05-24 | prefers-color-scheme浅深自适应 + 深色对比度修复 |
| v4.3 | 2026-05-24 | 骨架屏加载 + PWA离线支持 + 隐私埋点分析 |
| v4.4 | 2026-05-24 | 28项PM审查全量修复 — 严重3/高8/中9/低4 + LAN多设备访问 |
| v4.5 | 2026-05-24 | 飞机3D示意图 (Three.js) + 航班号修复 |
| v5.0 | 2026-05-24 | 真实飞机图片库 (Wiki Commons) + PM审查第二轮 (严重7/高12全量修复) |
| v5.1 | 2026-05-24 | PM审查第三轮 — 高6/中10/低6全量修复 |
| v5.2 | 2026-05-24 | 机队图片库扩增 — 19航司×14机型按航司精准分类 + 自动化构建脚本 |
| v5.3 | 2026-05-24 | 真实机队映射 — 基于planespotters.net数据，45家航司(含非洲/美洲/亚太非主航司)，仅搜索真实运营机型 |
| v5.4 | 2026-05-24 | 三栏Tab面板(飞行数据/座舱图/航线轨迹) + 航空联盟徽标 + Globe懒加载 |
| v5.5 | 2026-05-24 | 无效航司机型目录清理(158个) + 移除_generic回退 + AIRCRAFT_IMAGES精简 |
| v5.6 | 2026-05-24 | scraper.py机型映射修正 — AIRLINE_WIDEBODY/NARROWBODY真实机队 + 修复A332错配 |
| v5.6.1 | 2026-05-24 | 无人值守6Bug修复 + AIRCRAFT_IMAGES自动同步 + SW缓存策略升级 + UI打磨 |
| v5.6.2 | 2026-05-24 | 窄体机航程验证(80%安全余量) + 多段机型差异化展示 + 飞友档案面板扩展至800px |
| v5.6.3 | 2026-05-24 | 宽体机航程限制(技术经停) + 飞行里程面板(大圆距离+航程利用率) + A388高清图替换(QR/BA/NH) |
| v5.6.4 | 2026-05-24 | 机队数据库审计修复(4项) + 多段机型分开展示 + 面板布局优化 + 里程颜色变量修复 |
| v5.6.5 | 2026-05-24 | flight-profile.js智能引号瘫痪+autocomplete.js双重Bug修复 — 搜索页完全恢复可交互 |
| v5.6.6 | 2026-05-24 | 机队数据库修正 — scraper.py 9项修复 + server.py国际航线过滤 + flightService.js 8项修复 |
| v5.7 | 2026-05-24 | 航空器识别模块排版重构 — 三行布局(航班号/实拍图/机型+注册号) + 多段独立Tab面板 |
| v5.7.1 | 2026-05-24 | 飞行里程模块修复 — CSS变量统一 + AIRCRAFT_DB添加rangeKm + 段级distance_km数据填充 |
| v5.7.2 | 2026-05-24 | 座舱图布局修复 — refColumns对齐 + colLetters推导修正 + 列轨道统一 |
| v5.8 | 2026-05-24 | Playwright E2E测试套件 — 7项测试全通过，零JS报错 |
| v5.8.1 | 2026-05-24 | Splash欢迎页恢复 + SW缓存策略修复(cacheFirst→networkFirst for CSS) + 版本号统一v5.8 |
| v5.8.2 | 2026-05-24 | 座舱图布局修复(A380/B748下舱补齐商务/超经) + 航程距离精度修复(PEK坐标+A388/A20N/B788/B739/A35K航程值+NARROWBODY_SAFE_RANGE) |
| v5.8.3 | 2026-05-24 | 浅色主题FMC搜索页对比度修复(面板/标签/输入框) + 航空器识别航班号自适应主题色 + 飞行里程Haversine大圆距离(70+机场,中转分段计算) |
| v5.8.4 | 2026-05-24 | 模拟航线精细化 — FIXED_AIRCRAFT_ROUTES(~70条标志性航线固定航司/航班/机型) + _DIRECT_PAIRS(中国出发国际直飞机场对约束) + 非直飞航线强制中转 + 智能中转枢纽选择 |
| v5.8.5 | 2026-05-25 | 航班号双重航司前缀修复(utils.js segLabel防CACA981/SQSQ24) + 航空器识别面板补齐(981→CA981) |
| v5.8.6 | 2026-05-25 | 飞行时间显示格式修复 — _generateTelemetry小数小时(10.5h)→小时+分钟(10h30m) + PM/美术/技术三视角审查 |
| v5.8.7 | 2026-05-25 | 审查第一批修复 — WebGL泄漏+图片onerror CSP+筛选栏过期+暗色卡片对比度+日期焦点环+死代码清理+CDN统一 |
| v5.8.8 | 2026-05-25 | UX增强 — Globe骨架屏+趋势首屏展开+移动端搜索层级+档案拖拽横条 |
| v5.9 | 2026-05-25 | 航司归属全链路 — 航司仅运营涉及本国的航线 + 中转枢纽为本国机场 + 绕路比>2x过滤 |
| v5.10 | 2026-05-25 | 搜索质量优化 — 时间跨天+独立选型+分钟规范化+时长推算+联盟排序全修 |
|| v5.11 | 2026-05-25 | 移动端排版重构 + PC列宽调优 + 操作列拆分 + Cloudflare隧道 |
|| v5.12 | 2026-05-25 | OpenFlights 真实航线数据库集成(26,167条) + AirLabs中转航班注入 + 图片库增量下载 |
|| v5.13 | 2026-05-25 | 座位图修复 + 航司归属逻辑修正 + sync_aircraft_images 自动化 |
|| v5.14 | 2026-05-26 | 段级到达日期修复(seg1Minutes→let) + AirLabs 丰富化路由 |
|| v5.15 | 2026-05-27 | 真实航线锚定系统 — verified_routes.json (66条) + CA981机型修正 + AirLabs保护 |
|| v5.16 | 2026-05-27 | 移除 OpenSky ADS-B 实时航班模块 — 删除 server.py API 路由 + results-page.js 实时面板 + flight-profile.js Globe 叠加层 + CSS 样式 |
|| v5.17 | 2026-05-27 | 机型图片库全量规范化 — 统一命名(285文件) + 格式转换(5张) + 新下载(25组合) + 错配修正(2张) + 覆盖率76%→99% |
|| v5.18 | 2026-05-27 | 体验打磨 — search-loading过渡动画 + trend tooltip增强(星期+价格对比+最低价标记) + 移动端track-btn 40→44px + E2E Test 5骨架屏修复 + form submit加固 + 66条航线校验(0机型错配) + SW/href/cache triple-bump |
|| v5.19 | 2026-05-28 | 项目重构 — Python脚本整理到 scripts/{data,images,utils}/ 子目录 + server.py import 路径同步修正 + .gitignore 大体积文件排除(图片/缓存/数据) |

---

## 1. 三视图 SPA 架构

```
view-splash (active on load)       view-search              view-results
  │ 电影级欢迎页                      │ FMC 控制台              │ 结果页 + 趋势图
  │ Ken Burns 背景 + 粒子            │ 毛玻璃搜索卡片          │ 飞友档案面板
  │ "ENTER CONSOLE" 按钮             │ 智能机场联想            │ 3D Globe 地球
  │ "跳过" 快捷按钮 (v5.1)           │ 同城多机场内联提醒       │
  │                                  │ 最近搜索快捷按钮        │
  └─[click ENTER/Skip]── fadeOut+scale ──► showView('search')      │
                                         │                    │
                                         └─[submit form]──────► showView('results')
                                                                    │
                                         ◄──[修改搜索]──────────────┘
```

**关键规则**: Splash 只在首次加载时展示一次。从结果页返回直接进入搜索控制台，不重新播放 Splash。
**History API**: URL hash 路由 (`#search`, `#results?from=PEK&to=SYD&date=...`) 支持浏览器前进/后退/书签/刷新恢复。
**v5.1**: Splash 新增"跳过"按钮直达搜索；URL hash `#search?from=XXX&to=YYY` 回填自动补全字段；往返未完成导航守卫；视图切换保留 viewFadeIn 动画。

---

## 2. 核心数据流架构

```
搜索首页 (index.html)
  │  用户输入: 出发城市、到达城市、出发日期、往返/单程
  │  自动补全: airports.js (AIRPORT_DB → CODE_MAP, 153 条数据)
  │  v5.1: 同城多机场内联提醒 (选择时即时显示)
  ▼
AppState.setSearchParams()   ───  state.js (单例全局状态)
  │  设置 origin, dest, originalSearchDate, currentFocusDate, tripType
  │  selectedOutbound, selectedReturn 往返选择索引
  │  cityWarning 同城多机场提醒
  ▼
结果页渲染 (results-page.js)
  │
  ├─ 单日航班: fetchPrices() → api.js → flightService.js.getFlights()
  │     └─ ENABLE_REAL_API = false → generateMockFlightAPIResponse()
  │        每航班注入 geek 对象 (注册号/机龄/涂装/发动机/遥测/历史日志/多舱位)
  │        segments 数组携带每段 origin/destination IATA 代码
  │        **v4.4**: 支持 AbortController 取消进行中请求
  │        **v5.1**: 错误类型分类 (网络/服务器/超时) + 差异化提示
  │
  ├─ 返程航班: loadReturnDay() 异步加载返程数据 → returnData
  │     └─ 往返总价汇总栏: renderRoundtripBar() + bindRoundtripSelection()
  │
  └─ 趋势面板 (懒加载): fetchDateRange() → api.js → flightService.js.getDateRange()
        └─ **v4.4**: Promise.all 并行替代 for+await 串行，速度提升 N 倍
```

---

## 3. 双日期状态模型 + 往返扩展 (state.js)

```
originalSearchDate   ← 用户首次搜索时输入的日期。**永远不变**。
currentFocusDate     ← 用户当前正在浏览的单日航班日期。
departDate           ← currentFocusDate 的便捷别名。

tripType             ← 'oneway' | 'roundtrip'
returnDate           ← 返程日期 (仅 roundtrip)
selectedOutbound     ← 去程选中航班索引 (null = 未选)
selectedReturn       ← 返程选中航班索引 (null = 未选)
returnData           ← 返程日期的 fetchPrices 结果
getRoundtripTotal()  ← 计算去程+返程总价
isRoundtripComplete()← 两程均已选择
cityWarning          ← v4.4: 同城多机场提醒消息
```

---

## 4. 浅色/深色自适应主题系统

**策略**: 纯 CSS 变量驱动，零 JS 主题切换。通过 `@media (prefers-color-scheme: dark)` 自动适配。

```
:root {
  --bg: #f0f4f8;   --card: #ffffff;   --text: #1e293b;
  --aero-panel: rgba(255,255,255,0.78);
  --aero-accent: #0ea5e9;
  /* ... 全部 aero 令牌为浅色值 */
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a;  --card: #1e293b;  --text: #e2e8f0;
    --aero-panel: rgba(15,23,42,0.65);
    /* ... 全部 aero 令牌恢复深色赛博驾驶舱值 */
  }
}
```

**v5.1 深色对比度增强**: 飞友档案面板注册号颜色、分区边框发光、硬件区/座位剖面/噪音区边界强化、往返总价栏暗色优化。

---

## 5. 设计系统速查

| Token | 浅色值 | 深色值 | 用途 |
|-------|--------|--------|------|
| --bg | #f0f4f8 | #0f172a | 页面背景 |
| --card | #ffffff | #1e293b | 卡片背景 |
| --text | #1e293b | #e2e8f0 | 正文 |
| --border | #e8ecf1 | #334155 | 边框 |
| --primary | #38bdf8 | #38bdf8 | 主色调 |
| --primary-light | #eff6ff | #0c1929 | 选中高亮 |
| --aero-panel | rgba(255,255,255,0.78) | rgba(15,23,42,0.65) | 毛玻璃面板 |
| --aero-accent | #0ea5e9 | #38bdf8 | 电光蓝强调 |
| --radius | 16px | 16px | 卡片圆角 |
| Panel width | 640px | 640px | 飞友档案面板宽度 |

---

## 6. 已完成功能清单 (v5.1 = 原24项 + 22项新)

### 6.1 核心功能
| # | 功能 | 关键文件 | 版本 |
|---|------|---------|------|
| 1 | 往返查询 + 自由组合两程航班 + 总价汇总栏 | state.js, flight-card.js, results-page.js | v4.1 |
| 2 | History API 路由 (pushState/popstate/书签恢复) | app.js | v4.1 |
| 3 | 移动端竖版卡片布局 (@media ≤700px) | flight-card.js, style.css | v4.1 |
| 4 | prefers-color-scheme 浅深自适应主题 | style.css | v4.2 |
| 5 | 深色模式对比度修复 (选中态/档案面板) | style.css | v4.2 |

### 6.2 飞友档案面板
| # | 功能 | 关键函数 |
|---|------|---------|
| 6 | 座位检查器弹窗 (飞友幽默点评) | `_getAvgeekCommentary()`, `_buildSeatExplorer()` |
| 7 | 硬件微型博物馆 (5档座椅规格 + CSS剪影) | `HARDWARE_SPECS`, `_populateHardwareSection()` |
| 8 | 多航段地球弧线 (绿色直连/橙色中转) | `_initMultiSegmentGlobe3D()` |
| 9 | CDN 机场坐标回退 (mwgg/Airports) | `_fetchAirportDatabase()`, `_lookupCoordsAsync()` |
| 10 | 首个舱位标题横幅修复 | `_buildSeatExplorer()` si===0 分支 |

### 6.3 体验增强 (v4.3–v5.0)
| # | 功能 | 关键文件 |
|---|------|---------|
| 11 | UI 设计打磨 (玻璃态/HUD扫描线/呼吸光环/Morandi色板) | style.css |
| 12 | 骨架屏加载 (shimmer占位替换spinner) | style.css, results-page.js, flight-profile.js |
| 13 | PWA 离线支持 (manifest + Service Worker + 图标) | manifest.json, sw.js, icon.svg, app.js, server.py |
| 14 | 隐私埋点分析 (pageview/search/profile_open/roundtrip_complete) | analytics.js, app.js, state.js, flight-profile.js, server.py |
| 15 | 文档更新 | CONTEXT.md |
| 16 | Wikimedia Commons 真实飞机图片库 (15种机型) | flight-profile.js |
| 17 | 航班号规则修复 (国内4位/国际1-3位, scraper同步) | flightService.js, scraper.py |
| 18 | 乘客人数+舱位等级选择器 + 价格倍率 | index.html, state.js, search-page.js, api.js |
| 19 | 结果筛选排序 (直飞过滤 + 价格/时长/出发排序) | results-page.js, style.css |
| 20 | 往返选择流程引导 (STEP 1/2 标签 + 单选模式) | results-page.js, state.js |
| 21 | 结果页Header玻璃驾驶舱风格重设计 | style.css |
| 22 | prefers-reduced-motion 全站无障碍支持 | style.css |
| 23 | 搜索按钮脉冲动画移除 (降噪) | style.css |
| 24 | 移除3D飞机WebGL上下文冲突 (恢复Globe正常) | flight-profile.js, index.html |

### 6.4 v5.1 PM 审查第三轮全量修复 (22项)

#### 高优先级 (6/6)
| # | 修复 | 实现 |
|---|------|------|
| H1 | Splash→Search 过渡动画 | viewFadeIn keyframes (v4.4已有), verify active |
| H2 | URL hash 回填自动补全 | DOMContentLoaded 时解析 `#search?from=XX&to=YY` 预填 AppState |
| H3 | 自动补全无结果反馈 | "未找到匹配的机场" 消息 (v4.4已有) |
| H4 | 错误类型差异化 | `_classifyError()` — 网络/服务器/超时/未知 四类消息 |
| H5 | 同城多机场表单提醒 | `checkAndShowSameCityWarning()` — 选择机场时即时内联显示 |
| H6 | 往返未完成导航守卫 | 返回搜索前 confirm 确认 (back按钮 + navigate事件双重守卫) |

#### CSS 增强 (6/6)
| # | 修复 | 实现 |
|---|------|------|
| H7 | 模块化字体比例 | `--text-xs`→`--text-hero` 1.25 scale (v5.0已有) |
| H8 | 扫描线摩尔纹 | 3px间隔 + 降低透明度 (v5.0已有) |
| H9 | trendPulse 移除 | 移除无限动画, 改为 hover glow (v5.0已有) |
| H10 | 档案面板深色对比度 | 注册号亮色 + 分区边框发光 + spec-label/section 边界 |
| H11 | 平板断点 1024px | 搜索卡片/结果容器/统计网格/档案面板/表格列 适配 |
| H12 | --aero-label 对比度 | #64748b → #475569 (v5.0已有) |

#### 中优先级 (10/10)
| # | 修复 | 实现 |
|---|------|------|
| M1 | Splash 跳过按钮 | "跳过" 按钮 + CSS + 事件处理, 直达搜索 |
| M2 | 实时行内验证 | blur 事件验证 (v4.4已有) |
| M3 | 趋势面板过渡 | opacity transition (v4.4已有) |
| M4 | 埋点离线队列 | localStorage 暂存 + online 事件排空 |
| M5 | 最近搜索 | localStorage 5条 + 快捷芯片 (v4.4已有) |
| M6 | 清除按钮 | × 按钮 (v4.4已有) |
| M7 | 动画时长统一 | shimmer 1.5s 统一 |
| M8 | Ken Burns 速度 | 18s → 25s 更电影感 |
| M9 | 粒子纵深 | 远/中/近三层粒子 (大小/透明度/速度差异) |
| M10 | 下拉滚动重定位 | scroll/resize 事件 (v4.4已有) |

#### 低优先级 (6/6)
| # | 修复 | 实现 |
|---|------|------|
| L1 | :focus-visible 键盘环 | 全局 outline + offset, 鼠标点击无环 |
| L2 | Firefox 滚动条 | scrollbar-width: thin + scrollbar-color |
| L3 | will-change 性能提示 | splash-bg/splash-screen/fp-panel |
| L4 | 趋势箭头旋转过渡 | trend-open class → transform rotate(90deg) |
| L5 | 跳过内容链接 | .skip-to-content 键盘可访问性 |
| L6 | 座位检查器闪烁 | visibility: hidden + transition 延迟 |

### 6.5 v5.4 新增

| # | 功能 | 关键实现 |
|---|------|---------|
| 25 | 三栏Tab面板 (飞行数据/座舱图/航线轨迹) | `buildProfileHTML()` 重构, `.fp-tab-bar` / `.fp-tab-btn` / `.fp-tab-panel` CSS, Tab切换JS |
| 26 | 航空联盟徽标 (星空联盟/寰宇一家/天合联盟) | `ALLIANCES`, `AIRLINE_ALLIANCE`, `_allianceBadge()`, `.fp-alliance-badge` 及三色CSS |
| 27 | Globe WebGL 懒加载 | 仅首次切到"航线轨迹"Tab 时初始化 `_initGlobeAsync()` |
| 28 | 面板滚动重构 | `.fp-panel` overflow→hidden，`.fp-tab-content` 成为唯一滚动容器 |
| 29 | 联盟徽标深色模式 | Star Alliance #1a1a1a→#94a3b8, SkyTeam #0b1b41→#5b8def |

---

## 7. 关键文件索引

| 文件 | 职责 | 行数 |
|------|------|------|
| `templates/index.html` | SPA 三视图 HTML + PWA meta + 跳过链接 | ~185 |
| `static/js/app.js` | 入口 + Splash粒子(三层纵深) + 视图路由 + SW注册 + 埋点init + 导航守卫 | ~520 |
| `static/js/state.js` | AppState单例 + 双日期模型 + 往返选择 + cityWarning + passengers | ~136 |
| `static/js/analytics.js` | 隐私埋点 (批量sendBeacon + 离线队列 + 在线排空) | ~82 |
| `static/js/airports.js` | 153条机场数据库 + CODE_MAP | ~400 |
| `static/js/autocomplete.js` | 智能模糊联想 + 清除按钮 + 无结果反馈 | ~375 |
| `static/js/search-page.js` | 搜索表单 + 验证 + blur校验 + 同城内联提醒 + 最近搜索 + 乘客舱位 | ~421 |
| `static/js/flightService.js` | 数据层 + Promise.all并行 + segments + 模拟API | ~965 |
| `static/js/flight-profile.js` | 飞友档案 v5.4 (三栏Tab + 联盟徽标 + 航司精准图片2级回退 + Globe懒加载 + 焦点陷阱 + 滑动关闭) | ~800 |
| `static/js/results-page.js` | 结果页 + 往返UI + URL同步 + 错误分类 + 导航守卫 + 筛选排序 | ~1114 |
| `static/js/flight-card.js` | 航班行渲染 + 移动卡片 + quote_age时效标签 | ~140 |
| `static/js/api.js` | API 适配层 + AbortController + 舱位价格倍率 | ~70 |
| `static/js/utils.js` | 公共渲染辅助 | ~120 |
| `static/css/style.css` | 全局样式 + 主题 + 平板断点 + 深色档案面板 + 焦点环 + 打印 + reduced-motion | ~3809 |
| `static/icon.svg` | PWA 图标 (雷达飞机, 512x512) | ~20 |
| `static/manifest.json` | PWA manifest | ~15 |
| `static/sw.js` | Service Worker v5 (precache CDN + cache-first + network-first) | ~95 |
| `server.py` | Flask 服务器 + AirLabs API 代理路由 | ~700 |
| `scripts/utils/scraper.py` | Google Flights Playwright 抓取器 | ~1400 |
| `scripts/data/airlabs_fetcher.py` | AirLabs API 7天缓存代理 | ~135 |
| `scripts/data/build_route_db.py` | OpenFlights 26K 真实航线解析 | ~165 |
| `scripts/data/build_fleet_library.py` | 机队图片库构建器 — 真实机队映射 (v5.3) | ~310 |
| `scripts/data/warm_airlabs_cache.py` | AirLabs 缓存预热器 | ~70 |
| `scripts/images/download_aircraft_images.py` | 统一图片下载器 (合并6个旧脚本) | ~332 |
| `scripts/images/incremental_downloader.py` | 批量下载器，自动续传 | ~178 |
| `scripts/images/sync_aircraft_images.py` | 扫描文件系统 → 生成 AIRCRAFT_IMAGES | ~111 |
| `scripts/utils/validate_verified_routes.py` | 66条锚定航线 AirLabs 校验 | ~211 |

---

## 8. Bug 修复记录

| 问题 | 根因 | 修复 |
|------|------|------|
| 首页完全无响应 (v3.7) | flight-profile.js 多余 `}` 阻断 ES 模块链 | 删除多余闭合大括号 |
| 搜索按钮无跳转 | originAC/destAC 可能为 null → getCode() 抛 TypeError | onSubmit/onSwapCities/initAutocompletes 加 null 防御 |
| 首页加载结果页3D插件 | app.js 无条件 import flight-profile.js (含 Globe.gl 引用) | Globe.gl 在函数内懒加载 |
| 输入框无响应 (潜在) | createAutocomplete 执行失败时 _ac 为 null | try/catch 包裹每个 autocomplete 创建 |
| swap-btn 属性丢失 (v4.2) | Edit 工具替换范围过大误删 hover/cursor/transition 等 | 手动恢复全部缺失属性 |
| initSearchPage 重复调用 (v4.2) | 删除 theme-aero 行时误替换 checkApiStatus | 恢复 checkApiStatus，移除重复 initSearchPage |
| CSS 属性意外删除 (v5.1) | 编辑 shimmer 时长时误删 pointer-events/border-radius | 恢复缺失属性 |
| 搜索页输入框完全无响应 (v5.6.5) | flight-profile.js 833个智能引号(Unicode `'``'`) 破坏ES模块链；autocomplete.js 清除按钮回调引用 `onSelectCallback` 未定义 | 批量替换卷曲引号→ASCII直引号；修复回调引用；修复dropdown滚动偏移 |

---

## 9. 机队图片库 (v5.3)

### 9.1 架构

```
static/images/aircraft/
  {model}/         ← 14 个机型目录
    {airline}/     ← 航司 IATA 代码子目录 (仅真实运营该机型的航司)
      *.jpg        ← Wikimedia Commons 图片
```

**图片策略 (v5.5 精简)**:
1. 精确航司匹配 → 展示该航司对应机型实拍
2. 都没有 → "暂无图片" 占位

**已移除**: `_generic` 通用回退、Wikimedia 远程 URL 回退、随机航司回退（会展示错误航司）

### 9.2 航司覆盖 (45 家)

| 地区 | 数量 | 航司 (IATA 代码) |
|------|------|-----------------|
| **中国** | 7 | CA, CZ, MU, HU, 3U, MF, ZH |
| **中东** | 3 | EK, QR, EY |
| **亚太 — 主要** | 8 | SQ, CX, QF, JL, NH, KE, OZ |
| **亚太 — 补充** | 8 | TR, PR, MH, 5J, TN, NZ, VN, TG, BR, CI, GA |
| **欧洲** | 4 | LH, AF, BA, TK |
| **非洲** | 5 | ET, SA, KQ, MS, AT |
| **美洲** | 7 | DL, UA, AA, AC, LA, AD, CM, AM |

### 9.3 真实机队映射 (266 组合)

基于 planespotters.net / 航司官方年报 / ch-aviation (2025–2026)，仅为每航司**实际运营**的机型建目录。例如：
- 川航 3U 为全空客机队 → 无任何波音子目录
- 国航 CA 为中国大陆唯一运营 B747-8 的航司 → 仅 CA 有 B748/ 子目录
- 阿联酋 EK 无 787 系列 → 无 B788/B789 子目录
- 全日空 NH 有 A380(火奴鲁鲁航线) → 有 A388/NH/ 子目录

### 9.4 构建脚本

**build_fleet_library.py** (v3.0)
- `FLEET` dict — 45 家航司的真实机队 (planespotters.net 数据)
- `MODEL_TERMS` — 14 种机型的 Wikimedia Commons 搜索关键词
- 5s 请求间隔 + 429 退避重试 (45s)
- 续传模式：已有图片自动跳过
- 预计首次运行 ~15 分钟 (已有 136 组合缓存则仅需 ~10 分钟)

### 9.5 图片覆盖

204/266 (76%) 有效组合已有图片，62 个组合留空(Commons 无匹配，可手动填充)。

### 9.6 机型映射 (v5.6)

`scraper.py` 新增 `AIRLINE_WIDEBODY` (50航司宽体机队) 和 `AIRLINE_NARROWBODY` (50航司窄体机队) 映射表。
- `_get_typical_aircraft()`: 从真实宽体机队中选取机型（替代随机 `["B789","A359","B77W"]`）
- `_build_generic_segments()`: 第一段用窄体机(国内/区域)，第二段用宽体机(长程)
- FLIGHT_NUMBERS 修复: CA 的 A332→A333/A359; 3U 的 A332→A359; ZH 移除(无宽体机)
- 无宽体机航司(如 ZH、CM)不会被分配不存在的机型

### 9.7 v5.6.1 Bug修复记录

**Bug 1 — 仅直飞过滤器失效**
- 根因: `_applyFilterSort()` 已定义但从未调用，`_bindFilterBar()` 将原始 prices 直接传给 renderFn
- 修复: `_bindFilterBar` 中改为 `renderFn(_applyFilterSort(getPricesFn()))`，同时改用 `p.stops === 0` 替代 `segs.length <= 1`

**Bug 2 — Splash 跳过按钮冗余**
- 移除 `#splashSkipBtn` 按钮及 app.js 事件监听器，"ENTER CONSOLE" 已是唯一入口

**Bug 3 — 返回按钮文案不清**
- `← 修改搜索` → `← 返回搜索`

**Bug 4 — 航司机型错配**
- 新增 `AIRLINE_WIDEBODY` (50航司) 和 `AIRLINE_NARROWBODY` (50航司) 映射表
- `_get_typical_aircraft()` 回退: `random.choice(["B789","A359","B77W"])` → 从航司真实宽体机队选
- `_build_generic_segments()`: 中转航班第一段窄体机、第二段宽体机

**Bug 5 — AIRCRAFT_IMAGES 与文件系统脱节**
- `AIRCRAFT_IMAGES` 改为从 `static/images/aircraft/` 文件系统自动生成 (203张图片)
- 移除失效的 `_generic` 回退

**Bug 6 — 三栏Tab布局不工作**
- 根因: `openFlightProfile()` 中 `if (!inspectorEl) return;` 早期返回阻止Tab事件绑定
- 修复: 将 seat inspector 绑定移入 `if (inspectorEl)` 代码块，不再提前返回

**设计/技术升级:**
- Service Worker 缓存策略: cache-first → stale-while-revalidate
- SW 缓存版本: `aerohub-v5` → `aerohub-v5.6`
- CSS 增加 `?v=5.6.1` 缓存破坏参数
- "暂无实拍影像" 占位加入飞机剪影图标
- 页脚增加版本号 `v5.6.1`

### 9.8 v5.6.2 窄体机航程验证 + 面板扩展

**窄体机航程限制:**
- 25+机场坐标数据库 (`AIRPORT_COORDS`) + Haversine 大圆距离计算
- 窄体机最大航程映射 (`NARROWBODY_MAX_RANGE`): A20N=6500, B38M=6584, A320=6200, A321=5950, B738=5765, B739=4587
- 80% 安全余量 (`NARROWBODY_SAFE_RANGE = 5200km`)
- `_validate_aircraft_for_segment()`: 窄体机超过安全航程自动替换为 B789 宽体机
- 验证覆盖所有代码路径:
  - `_build_generic_segments()` — 直接/中转航段均验证
  - `_get_flight_segments()` — FLIGHT_NUMBERS 硬编码数据也验证
  - `_validate_segments()` — 统一航段列表验证辅助函数
  - scraper.py 解析函数串入 origin/dest 参数确保距离计算准确
  - server.py `generate_demo_prices()` 已正确传递 origin/dest

**多段机型差异化展示 (utils.js):**
- `aircraftBadge()` 检测 `segments[]` 多段数据
- 两段机型不同时用 `+` 分隔符分别展示
- 每段独立判断宽体/窄体样式 (ac-wide / ac-narrow)

**飞友档案面板扩展:**
- 桌面端 `.fp-panel` 宽度: 640px → 800px
- 三栏Tab(飞行数据/座舱图/航线轨迹)各自获得更宽松空间
- 平板端保持 480px，移动端保持 100vw

**其他:**
- 版本号统一升级: HTML/CSS/SW/server banner → v5.6.2
- SW 缓存名: `aerohub-v5.6.2`

### 9.9 v5.6.3 宽体机航程限制 + 飞行里程面板

**全机型航程数据库 (`AIRCRAFT_MAX_RANGE`):**
- 合并窄体机+宽体机官方最大航程数据 (Airbus/Boeing官方规格)
- 宽体机: A388=15200, A359=15000, A35K=14750, B789=14140, B77W=13649, A333=11750 等14款
- 超远程机型: A345=16670 (A340-500), B77L=15843 (777-200LR)
- `_best_ultra_long_range()`: 距离超过当前机型80%限制时自动升级至超远程机型
- `_get_tech_stop()`: 即使超远程机型也无法到达时，在中途枢纽机场插入技术经停(加油)
- 技术经停机场: ANC/HNL/DXB/SIN/HKG/ICN/NRT/BKK/IST/FRA/LHR 共11个

**飞行里程面板 (Tab 0 — 飞行数据):**
- 每个航段独立展示大圆距离 (great-circle distance)
- 航程利用率进度条: 绿色(<60%) → 橙色(60-80%) → 红色(>80%)
- 总飞行距离汇总行 (km + mi)
- 机型标注 + 航段路由 (origin → destination)
- CSS: `.fp-dist-list` / `.fp-dist-seg` / `.fp-range-bar` / `.fp-dist-total`

**A388 高清图片替换:**
- QR (卡塔尔航空): "Airbus A380 Qatar Airways.jpg" (4,608×3,456, 1.4MB)
- BA (英国航空): "British Airways Airbus A380-800.jpg" (4,012×3,008, 346KB)
- NH (全日空): "ANA Airbus A380 JA381A in Narita.jpg" (5,184×3,456, 1.5MB)
- 旧图均为800px缩略图 → 新图2000px高清下载

**数据流增强:**
- `_validate_segments()` 为每个航段注入 `distance_km` 和 `range_pct` 字段
- `_build_generic_segments()` 返回前统一经过 `_validate_segments()` 处理
- API 响应中每个 segment 携带 `distance_km` (int) 和 `range_pct` (int)

### 修复 5: Module 脚本 DOMContentLoaded 竞态 (`app.js` line 446)

**问题**: Splash 按钮重复出现无响应。`<script type="module">` 具有 defer 行为，脚本执行时 DOMContentLoaded 已触发，回调永不执行。
**修复**: 将初始化逻辑提取为 `_bootstrap()`，使用 `document.readyState === 'loading'` 守卫——已就绪时直接执行，否则监听事件。详见 11.1。

**版本号: ** HTML/CSS/SW/server banner → v5.6.4

---

## 9.6 v5.6.4 机队数据库 + 多段展示 + 面板优化 (2026-05-24)

### 修复 1: 机队数据库审计 (`scraper.py`)

**问题**: 航司显示其机队中不存在的机型。
**根因**: `_validate_aircraft_for_segment()` 未接收航司参数，且若干航司机队数据缺失/错误。

**修改**:
- `_validate_aircraft_for_segment()` 新增 `airline_code` 参数 (line 198)。窄体机超程时从航司实际宽体机队选取替代机型，而非用通用 B789。
- `_validate_segments()` 和 `_build_generic_segments()` 传递 `airline_code`。
- `_get_flight_segments()` 所有 `_validate_segments()` 调用传递 `airline_code`。
- 修正 `AIRLINE_NARROWBODY["EK"]`: B77W/A388/A359 → `[]` (阿联酋航空全宽体机队，无窄体机)。
- 修正 `AIRLINE_NARROWBODY["TN"]`: B789 → `[]` (大溪地航空全宽体机队)。
- 新增 8 家航司机队数据: AK/D7/FJ/HA/KL/VA/JQ/FM (宽体+窄体)。

### 修复 2: 飞行里程颜色变量 (`flight-profile.js` line 866)

**问题**: 航程利用率颜色不统一，使用不存在的 CSS 变量。
**修复**: `var(--danger, #ef4444)` → `var(--red)`, `var(--warn, #f59e0b)` → `var(--orange)`。

### 修复 3: 面板布局优化 (`style.css`)

**问题**: 飞行器档案面板固定模块(header+specs)占比过大，三栏Tab区域显示空间不足。
**修改**:
- `.fp-header` padding: `28px 28px 20px` → `14px 20px 10px`
- `.fp-registration` font-size: `2.4rem` → `1.7rem`
- `.fp-model` font-size: `1.1rem` → `0.9rem`
- `.fp-spec-item` padding: `16px 20px` → `10px 14px`
- `.fp-spec-value` font-size: `0.95rem` → `0.82rem`
- `.fp-section` padding: `24px 28px` → `14px 20px`
- `.fp-tab-btn` padding: `14px 0` → `10px 0`
- 同步更新响应式媒体查询中对应值。

### 修复 4: 多段航班机型分开展示 (`flight-profile.js` + `style.css`)

**问题**: 中转航班仅显示一个机型，两段无法区分查看。
**修改**:
- `_buildHeader()`: 多段航班显示每段航班号和机型，用 `→` 连接。
- `buildProfileHTML()`: 多段航班在"航空器识别"区域嵌入段选择子Tab，每段独立展示实拍影像。
- `_buildAircraftPhoto()`: 新增 `segIdx` 参数，为每段渲染独立照片区。
- `openFlightProfile()`: 绑定段子Tab切换事件。
- 新增 CSS: `.fp-seg-tab-bar/btn/active`, `.fp-seg-photo-area/panel`, `.fp-photo-seg-label`, `.fp-seg-ac`, `.fp-seg-arrow`, `.fp-seg-fn`。

**版本号: ** HTML/CSS/SW/server banner → v5.6.4

---

## 9.10 v5.6.5 智能引号瘫痪 + 自动补全Bug修复 (2026-05-24)

### 问题: 查询交互页面无法输入提示词选择机场

**症状**: 搜索页加载后，出发地/目的地输入框无自动补全功能，输入文字不弹出下拉菜单，无法选择机场，无法从搜索页跳转至结果页。浏览器控制台报告 `Invalid or unexpected token` 错误。

**根因 (三重)**:

1. **卷曲引号语法错误 (主因)** — `flight-profile.js` 第 348-575 行 `AIRCRAFT_IMAGES` 对象包含 **833 个智能/卷曲引号** (Unicode `'` U+2018 和 `'` U+2019) 用作 JavaScript 字符串分隔符。浏览器引擎将卷曲引号视为非法 token，导致整个 `flight-profile.js` 解析失败。由于 `app.js` 导入 `flight-profile.js`，ES 模块链彻底断裂——`_bootstrap()` 和 `initSearchPage()` 从未执行，自动补全从未初始化。

2. **`node --check` 漏检** — 项目无 `package.json`/`"type": "module"`，Node v26 将 `.js` 文件按 CJS 模式做语法检查。CJS 模式下 `import`/`export` 语句的解释与 ESM 不同，导致含卷曲引号的 ESM 代码在 `--check` 下静默通过。

3. **自动补全清除按钮回调引用错误 (次因)** — `autocomplete.js` 第 35 行清除按钮的 mousedown 处理器调用 `onSelectCallback()`，该变量从未定义。应调用 `onSelect()`。虽不影响基本输入功能，但点击清除按钮会抛出 ReferenceError。

**额外修复**:

- **下拉菜单滚动偏移** — `updateDropdownPosition()` 对 `position: fixed` 元素错误叠加 `window.scrollY`/`scrollX`，页面滚动时下拉菜单偏离输入框。移除滚动偏移量。

- **嵌入撇号转义** — `AIRCRAFT_IMAGES` 有一个文件名含撇号 (`ANA's A321ceo...`)。卷曲引号替换为直引号后，该撇号与字符串分隔符冲突，需 `\'` 转义。

**修改文件**:

| 文件 | 修改 |
|------|------|
| `static/js/flight-profile.js` | 833 个卷曲引号 `'`/`'` → 直引号 `'`；1 处 `ANA's` → `ANA\'s` |
| `static/js/autocomplete.js` | `onSelectCallback(...)` → `if (onSelect) onSelect(...)`；`updateDropdownPosition()` 移除 `window.scrollY`/`scrollX` |

**排查经验**:

1. `node --check` 不能替代浏览器 ESM 解析器检查。应在 CI 中用 `cat file.js | node --check --input-type=module -` 验证 ESM 语法。
2. 自动生成/批量构建的数据文件 (如 `AIRCRAFT_IMAGES`) 可能混入不可见 Unicode 字符，需在生成脚本中做 ASCII 安全验证。
3. Playwright 的 `page.on('pageerror')` 是发现 JS 解析级故障的最快手段。

**版本号: ** HTML/CSS/SW/server banner → v5.6.5

---

## 10. 开发环境

- **服务器**: `python server.py` → `http://localhost:5088`
- **LAN 多设备访问**: `http://172.20.10.3:5088` (自动检测 LAN IP)
- **语法检查**: `node --check static/js/*.js`
- **CSS 括号**: `grep -c '{' static/css/style.css` (应为 575)
- **无构建工具**: 纯 Flask + 原生 ES 模块，零依赖打包
- **Python 依赖**: flask, playwright, python-dotenv
- **CDN 依赖**: Chart.js 4.4.0 (jsdelivr), Globe.gl (unpkg)

---

## 11. 已知陷阱 / 故障排查手册

### 11.1 首页按钮/Splash 无响应

**症状**: 首页 "ENTER CONSOLE" 点击无反应，或任何 `DOMContentLoaded` 中的初始化代码未执行。

**根因 (双重)**:
1. `<script type="module">` 天然具有 `defer` 行为——模块脚本在 DOM 完整解析后才执行。此时 `DOMContentLoaded` 事件早已触发，`document.addEventListener('DOMContentLoaded', callback)` 永远等不到回调。
2. **Service Worker 缓存旧版 JS**：SW 采用 cache-first 策略，即使服务端已修复，浏览器仍加载缓存中的旧 `app.js`。`skipWaiting()` 仅让新 SW 激活，当前页面仍由旧 SW 控制——需刷新才能拿到新文件。但如果旧 JS 的初始化 bug 阻止了 splash 跳转，用户就无法正常进入页面，形成循环。

**修复 (标准模板)**:
```javascript
// ❌ 错误 — 在 type="module" 脚本中永远不会触发
document.addEventListener('DOMContentLoaded', () => { ... });

// ✅ 正确 — readyState 守卫
function _bootstrap() { ... }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootstrap);
} else {
  _bootstrap();
}
```

**SW 侧修复** (`sw.js`):
```javascript
// JS 文件使用 network-first 策略，确保关键修复能即时送达
if (url.pathname.endsWith('.js')) {
  event.respondWith(networkFirst(event.request));
  return;
}
```
+ 每次部署后递增 `CACHE_NAME`（如 `aerohub-v5.6.4` → `aerohub-v5.6.4b`），强制触发新 SW 安装。
+ JS 脚本标签加版本查询参数：`<script type="module" src="/static/js/app.js?v=5.6.4">`。

**排查步骤**:
1. 检查 `<script>` 标签是否含 `type="module"` → 若是，检查初始化代码是否包在 `DOMContentLoaded` 内。
2. 在 `_bootstrap()` 首行加 `console.log('[bootstrap] running')` 验证执行。
3. `node --check static/js/*.js` 排除语法错误导致的静默加载失败。
4. 浏览器 DevTools → Console 过滤 `[App]` 查看初始化错误日志。
5. 浏览器 DevTools → Application → Service Workers → 查看控制当前页面的 SW 版本和缓存名称。
6. **快速绕过 SW**：隐身窗口测试，或 DevTools → Service Workers → Unregister 后硬刷新。

### 11.2 搜索页输入框无响应 / `Invalid or unexpected token`

**症状**: 搜索页正常渲染，但出发地/目的地输入框无自动补全、输入不弹下拉菜单、控制台报 `Invalid or unexpected token`。所有 ES 模块初始化代码均未执行。

**根因**: 某 JS 文件含**非 ASCII 字符被用作 JavaScript 语法**（最常见：智能/卷曲引号 `'` U+2018 / `'` U+2019 替代了 ASCII 直引号 `'` U+0027）。浏览器严格拒绝这些 token，导致该文件及所有导入链解析失败。

**为什么 `node --check` 可能漏检**:
- 项目缺 `package.json` 且 `"type": "module"` 未设时，Node 将 `.js` 文件按 CJS 做语法检查。
- CJS 模式下 `import` 语句被解释为 `import()` 调用表达式，一些 ESM-only 语法错误被跳过。
- **正确验证方式**: `cat file.js | node --check --input-type=module -`

**排查步骤**:

1. **Playwright 快速定位故障文件**:
   ```python
   page.on('pageerror', lambda err: print(f'PAGE_ERROR: {err}'))
   # 如果报 Invalid or unexpected token → 进入步骤 2
   ```

2. **逐模块导入定位**:
   ```javascript
   // 在 Playwright evaluate 中逐个 import
   const mods = ['airports.js', 'state.js', ..., 'app.js'];
   for (const m of mods) {
     try { await import('/static/js/' + m); console.log(m, 'OK'); }
     catch(e) { console.log(m, 'FAIL:', e.message); }
   }
   ```

3. **扫描可疑 Unicode 字符**:
   ```bash
   python3 -c "
   for i, line in enumerate(open('file.js').readlines(), 1):
       for ch in line:
           if ord(ch) in [0x2018, 0x2019, 0x201C, 0x201D, 0xA0, 0x200B]:
               print(f'Line {i}: U+{ord(ch):04X}')
   "
   ```

4. **批量替换修复**:
   ```python
   content = content.replace('‘', \"'\").replace('’', \"'\")
   content = content.replace('“', '\"').replace('”', '\"')
   ```

5. 修复后验证: `cat file.js | node --check --input-type=module -` 应退出 0。

---

## 12. v5.6.6 机队数据库修正 (2026-05-24)

### 12.1 scraper.py 修复 (9项)

| # | 修复项 | 变更 |
|---|--------|------|
| 1 | CA (中国国航) | 添加 `"A332"` 到 widebody 列表 |
| 2 | CZ (南方航空) | 移除 `"A388"` (已退役) |
| 3 | MU (东方航空) | 添加 `"A332"` 到 widebody 列表 |
| 4 | HU (海南航空) | 添加 `"A359"` 到 widebody 列表 |
| 5 | 3U (四川航空) | `"A333"` → `"A332"` (Sichuan 运营 A330-200 而非 -300) |
| 6 | KL (荷兰皇家航空) | 从 narrowbody 列表中移除 `"B77W"` (宽体机误入窄体列表) |
| 7 | `_get_typical_aircraft()` fallback | `random.choice(["B789","A359","B77W"])` 替代固定 `"B789"` |
| 8 | `_get_typical_aircraft()` narrow fallback | `random.choice(["A320","B738"])` 替代固定 `"A320"` |
| 9 | server.py 国际航线过滤 | `available = [a for a in DEMO_AIRLINES if AIRLINE_WIDEBODY.get(a[0], [])]` — 仅宽体机航司出现在国际航线 |

### 12.2 flightService.js 修复 (8项)

| # | 修复项 | 变更 |
|---|--------|------|
| 1-2 | `AIRLINE_WIDEBODY` + `AIRLINE_NARROWBODY` 映射 | 新增 ~60 家航司的机队映射 (与 scraper.py 数据一致) |
| 3 | `_guessAircraft()` 重写 | 从全局池改为按 `carrierCode` 查找 `AIRLINE_WIDEBODY[carrierCode]` / `AIRLINE_NARROWBODY[carrierCode]` |
| 4 | fallback 行为 | carrier 无匹配时回退到全体航司机型池，而非固定全局数组 |
| 5 | 国际航线过滤 | `availableCarriers = MOCK_CARRIERS.filter(c => (AIRLINE_WIDEBODY[c.code]\|\|[]).length > 0)` |
| 6 | 多段航班机型 | 合并 carrier fleet + 全局 fallback 池 |
| 7 | 无经停直飞 | 优先 carrier 自有 widebody，fallback 到全体 widebody |
| 8 | 语法验证 | 全部 12 个 JS 文件通过 `node --check --input-type=module` |

---

## 13. v5.7 航空器识别模块排版重构 (2026-05-24)

**修改文件**: `flight-profile.js`, `style.css`

### 新三行布局

航空器识别区域从混乱的 header+photo+footer 重构为清晰的三行结构：

1. **第一行** — 航班号: "第1程 CA836" (`.fp-ac-id-flightno`), 多段显示段号+航班号
2. **第二行** — 实拍图片: 居中展示, 圆角 (`.fp-ac-id-photo`), 保留 fallback 占位
3. **第三行** — 机型+注册号: "空客 A350-900 · B-308T" (`.fp-ac-id-details`)

### 多段航班

- 每段独立 `.fp-seg-id-panel` 面板, Tab 切换时全部三行同步切换
- `_buildHeader()` 简化为仅显示航空公司徽章+联盟标识+特殊涂装
- 段号/航班号/机型/注册号全部移入航空器识别区域

### 涉及的函数变更

| 函数 | 变更 |
|------|------|
| `_buildAircraftPhoto()` → `_buildAircraftIdBlock()` | 三行 HTML 布局 |
| `buildProfileHTML()` | `photoSection` → `aircraftIdSection`, `.fp-seg-photo-panel` → `.fp-seg-id-panel` |
| `_buildHeader()` | 移除 registration/model 行, 仅保留 airline badge |
| 段Tab 点击处理 | `.fp-seg-photo-panel` → `.fp-seg-id-panel` |

### CSS 新增

`.fp-ac-id-flightno`, `.fp-ac-id-photo`, `.fp-ac-id-details`, `.fp-ac-id-block`, `.fp-seg-id-area`, `.fp-seg-id-panel`

---

## 14. v5.7.1 飞行里程模块修复 (2026-05-24)

### CSS 颜色统一

| 选择器 | 变更 |
|--------|------|
| `.fp-dist-seg` | `background: #fff` → `var(--card)`, `border` → `var(--border)` |
| `.fp-dist-route` | `color: #0f172a` → `var(--text)` |

### 里程数据渲染修复

**根因**: `buildMockResults()` 中段对象缺少 `distance_km` 和 `range_pct` 字段, 导致 `_buildDistanceSection()` 无法渲染真实历程数据。

**修复**:
1. AIRCRAFT_DB 添加 `rangeKm` 字段 (所有14个机型)
2. 新增 A332, B78X 到 AIRCRAFT_DB + ENGINE_DB
3. 段对象添加 `distance_km` (单段=全距, 多段=按时长分摊) 和 `range_pct` (distance/range*100)

---

## 15. v5.7.2 座舱图布局修复 (2026-05-24)

### 核心修复: colLetters 推导

`_getColLetters(layout)` 全局函数无法区分 1-2-1 (需 A/D/G/K) 和 2-2 (需 A/B/E/F) 的列字母。改为从 `cabin.refColumns` 直接推导:

```javascript
const colLetters = cabin.refColumns.filter(ref => ref !== 'AISLE');
```

删除了不再使用的 `_getColLetters()` 函数。

### 经济舱 refColumns 按机型分离

| 机型 | 布局 | refColumns |
|------|------|-----------|
| B77W | 3-4-3 | A,B,C\|AISLE\|D,E,F,G\|AISLE\|H,J,K |
| A333/A332 | 2-4-2 | A,B\|AISLE\|D,E,F,G\|AISLE\|H,K |
| 其他宽体 | 3-3-3 | A,B,C\|AISLE\|D,E,F\|AISLE\|H,J,K |

### 窄体机公务舱 2-2

`refColumns`: `['A','C','AISLE','D','F']` → `['A','B','AISLE','E','F']` (AB/EF 对齐经济舱 A/B/E/F 轨道)

### B748 上层公务舱 2-2

同样改为 `['A','B','AISLE','E','F']`

### 宽体机列表补全

添加 A332, B78X 到 `isWide` 检测数组。

---

## 16. v5.8 Playwright E2E 测试套件 (2026-05-24)

**文件**: `tests/e2e_test.py`

### 测试流程 (7项)

1. 搜索页加载 → `#view-search.active` + `#originInput` / `#destInput` 就绪
2. 自动补全 PEK → 键入 → 下拉出现 → 点击 → 验证选中值含"PEK"
3. 自动补全 SYD → 同上
4. 提交搜索 → `#view-results.active` → `.table-row` / `.flight-card` 渲染 (16行)
5. 点击 `.geek-profile-btn` → `#fpOverlay.active` 面板弹出
6. Tab切换: 飞行数据(默认) → 座舱图(`.fp-seat-grid`已渲染) → 航线轨迹 → 返回飞行数据
7. 关闭面板 + `#backToSearch` 返回搜索页

### 全局 pageerror 监听

全程收集 JS 错误，任何 `pageerror` 事件计入失败报告。

### 测试结果

```
7/7 PASS — Zero JavaScript errors
```

### 运行方式

```bash
pip install playwright && playwright install chromium
python tests/e2e_test.py
```

---

## 17. 改动文件清单 (v5.6.6 → v5.8)

| 文件 | 变更说明 |
|------|---------|
| `scraper.py` | 9项机队映射修复 + fallback多样化 |
| `server.py` | 国际航线仅宽体机航司 + 导入 AIRLINE_WIDEBODY |
| `flightService.js` | 机队映射(~60航司) + `_guessAircraft()`重写 + 国际航线过滤 + AIRCRAFT_DB添加rangeKm + 段级distance_km/range_pct + A332/B78X新增 |
| `flight-profile.js` | `_buildAircraftPhoto()`→`_buildAircraftIdBlock()` 三行布局 + `_buildHeader()`简化 + colLetters推导修正 + 经济舱refColumns按机型分离 + 窄体公务AB/EF对齐 + 删除`_getColLetters()` |
| `style.css` | `.fp-seg-photo-*`→`.fp-seg-id-*` + 新增`.fp-ac-id-*`样式 + 里程颜色变量统一 |
| `tests/e2e_test.py` | Playwright自动化测试 (7项 + pageerror监听) |
| `CONTEXT.md` | 版本记录 + 详细修复文档 |

---

## 18. v5.8.1 Splash恢复 + SW缓存修复 + 版本号统一 (2026-05-24)

### 问题

页面样式全部丢失、Splash欢迎页消失、版本号显示v5.6.4。

### 根因分析

1. **SW CSS缓存策略缺陷**: `sw.js` 对 CSS 使用 `cacheFirst` → 浏览器始终返回旧的缓存CSS, 新样式永不生效
2. **版本号未更新**: HTML/CSS/JS 版本字符串全部停滞在 `v5.6.4`, SW CACHE_NAME 也是 `aerohub-v5.6.4b` — 版本从未引入变更, SW 无理由更新
3. **Splash HTML被移除**: `view-splash` div 完整删除, 但 `_initSplashParticles()` / `_setupSplashTransition()` / CSS 全都保留 — 孤岛代码
4. **`_bootstrap()` 未初始化 Splash**: splash 初始化调用被移除

### 修复

| # | 修复项 | 变更 |
|---|--------|------|
| 1 | `sw.js` CSS策略 | `cacheFirst` → `networkFirst` (与JS相同) |
| 2 | `sw.js` CACHE_NAME | `aerohub-v5.6.4b` → `aerohub-v5.8` |
| 3 | `index.html` CSS版本 | `?v=5.6.4` → `?v=5.8` |
| 4 | `index.html` JS版本 | `?v=5.6.4` → `?v=5.8` |
| 5 | `index.html` SW清理版本 | `5.6.4b` → `5.8` |
| 6 | `index.html` Footer版本 | `v5.6.4` → `v5.8` |
| 7 | `index.html` Splash HTML | 完整恢复 `#view-splash` (含Ken Burns背景/粒子Canvas/star logo/ENTER CONSOLE按钮) |
| 8 | `app.js` `_bootstrap()` | 添加 `_initSplashParticles()` + `_setupSplashTransition()` 调用(仅无hash时) |
| 9 | `app.js` `_restoreFromHash()` | `#search` hash 时调用 `showView('search')` 显式切换视图 |
| 10 | `tests/e2e_test.py` | Test 1 更新为 Splash → ENTER CONSOLE → search 流程 |

---

## 19. v5.8.6 飞行时间格式修复 + 三视角审查 (2026-05-25)

### 修复
- `_generateTelemetry`: `estFlightTime` 从 `"10.5h"` 改为 `"10h30m"` (含 `padStart(2,'0')`)

### PM/美术/技术 三视角审查结果

#### 🔴 Bug修复建议 (3项)
1. **日期切换后筛选栏数据过期** — `updateSingleDayContent()` 替换航班列表但不重绑筛选栏，导致"仅直飞"/排序操作在过期数据上运行。→ `results-page.js` 263-296, 504-526
2. **WebGL context 泄漏** — `closeFlightProfile()` 移除 DOM 但不销毁 Globe 实例，反复开闭面板耗尽浏览器 WebGL context。→ `flight-profile.js` 1658-1674
3. **内联 onerror JS** — `_buildAircraftIdBlock()` 在 HTML 字符串中嵌入 `onerror="..."` 会触发 CSP 违规。→ `flight-profile.js` 893

#### 🟡 UX增强 (5项)
1. **Globe 3D 无加载骨架屏** — 当前仅显示纯文字"3D 地球加载中..."，需骨架屏或渐变占位
2. **搜索缺少航司偏好** — 无航司/联盟多选过滤，飞友无法提前缩小范围
3. **无价格追踪/关注** — 缺少"关注此航线"功能，用户需手动重新搜索比价
4. **趋势面板默认折叠** — 需点击才展开，多数用户会忽略。建议首屏自动展开或预览条
5. **下滑关闭无视觉提示** — 移动端 swipe-to-close 手势零提示，建议面板顶部加拖拽小横条

#### 🟠 视觉打磨 (4项)
1. **暗色模式飞行里程卡片低对比度** — `.fp-dist-seg` 边框与背景仅 2.6:1 对比度，段卡片几乎融入面板
2. **筛选栏平板端溢出** — 700-1024px 视口下筛选 chips + 排序下拉无 flex-wrap，可能遮挡排序
3. **日期卡片无键盘焦点环** — `.date-strip-card` 无 `:focus-visible` 样式，键盘导航无视觉反馈
4. **移动端搜索结果头信息层级不清** — 航线/日期/人数三行字号/字重相同，难以快速扫读

#### 🔵 技术债务 (5项)
1. **未使用的 import** — `results-page.js:6` 导入 `abortPending` 从未使用
2. **死代码** — `_initAircraft3DAsync()` 无操作存根从未被调用 → `flight-profile.js` 961-964
3. **协议相对 URL** — Globe.gl CDN 用 `//unpkg.com` 在 file:///CSP 环境可能失败，应统一为 `https://`
4. **重复骨架屏 HTML** — 单日结果骨架屏在 `loadSingleDay()` 和 `renderSingleDaySection()` 中冗余定义
5. **图片选取缺少显式边界检查** — `_getAircraftImageUrls()` 随机索引可能针对空数组产生 NaN

#### 🟢 功能路线图 (5项, 按价值排序)
1. **多城/缺口程搜索** — A→B→C 多段查询，利用现有多段 Globe 可视化，拉开与基础搜索引擎差距
2. **价格追踪/关注列表** — localStorage 持久化，"关注此航线"按钮，再访时显示价格变动
3. **真实 API 接入** — `ENABLE_REAL_API` 切换和 `FLIGHT_API_KEY` 占位符已有，补齐即可启用实时数据
4. **飞机对比视图** — 复用现有座舱图/遥测/里程渲染，选两个航班并排对比
5. **可分享飞行卡片** — URL 含航班索引+档案Tab状态，支持深度链接直达特定飞机档案

---

## 20. v5.9 WIP — 价格追踪 + 航司筛选 + 3D地球修复 (2026-05-25)

> **状态**: 未提交 (working tree)，在 v5.8.8 基础上继续开发

### 20.1 新增模块: `static/js/watchlist.js` (92行)

价格追踪核心模块，localStorage 持久化。

**导出函数**:
| 函数 | 用途 |
|------|------|
| `getWatchlist()` | 读取追踪列表 |
| `addToWatchlist({...})` | 添加航线 (origin/dest/cabin)，记录初始价格 + 历史 |
| `removeFromWatchlist(key)` | 移除航线 |
| `isTracked(key)` | 检查是否已追踪 |
| `updatePrice(key, price, ...)` | 追加价格历史 (保留最近90条) |
| `refreshWatchlistFromResults(origin, dest, cabin, prices)` | 搜索结果自动刷新追踪价格 |
| `getTrend(key)` | 趋势判定: up/down/flat |
| `getPriceChange(key)` | 计算累计价格变化 |
| `refreshWatchlist()` | 调用 `/api/watchlist-refresh` 主动刷新全部追踪航线 (v5.9新增) |

### 20.2 航司偏好筛选

**前端**:
- `state.js` 新增 `preferredCarriers: []`
- `search-page.js`:
  - 新增 `CARRIER_LIST` (25家航司)
  - `initCarrierChips()` — 渲染 chip 按钮组 + 全选/反选 toggle
  - `getSelectedCarriers()` — 读取筛选结果
  - Toggle 按钮标签: 全部航司 / `已选 N · 全选` / 全部取消
- `results-page.js`:
  - `_applyFilterSort()` 集成航司偏好过滤
  - 航班行/卡片注入 `_cabin` 字段用于追踪
- `templates/index.html`: 新增 `.carrier-filter-row` UI
- `style.css`: chip 样式 + 响应式适配 (~70行新增)

**设计**: 仅在表单提交时读取偏好 → 传递给后端/demo数据生成 → 结果页过滤。空数组 = 显示全部。

### 20.3 价格追踪面板 + 追踪按钮

**搜索页追踪面板**:
- `renderWatchlistPanel()` — 渲染追踪列表: 航线、舱位、当前价格、涨跌指示 (¥ 差值)、移除按钮
- 点击路线自动回填搜索表单
- `🔄 刷新` 按钮 → 调用后端 API 批量更新价格 → 3秒后状态消息自动消失
- `templates/index.html`: watchlistPanel 容器 + watchlistRefreshBtn + watchlistStatus

**追踪按钮 (☆/★)**:
- `flight-card.js`: 每个航班行/卡片注入 `.track-btn`
- `results-page.js`: `_handleTrackBtn()` + `_updateTrackBtns()` 处理点击/状态同步
- `refreshWatchlistFromResults()` 结果加载时自动刷新已追踪路线的价格

### 20.4 3D 地球修复 (`flight-profile.js`)

| 修复 | 说明 |
|------|------|
| 国际日期变更线视角偏移 | `_midLng()` 处理 ±180° 经度跨越 → POV 居中正确 |
| Globe canvas 重复叠加 | `el.innerHTML = ''` 清理骨架屏再初始化，防止每切 Tab 增一个 canvas |
| Globe 容器约束 | CSS `!important` 强制 Globe.gl 的 viewport 级 div/canvas 约束到 `.fp-globe-3d` 容器 |
| Globe 高度 | 桌面 500px (原420) / 移动端 360px (原300) |
| 多段 Globe 也应用 | `_initMultiSegmentGlobe3D` 同样修复日期线 + 清理 |

### 20.5 后端新增: `/api/watchlist-refresh` (POST)

**请求**: `{routes: [{origin, dest, cabin}, ...]}`  
**响应**: `{results: [{origin, dest, cabin, price, airline, airline_name, date, source: 'live'|'demo'|'unavailable'}]}`  
**缓存**: 30分钟 (独立于价格缓存的 `wl:` 前缀)  
**降级**: Google Flights 抓取失败 → demo 数据 → `price: null`

### 20.6 改动文件清单

| 文件 | 变更 | 状态 |
|------|------|------|
| `static/js/watchlist.js` | +92 行 (新文件) | untracked |
| `static/js/search-page.js` | +150 行 (航司chips + 追踪面板渲染 + 刷新按钮) | modified |
| `static/js/results-page.js` | +74 行 (航司过滤 + 追踪按钮交互 + _cabin传递) | modified |
| `static/js/flight-card.js` | +6 行 (追踪按钮组件) | modified |
| `static/js/flight-profile.js` | +24 行 (3D地球日期线修复 + canvas清理) | modified |
| `static/js/state.js` | +1 行 (preferredCarriers) | modified |
| `static/js/app.js` | +3 行 (追踪面板自动刷新) | modified |
| `static/css/style.css` | +240 行 (航司chip + watchlist + Globe约束 + 刷新按钮) | modified |
| `templates/index.html` | +21 行 (航司筛选行 + watchlist header/按钮/状态) | modified |
| `server.py` | +58 行 (watchlist-refresh API) | modified |
| `tests/test-report.txt` | ±2 行 | modified |
| `CONTEXT.md` | 本文档 | modified |

### 20.7 待完成

- [x] 补充航司数据 (前端 CARRIER_LIST + 后端 机队/名称映射/DEMO_AIRLINES)
- [x] 航线归属逻辑修复 (本国枢纽原则 + 第五航权例外)
- [ ] v5.9 版本号统一 (HTML/CSS/SW/server banner)

## 21. v5.9 航司数据库扩充 + 航线归属逻辑 (2026-05-25)

### 21.1 航司数据扩充

**前端 CARRIER_LIST**: 25 → 52 家航司
**后端 DEMO_AIRLINES**: 17 → 45 家航司
**scraper.py AIRLINE_WIDEBODY/NARROWBODY**: 50 → 75 家航司
**flightService.js MOCK_CARRIERS**: 19 → 49 家航司

#### 从 scraper 数据库补入前端 (27家)
KL, AC, NZ, VA, JQ, ET, SA, KQ, MS, AT, LA, AD, CM, AM, VN, TG, PR, MH, 5J, TR, GA, D7, AK, FJ, HA, FM, OZ, BR, CI

#### 全新加入 (23家)
| IATA | 名称 | 所属国 | Hubs | 宽体机队 |
|------|------|--------|------|---------|
| VS | 维珍大西洋 | 英国 | LHR | A35K, A339, B789 |
| AI | 印度航空 | 印度 | DEL, BOM | B77W, B788, B789, A359 |
| SK | 北欧航空 | 瑞典 | CPH, ARN, OSL | A359, A333 |
| AY | 芬兰航空 | 芬兰 | HEL | A359, A333 |
| LX | 瑞士航空 | 瑞士 | ZRH | A333, B77W |
| OS | 奥地利航空 | 奥地利 | VIE | B789, B77W |
| TP | TAP葡萄牙 | 葡萄牙 | LIS | A339, A332 |
| LO | LOT波兰 | 波兰 | WAW | B789, B788 |
| EI | 爱尔兰航空 | 爱尔兰 | DUB | A333, A332 |
| GF | 海湾航空 | 巴林 | BAH | B789 |
| WY | 阿曼航空 | 阿曼 | MCT | B789, A333 |
| KU | 科威特航空 | 科威特 | KWI | B77W, A332, A338 |
| UL | 斯里兰卡航空 | 斯里兰卡 | CMB | A333, A332 |
| BI | 文莱皇家 | 文莱 | BWN | B788 |
| PK | 巴基斯坦航空 | 巴基斯坦 | KHI, ISB | B77W, B77L |
| BG | 孟加拉航空 | 孟加拉 | DAC | B789, B788, B77W |
| WS | 西捷航空 | 加拿大 | YYC | B789 |
| SN | 布鲁塞尔航空 | 比利时 | BRU | A333 |
| AR | 阿根廷航空 | 阿根廷 | EZE | A332, A359 |
| AV | 哥伦比亚航空 | 哥伦比亚 | BOG | B788 |
| MK | 毛里求斯航空 | 毛里求斯 | MRU | A359, A339, A332 |
| FI | 冰岛航空 | 冰岛 | KEF | (窄体) |
| KC | 阿斯塔纳航空 | 哈萨克斯坦 | NQZ, ALA | (窄体) |

### 21.2 航线归属逻辑 (scraper.py + server.py)

#### AIRLINE_COUNTRY 映射 (75家航司)
每家航司 → 所属国 ISO 代码。用于判断航司是否有权运营某条国际航线。

#### AIRPORT_COUNTRY 映射 (116个机场)
每个 IATA 代码 → 所属国 ISO。覆盖中国全部 48 个民用机场 + 全球主要枢纽。

#### 核心规则: `can_operate_route(airline_code, origin, dest)`
1. **国内航线**: 仅该国航司可运营（PEK→PVG 仅中国航司）
2. **国际航线**: 航司所属国必须 = 出发国 或 到达国
   - PEK→SYD: 仅中国和澳大利亚航司
   - PEK→LHR: 仅中国和英国航司
3. **第五航权例外**: 12条已知特殊航线
4. **未知放行**: 机场/航司数据不完整时宽松处理

#### 第五航权航线 (12条)
| 航司 | 航段 | 说明 |
|------|------|------|
| SQ | HKG→SFO | SIN-HKG-SFO 第五航权 |
| SQ | NRT→LAX | SIN-NRT-LAX 第五航权 |
| EK | BKK→SYD | DXB-BKK-SYD 第五航权 |
| EK | BKK→CHC | DXB-BKK-CHC 第五航权 |
| EK | MXP→JFK | DXB-MXP-JFK 第五航权 |
| CX | TPE→NRT | HKG-TPE-NRT 第五航权 |
| CX | TPE→ICN | HKG-TPE-ICN 第五航权 |
| QR | BKK→HAN | DOH-BKK-HAN 第五航权 |
| TK | BKK→HKG | IST-BKK-HKG 第五航权 |
| ET | BKK→HKG | ADD-BKK-HKG 第五航权 |
| ET | BOM→HKG | ADD-BOM-HKG 第五航权 |
| LA | AKL→SYD | SCL-AKL-SYD 第五航权 |

### 21.3 实现效果

**搜索 PEK→SYD** 现在只会显示 🇨🇳 中国航司 + 🇦🇺 澳大利亚航司的航班，不再出现英航、汉莎等无关航司横跨中国-澳洲航线。

**Demo 数据生成** (`generate_demo_prices`) 先过 `can_operate_route` 过滤，再过宽体机过滤。

### 21.4 修改文件

| 文件 | 变更 |
|------|------|
| `scraper.py` | +23 航司机队数据 + AIRLINE_COUNTRY/AIRPORT_COUNTRY/FIFTH_FREEDOM_ROUTES + can_operate_route() |
| `server.py` | 导入 can_operate_route + DEMO_AIRLINES 17→45 + 航线过滤 + 枢纽扩展 |
| `static/js/search-page.js` | CARRIER_LIST 25→52 |
| `static/js/flightService.js` | MOCK_CARRIERS 19→49 + 宽体/窄体机队映射全量同步 |

---

## 22. v5.9-continued — Google Flights 抓取链路修复 (2026-05-25)

### 22.1 Google Flights 结果未过滤 `can_operate_route`

**问题**: `scraper.py` 的 Google Flights 抓取结果直接返回原始航班数据，未经过 `can_operate_route()` 过滤，导致无关航司横跨非本国航线。

**修复**: 在 `scraper.py` 的 `parse_results()` 函数中，对 Google Flights 返回的每个航班调用 `can_operate_route(airline_code, origin, dest)` 过滤，拒绝不符合航线归属规则的航司。

### 22.2 中转地 fallback 全球随机问题

**问题**: 中转航班的中转地选择逻辑在无匹配枢纽时 fallback 到随机全球机场。

**修复**: fallback 逻辑改为从航司所属国筛选枢纽机场，而非全局随机。确保中转地永远在航司所属国内。

### 22.3 IATA 航司数据库大规模扩充 (153 家)

从 IATA 官网抓取 359 家全球航司名单，经过人工筛选整合，最终纳入 **153 家运营中常见航司**。同步更新所有数据源：

| 数据源 | 变更 |
|--------|------|
| `scraper.py` AIRLINE_WIDEBODY/NARROWBODY | 75 → 覆盖全 153 家 |
| `flightService.js` MOCK_CARRIERS | 49 → 153 家 |
| `search-page.js` ALL_AIRLINES | 112 家可筛选 |
| Google Flights 英文名映射 | +140 条新映射 |

### 22.4 货运/濒危航司清理

移除已停运或纯货运航司：S7 (西伯利亚航空/濒危)、DV (SCAT/区域性)、SM (开罗航空/濒危)、TC (坦桑尼亚航空/区域性)、SB (所罗门航空/区域性)、PX (新几内亚航空/区域性)。

### 22.5 Google Flights 英文名映射缺失修复

**问题**: Google Flights 返回航司名称为英文全称（如 "Air China"），但 scraper 仅有 IATA 代码映射。未匹配的航司返回 `code="?"`，被 `can_operate_route` 的「未知放行」逻辑放过。

**修复**: 新增 **~140 条英文名→IATA代码映射**（覆盖所有 153 家航司）。修正 `can_operate_route` 对未知代码的处理：从「宽松放行」改为「拒绝」，杜绝虚假航线。

---

## 23. v5.9 — 前端航线归属修复 (2026-05-25)

### 23.1 前端 Mock 数据绕过 `can_operate_route`

**问题**: `flightService.js` 的 `generateMockFlightAPIResponse()` 生成 Mock 数据时完全不检查航线归属，前端 Mock 模式可显示英航 PEK→SYD 等不存在的航线。

**修复**: 在 `flightService.js` 中新增 **JavaScript 版 `canOperateRouteJS()`** 函数，并接入所有代码路径：
- 直飞航班 → 生成前过滤 carrier
- 中转航班 → 每段独立验证
- 中转地 → 从航司所属国枢纽筛选

### 23.2 前端数字开头对象 key 语法错误

**问题**: `flightService.js` 中 `AIRLINE_COUNTRY` 和 `AIRPORT_COUNTRY` 使用数字开头的 ISO 代码作为对象 key（如 `3166-2:CN`），浏览器报语法错误，导致 **ENTER CONSOLE 按钮无反应**。

**修复**: 将数字前缀的 key 改为字符串引号包裹。

### 23.3 `_pickAircraftForSegment` 调用未定义函数

**问题**: `_pickAircraftForSegment` 中调用 `_segmentDistance()` 计算航段距离，但该函数不存在，导致搜索结果页显示「数据加载失败」。

**修复**: 将 `_segmentDistance()` 替换为已有的 Haversine 距离计算逻辑。

### 23.4 搜索结果时间显示 NaN:N / Invalid Date

**问题**: 搜索结果中起降时间显示 `NaN:N`，趋势面板日期显示 `Invalid Date`。

**根因**: 部分航段数据中时间字段为空字符串或 NaN，直接传给 `new Date()` 产生 Invalid Date。

**修复**: 新增 `safeDate()` 防御函数，对空字符串/NaN/undefined 做前置检查，返回安全默认值。

---

## 24. v5.9 — 搜索交互 UX 重构 (2026-05-25)

### 24.1 航司偏好 → 三大航空联盟选择器

**变更**: 将搜索页 112 个独立航司 chip 替换为三大航空联盟选择器：

| 联盟 | 成员航司 |
|------|---------|
| ⭐ **星空联盟** | CA, ZH, SQ, NH, OZ, TG, TK, LH, LX, OS, SK, TP, LO, AV, CM, ET, SA, MS, UA, AC, NZ, BR |
| 🔵 **寰宇一家** | CX, JL, MH, QF, BA, AY, QR, UL, LA, AA |
| 🔴 **天合联盟** | MU, CZ, MF, KE, VN, AF, KL, CI, GA, DL, AM, AR |

选择联盟自动包含所有成员航司。可多选联盟组合。空选 = 全部航司。

**实现**:
- `search-page.js`: `ALLIANCE_CHIPS` 渲染 + `getSelectedCarriers()` 从联盟解析
- `state.js`: `preferredCarriers` 仍为最终航司数组
- `index.html`: 联盟 chip 行替换原 carrier-filter-row
- `style.css`: 联盟 chip 样式（星空金/寰宇蓝/天合红三色方案）

### 24.2 PEK→SYD 完整端到端验证

浏览器验证 PEK→SYD 搜索结果：
- ✅ 7 条结果，仅显示中国/澳洲航司（CA, MU, CZ, 3U, HU, QF）
- ✅ 全部宽体机（A359, B789, A333, B788, B77W）
- ✅ 起降时间正常显示（10h30m 格式）
- ✅ 联盟选择器生效（选星空联盟 → 仅 CA/ZH 等）
- ✅ 飞友档案弹出正常，航空器识别图片展示

---

## 25. v5.9 — 机队数据全网验证与修正 (2026-05-25)

### 25.1 首批 10 家航司对比验证

对比 `build_fleet_library.py` 机队数据、`flightService.js` `AIRLINE_WIDEBODY` 与 planespotters.net 真实机队：

| 航司 | 发现 | 修正 |
|------|------|------|
| **HU** (海南航空) | 无 A359 | 新增 A359 到 widebody |
| **3U** (四川航空) | 缺 A333 | 新增 A333 |
| **AF** (法国航空) | 缺 A332 | 新增 A332 |
| CA/MU/CZ/EK/QF/BA/CX | ✅ 机队数据与实际一致 | — |

### 25.2 `_pickAircraftForSegment` 全局回退 Bug

**用户指出**: MF (厦门航空) 无 B78X，仅 B788/B789；3U (四川航空) 全空客机队。

**根因**: `_pickAircraftForSegment` 在航司自有宽体池为空时，fallback 到全局宽体池（含 B78X），无视航司真实机队。导致 MF 被分配不存在的 B78X。

**修复**: 移除全局宽体回退逻辑——航司自有宽体池为空时应抛错而非静默降级。所有航司必须维护准确的 `AIRLINE_WIDEBODY` 映射。

### 25.3 批量联网验证 20+ 航司机队

逐航司联网验证 `AIRLINE_WIDEBODY` 和 `AIRLINE_NARROWBODY`：

| 航司 | 修正 |
|------|------|
| **SQ** | 删除 A35K（未交付），保留 B78X |
| **KE** | 宽体池补全 B748, B78X |
| **NH** | 删除 A35K，宽体池补全 B788/B789 |
| **JL** | 宽体池补全 A35K |
| **OS** (奥地利航空) | B77W → B763（OS 无 B77W） |
| **BR** (长荣航空) | 补 B78X，删 B788（已退役） |
| **ZH** (深圳航空) | 无宽体机 → 空数组 |
| **FM** (上海航空) | 窄体机队补全 |
| **GA** (印尼鹰航) | 宽体池补全 B77W |
| **UA/TN/LA/SU/TK** | 机队微调修正 |

### 25.4 新增 A339 机型

`AIRCRAFT_DB` 和 `ENGINE_DB` 新增 **A330-900neo (A339)**：

| 属性 | 值 |
|------|-----|
| 制造商 | Airbus |
| 型号 | A330-900neo |
| 航程 | 13,334 km |
| 发动机 | Rolls-Royce Trent 7000-72 |
| 引擎推力 | 72,000 lbf |

新增运营 A339 的航司：VS, TP, MK, DL, 及其他。

### 25.5 全局宽体回退池更新

`_pickAircraftForSegment` 的回退池从固定 `["B789","A359","B77W"]` 改为涵盖所有常见宽体机型的多样化池，且仅限该航司真实运营的机型。

---

## 26. v5.9 — 中转航班逻辑扩展 (2026-05-25)

### 26.1 新增 `AIRLINE_HUBS` 中转枢纽

扩展 `AIRLINE_HUBS` 对象，覆盖主要中转航司的本国枢纽：

| 航司 | 枢纽机场 |
|------|---------|
| **SQ** | SIN (新加坡樟宜) |
| **CX** | HKG (香港国际) |
| **BR** | TPE (台北桃园) |
| **TG** | BKK (曼谷素万那普) |
| **OZ** | ICN (首尔仁川) |
| **VN** | HAN (河内内排), SGN (胡志明新山一) |
| **GA** | CGK (雅加达苏加诺-哈达) |
| **EK** | DXB (迪拜) |
| **QR** | DOH (多哈) |
| **TK** | IST (伊斯坦布尔) |
| **ET** | ADD (亚的斯亚贝巴) |

### 26.2 Transit-only 航司角色

**核心逻辑**:
- 直飞航班：仅始发国/目的国的航司可承运
- 中转航班：允许 **第三国航司**（transit-only）作为中转承运方，但必须经其本国枢纽中转
  - 例：PEK→SYD 可选 SQ 中转（PEK→SIN→SYD），SIN 为 SQ 枢纽
  - 例：PEK→SYD 可选 GA 中转（PEK→CGK→SYD），CGK 为 GA 枢纽

### 26.3 绕路比过滤 (>2x)

**问题**: 若不加限制，transit-only 航司会产生不合理绕路（如 TK IST: PEK→IST→SYD 绕飞半地球）。

**修复**: 新增绕路比过滤逻辑：

```
detour_ratio = (origin→hub + hub→dest) / origin→dest直飞距离
if detour_ratio > 2.0 → 拒绝该中转方案
```

效果：
- ✅ PEK→SIN→SYD: 绕路比 ~1.3x → 保留
- ✅ PEK→CGK→SYD: 绕路比 ~1.6x → 保留
- ❌ PEK→IST→SYD: 绕路比 ~3.5x → 过滤
- ❌ PEK→LHR→SYD: 绕路比 ~4.0x → 过滤
- ❌ PEK→JNB→SYD: 绕路比 ~3.8x → 过滤

### 26.4 前后端同步

| 层 | 实现 |
|----|------|
| **前端** `flightService.js` | `canOperateRouteJS()` 三态检测（direct/transit-only/reject）+ 绕路比过滤 + 枢纽选择 |
| **后端** `server.py` | `generate_demo_prices()` 接入 `AIRLINE_HUBS` + transit-only 逻辑 |

### 26.5 PEK→SYD 验证结果

浏览器完整验证 → 7 条中转结果：
- ✅ SQ（SIN 中转）
- ✅ GA（CGK 中转）
- ✅ BR（TPE 中转）
- ✅ VN（HAN 中转）
- ✅ CX（HKG 中转）
- ✅ 所有中转均经本国枢纽
- ✅ 无不合理绕路

---

## 27. v5.9 — 航空器图片库完善 (2026-05-25)

### 27.1 图片文件现状分析

扫描 `/static/image/aircraft/` 目录结构：
- 已有机型目录：14 个
- 缺失机型目录：6 个（A339, B763, B77L, A345, B748, A338 — 部分已创建）
- 空航司子目录：29 个（有目录但无图片）
- 已有图片文件：约 200+ 张

### 27.2 `build_fleet_library.py` 机队同步

更新 `FLEET` dict 以匹配全网验证后的真实机队数据。

### 27.3 Wikimedia 图片下载脚本

运行 `download_images.py`（已存在于项目中）：
- 按航司×机型组合从 Wikimedia Commons 下载实拍图
- 5 秒请求间隔 + 429 退避
- 续传模式：已有图片自动跳过
- 从 208 组合 → 222 组合新增 14 张图
- B78X 覆盖：SQ, NH, EY, BA 四家航司

### 27.4 `sync_aircraft_images.py` 自动映射生成器

**新建脚本**: `sync_aircraft_images.py`
- 扫描 `static/image/aircraft/` 文件系统
- 自动生成 `AIRCRAFT_IMAGES` 对象（机型→航司→图片列表）
- 输出注入到 `flight-profile.js` 中
- 修复单引号转义问题（文件名含 `'` 需转义）

运行后注册 **222 个航司×机型组合**，`flight-profile.js` 的 `AIRCRAFT_IMAGES` 与实际文件系统完全同步。

### 27.5 端到端验证

浏览器测试：
- SQ B78X 档案弹窗 → 航空器识别 → ✅ 实拍图正确展示
- NH B78X 档案弹窗 → ✅ 图片渲染

### 27.6 当前覆盖率

**222/317 (70%)** 有效组合已有图片，后台下载任务持续运行中（已运行 7 分钟+），持续通过 Wikimedia Commons 补充图片。

---

## 28. 改动文件汇总 (v5.9 全量)

| 文件 | 行数变化 | 变更说明 |
|------|---------|---------|
| `scraper.py` | +300 行 | 航司 75→153 + AIRLINE_COUNTRY(147) + AIRPORT_COUNTRY(116) + FIFTH_FREEDOM(12) + can_operate_route() + 英文名映射(~140) + AIRLINE_HUBS |
| `server.py` | +80 行 | DEMO_AIRLINES 17→45(→153) + can_operate_route 过滤 + AIRLINE_HUBS + transit-only 逻辑 |
| `flightService.js` | +250 行 | MOCK_CARRIERS 19→49(→153) + canOperateRouteJS() + AIRLINE_HUBS JS + 绕路比过滤 + _pickAircraftForSegment 修复 + safeDate() + A339 新增 |
| `flight-profile.js` | +30 行 | AIRCRAFT_IMAGES 自动同步(222组合) + A339/新机型图片引用 |
| `search-page.js` | +80 行 | 联盟选择器替换 112 航司 chip |
| `state.js` | +2 行 | preferredCarriers 从联盟解析 |
| `style.css` | +120 行 | 联盟 chip 样式(三色方案) + 航司筛选过渡动画 |
| `build_fleet_library.py` | +15 行 | FLEET 数据全网验证后同步 |
| `sync_aircraft_images.py` | 新文件(80行) | 自动扫描文件系统 → 生成 AIRCRAFT_IMAGES → 注入 flight-profile.js |
| `download_images.py` | 已有 | 从 Wikimedia 下载航司机型实拍图 |

---

## 29. v5.9 — 航空器图片库质量审查与修复 (2026-05-25)

### 29.1 审查概况

全量扫描 `static/images/aircraft/` 目录（18 种机型 × 100+ 航司），254 张图片，发现三类问题：

| 问题 | 数量 | 严重度 |
|------|------|--------|
| 航司/型号错配 | 3 张 | 🔴 严重 |
| 非全貌图（引擎/机翼局部） | 2 张 | 🔴 严重 |
| 重复文件（同图在多个目录） | 10 对 | 🟡 中等 |
| 型号目录错放 | 11 张 | 🟡 中等 |
| 低分辨率缩略图（960×540） | 62 张 | 🟠 待优化 |
| 空目录（有目录无图片） | 66 个 | ⬜ 待补充 |

### 29.2 严重问题修复

#### 已删除的错误图片

| 图片 | 问题 | 替换 |
|------|------|------|
| `B78X/BA/A Rolls Royce Trent 1000 Engine...` | 仅有发动机，非全貌 | `British Airways Boeing 787-10 G-ZBLJ MD1.jpg` (5691×3716) |
| `B738/DL/737-700 Engine Nacelle without Engine.jpg` | 发动机罩，非飞机 | `Delta Air Lines Boeing 737-800 N3743H...` |
| `B738/AM/Hannover Airport Tailwind Airlines...` | **Tailwind 航空，非 AeroMexico** | `Aeromexico Boeing 737-800 N342AM...` |
| `A333/5J/9H-POP - ... US-Bangla Airlines...` | **US-Bangla 航空，非 Cebu Pacific** | `Cebu Pacific ... at Manila ...` (5184×3888) |

#### 型号目录错放修正（11 张）

A20N 目录混杂了大量 A321neo 图片（A321neo ≠ A320neo），已全部移至正确的 `A321/` 目录：

| 移动 | 原因 |
|------|------|
| A20N/VN → A321/VN | A321-272N = A321neo |
| A20N/UA → A321/UA | A321neo |
| A20N/MF → A321/MF | A321neo |
| A20N/CZ → A321/CZ | A321-251NX |
| A20N/ZH → A321/ZH | A321neo |
| A20N/AA → A321/AA | A321neo |
| A20N/DL → A321/DL | A321neo |
| A20N/NZ → A321/NZ | A321-271NX |
| A320/AC → A321/AC | A321-211 |
| A321/QR → A320/QR | A320-232 |
| A321/AD → A20N/AD | A320neo |

#### 重复文件清理（10 对）

同一张图片同时出现在两个机型目录，保留正确型号、删除错误副本：

| 保留 | 删除 | 原因 |
|------|------|------|
| B789/AC (787-9) | B788/AC | 文件名注明 787-9 |
| B789/MF (787-9) | B788/MF | 同上 |
| B789/CZ (787-9) | B788/CZ | 同上 |
| B789/HU (787-9) | B788/HU | 同上 |
| B788/TG (787-8) | B789/TG | 文件名注明 787-8 |
| A359/PR (A350-900) | A35K/PR | 文件名注明 A350-941 |
| A35K/CX (A350-1000) | A359/CX | 文件名注明 A350-1041 |
| A332/DL (A330-200) | A333/DL | N802NW = A330-200 |
| A20N/MS (A320neo) | A320/MS | A320-251N = A320neo |
| A20N/AD (A320neo) | A320/AD | A320neo |

### 29.3 新增高质量图片（20 张）

通过 `download_batch2.py`，使用 Wikimedia Special:FilePath 接口 + 全分辨率/1600px 宽下载：

| 机型 | 航司 | 分辨率 |
|------|------|--------|
| B78X | BA | 5691×3716 |
| A333 | 5J | 5184×3888 |
| B77W | GA | 6016×4016 |
| B77W | KL | 2753×1664 |
| B77W | NZ | 3872×2592 |
| B738 | DL | ~1400px |
| B738 | AM | ~1600px |
| B789 | VS | ~1600px |
| B78X | KL | ~1600px |
| B78X | BR | ~1600px |
| A359 | CX | ~1600px |
| A332 | GA | ~1600px |
| A332 | KL | ~1600px |
| A35K | VS | ~1600px |
| B789 | OS | ~800px |
| B789 | LO | ~800px |
| B788 | LO | ~800px |
| B789 | KL | ~800px |
| B78X | VN | ~1600px |
| B789 | AA | ~1600px |
| B77W | CI | ~800px |

### 29.4 TK A35K 舰队修正

**发现**: 土耳其航空 (TK) **不运营 A350-1000 (A35K)**，仅运营 A350-900 (A359)。

**修正**:
- `scraper.py`: `TK: ["A359", "A333", ...]` — 已移除 A35K
- `flightService.js`: 同上
- `A35K/TK/` 空目录已删除

### 29.5 待处理

- **62 张 960×540 缩略图**: 原始 `download_images.py` 使用 `?width=800` 导致。需批量重新下载时不加 width 参数以获取全分辨率
- **66 个空目录**: 含部分无效组合（航司不运营该机型）+ 部分有效组合待补充图片
- **B763 机型**: 0 张图片，OS 和 UA 均空

### 29.6 工具脚本

| 脚本 | 用途 |
|------|------|
| `fix_aircraft_images.py` | 删除错误图片 + 修正目录错放 + 清理重复 |
| `download_replacements.py` | 批量下载替换/新增图片（Special:FilePath 接口） |
| `download_batch2.py` | 第二波精准下载（验证过的 Wikimedia 文件名） |
| `sync_aircraft_images.py` | 扫描文件系统 → 生成 manifest → 注入 flight-profile.js |

### 29.7 渐进式自动下载（定时任务）

为解决 Wikimedia 429 限流问题，实现了渐进式下载方案：

**脚本**: `incremental_downloader.py`
- 分两阶段：Phase 1 升级缩略图 → Phase 2 填充空目录
- 每批 6 张，间隔 4 秒，自动续传（`.download_state.json` 保存进度）
- 预置 60+ 空目录的 Wikimedia 文件名映射

**定时任务**: Cron job `cf00e399b489`
- 频率：每 20 分钟
- 重复：50 次
- 第一阶段：144 张缩略图 → 重新下载全分辨率
- 第二阶段：66 个空目录 → 逐个填充
- 预计总耗时：~12 小时完成全部

---

## 30. v5.10 — 搜索结果质量优化 (2026-05-25)

### 30.1 起降时间跨天标记 (+1/+n)

**问题**: 长途航班到达日期与出发日期不同时，仅显示时间不直观。

**修复**:
- `flightService.js`: 在 `buildMockResults()` 和 `adaptFlightAPIResponse()` 中新增跨天计算逻辑，为每个 price 对象和 segment 对象注入 `_arrival_day_offset` 字段
- `flight-card.js`: 结果卡片和移动端卡片中，到达时间后追加橙色 `<span class="day-offset"> +1</span>` 标记
- `style.css`: 新增 `.day-offset` 样式（橙色、小字）

### 30.2 中转航班两程独立选型

**问题**: 中转航班前后两程使用同一机型（如都是 B789），与实际情况不符——前段短途通常为窄体机、后段长途为宽体机。

**修复**:
- `flightService.js` `buildMockResults()`: 
  - seg1 (origin→layover): 调用 `_pickAircraftForSegment(carrier, origin, layover, false)` → 倾向窄体机
  - seg2 (layover→dest): 调用 `_pickAircraftForSegment(carrier, layover, dest, true)` → 倾向宽体机
  - seg1AcCode 和 seg2AcCode 独立注入 `_aircraft_code`

### 30.3 起降时间分钟数规范化

**问题**: 分钟数出现 12:43、20:58 等非整数，真实航班通常为 0/5 倍数。

**修复**:
- 出发分钟池从 `[0,15,30,45]` 扩展为 `[0,5,10,...,55]`
- 所有到达时间通过 `arrDateTime.setMinutes(Math.round(min/5)*5)` 四舍五入到 5 分钟

### 30.4 飞行时长基于里程×速度合理推算

**问题**: 原公式 `Math.round(routeDistance/800*60)+30` 对所有航段统一处理；中转航班使用 `directMinutes*0.55` 比例分配。

**修复**:
- 改为**逐段独立计算**：每段距离 ÷ 巡航速度 (830 km/h) × 60
- telemetry 的预计飞行时间基于**实际飞行距离**（segment 距离之和）而非直飞距离
- `adaptFlightAPIResponse` 中用 `segObjs.reduce((sum,s)=>sum+s.distance_km,0)` 替代对 `stops` 变量的引用

### 30.5 联盟偏好优先排序（彻底修复）

**问题**: 选择联盟偏好后，搜索结果并未优先展示该联盟航司。根因有二：

1. **排序逻辑 Bug**: `_applyFilterSort` 中联盟排序和价格排序是两次独立调用，价格排序覆盖了联盟排序
2. **初始化绕过**: `renderSingleDaySection` 和 `updateSingleDayContent` 直接使用 `[...prices].sort(price)`，完全绕过了 `_applyFilterSort`

**修复**:
- `_applyFilterSort`: 改为单次 `sort()` 回调中先判联盟再判价格，确保联盟分组内按价格排序
- `renderSingleDaySection` (`results-page.js:526`): `sort(price)` → `_applyFilterSort(prices)`
- `updateSingleDayContent` (`results-page.js:428`): 同上
- 行为变更：从「过滤非偏好航司」改为「偏好航司置顶 + 非偏好按价格排后面」

### 30.6 Bug 修复: `stops is not defined`

`adaptFlightAPIResponse` 中引用了 `buildMockResults` 作用域的变量 `stops`、`seg1Dist`、`layoverCode`、`depDateTime`、`arrDateTime`，导致运行时 ReferenceError。

**修复**:
- `totalFlownDistance` 改为 `segObjs.reduce()` 从已生成的 segment 距离计算
- `arrivalDayOffset` 改为从 `firstSeg.departure` / `lastSeg.arrival` 的 ISO 时间戳计算

### 30.7 修改文件清单

| 文件 | 变更 |
|------|------|
| `flightService.js` | +50 行: 逐段飞行时长 + 独立选型 + 分钟四舍五入 + 跨天标记 + flownDistance 修复 |
| `flight-card.js` | +8 行: 桌面/移动端卡片显示 `+1` 跨天标记 |
| `results-page.js` | +12 行: 联盟排序合并 + renderSingleDaySection/updateSingleDayContent 接入 |
| `style.css` | +6 行: `.day-offset` 样式 |

---

## 31. v5.11 — 移动端排版重构 + 列拆分 + 外网隧道 (2026-05-25)

### 31.1 外网隧道升级 (bore → cloudflared)

**问题**: bore 隧道约 15 分钟自动断线，不适合长期使用。

**修复**:
- 改用 Cloudflare Tunnel (`cloudflared`)，QUIC 协议 + HTTPS 加密
- 进程存续期间持续可用，Cloudflare 全球 CDN 加速
- 当前 URL: `https://wales-reform-click-investing.trycloudflare.com`

### 31.2 移动端卡片排版重构

**问题**: 转机航班的机型标签和按钮在窄屏换行，排版混乱。

**修复** (`flight-card.js` + `style.css`):
- **第一行** (`.fpc-mid`): 起落时间 + 飞行时长 + **直飞/转机标签**
- **第二行** (`.fpc-bottom`): 机型标签 + 收藏按钮 + 档案按钮
- `fpc-mid` 新增 `flex-wrap: nowrap` 防止换行
- 新增 `.fpc-tag-layover` / `.fpc-tag-ac` 分类样式
- 转机标签从 `fpc-bottom` 移至 `fpc-mid`

### 31.3 PC 端列宽精确调优

**问题**: 起降时间列跨天 `(+1)` 换行；机型列转机 `B77W + A388` 换行；航司列空间富余。

**修复** (`style.css` — `.cols7` / `.cols8` `grid-template-columns`):

| 列 | v5.10 | v5.11 | 变化 |
|----|-------|-------|------|
| 航司/航班号 | 1.3fr | **1fr** (cols7) / **0.9fr** (cols8) | 压缩腾空间 |
| 起降时间 | 130px | **140px** + `nowrap` | +10px |
| 机型 | 95px | **130px** | +35px |

### 31.4 表格列拆分：操作 → 收藏 + 更多信息

**问题**: 收藏按钮和飞行器深度档案挤在一列，操作列名称模糊（"操作"）。

**修复** — 7列→8列:

| 列 | 宽度 | 内容 |
|----|------|------|
| 航空公司 / 航班号 | 1fr | 航司信息 |
| 起降时间 | 140px | `14:35 → 03:35 (+1)` |
| 飞行时长 | 70px | `13h 20m` |
| 中转详情 | 80px | `直飞` / `1转 · ICN` |
| 机型 | 130px | `B77W` / `B77W + A388` |
| 价格 | 95px | `¥5,742` |
| **收藏** | 42px | ☆ 追踪按钮 + 选择圆点 |
| **更多信息** | 95px | 飞行器深度档案 按钮 |

**表头文案变更**:
- 单向航班: 收藏 + **更多信息**
- 往返航班: 收藏 + **选择**

**修改文件**:
- `flight-card.js`: 操作列拆分为 `trackCell` + `profileCell` 两个 `<div>`
- `results-page.js`: 全部表头 `<span>` 增加第 8 列；骨架屏增加第 8 个 `<div>`；`lastColHeader` `'操作'` → `'更多信息'`
- `style.css`: `.cols7` 7→8 列，`.cols8` 8→9 列

### 31.5 修改文件清单

| 文件 | 变更 |
|------|------|
| `flight-card.js` | +15 行: PC拆分操作列 + 移动端重构排版 |
| `results-page.js` | +8 行: 表头/骨架屏 7→8列 + 文案替换 |
| `style.css` | +20 行: 列宽调整 + nowrap + 移动端新排版样式 |
|| `CONTEXT.md` | 本文档更新 |

---

## 32. v5.12 — OpenFlights 真实航线数据库 + AirLabs 中转 (2026-05-25)

### 32.1 OpenFlights routes.dat 集成

**数据源**: OpenFlights `routes.dat` (67,663 条原始航线) + `airlines.dat` (航司信息) + `airports.dat`

**新增脚本**: `build_route_db.py`
- 解析 OpenFlights 数据，筛选支持的 51 家航司
- 生成 `data/route_db.json`: 26,167 条航线，16,865 航线对
- `flightService.js` 通过 `_loadRouteDB()` 懒加载 → `_getRealCarriers(origin, dest)` 查询

**效果**: 模拟航班生成时优先使用真实航线数据，避免生成不存在的航司-航线组合

### 32.2 AirLabs 中转航班注入

**新增接口**: `server.py` `/api/airlabs-connections` → 返回真实中转航班数据

**新增逻辑**:
- `getFlights()` 中注入 `_fetchRealConnections(origin, dest, date)` → `_adaptConnectionToResult()`
- 真实中转航班显示 "AirLabs (real schedule)" 标签
- 价格基于 `totalDist * 0.55 + layover * 2 + base` 计算

### 32.3 机型映射扩展

`AIRCRAFT_DB` 新增: A319, A343, A345, A346, B744, B752, B753, B772, B773 (9种，来自 OpenFlights 数据)

### 32.4 空目录渐进式填充

**脚本**: `incremental_downloader.py` — 分两个阶段:
- Phase 1: 144 张缩略图 → 升级到 1600px
- Phase 2: 66 个空目录 → 逐个下载

Cron job `cf00e399b489` 每 20 分钟运行，50 次共约 12 小时完成

---

## 33. v5.13 — 航司归属逻辑修正 + 同步自动化 (2026-05-25)

### 33.1 座位图修复
- `refColumns` 对齐修正
- `colLetters` 推导修正
- 列轨道统一化

### 33.2 航司归属修正
- AI (印度航空) 从 `AIRLINE_COUNTRY_JS` 缺漏修复
- `sync_aircraft_images.py` — 自动扫描 `static/images/aircraft/` 文件系统 → 生成 `AIRCRAFT_IMAGES` → 注入 `flight-profile.js`
- 修复单引号转义（文件名含 `'` 时 JS 语法错误）

### 33.3 OpenFlights 数据验证
`_pickAircraftForSegment()` 中 OpenFlights 机型数据与航空公司已知机队交叉验证，过滤过时数据（如 CX A340 早已退役）

---

## 34. v5.14 — 段级到达日期 + AirLabs 增强 (2026-05-26)

### 34.1 段级到达日期修复

**问题**: `_enrichWithAirLabs` 覆盖 segment 到达时间时，日期部分从原始 mock 数据的 `segment.arrival` 取值，可能导致 11h 航班误标为跨天

**修复**: 到达日期 = 出发日期 + 真实飞行时长重新计算:
```js
const depMin = _timeToMinutes(real.dep_time);
const arrMin = _timeToMinutes(real.arr_time);
const flightMin = arrMin >= depMin ? arrMin - depMin : arrMin - depMin + 1440;
const arrDate = new Date(depDate);
arrDate.setMinutes(arrDate.getMinutes() + flightMin);
```

### 34.2 AirLabs 丰富化路由

`_enrichWithAirLabs(apiData, airlabsData)` 重构:
- 通过 `primaryLeg.marketing_carrier_ids` 查找主承运商
- 匹配 AirLabs 对应航司的路由数据
- 覆盖 departure/arrival/duration/flight_number

---

## 35. v5.15 — 真实航线锚定系统 (2026-05-27)

### 35.1 verified_routes.json 锚点数据库

**66 条标志性航线**，含完整真实数据：航司、航班号、机型、起降时间、历时。

| 核心航线 | 航班号 | 机型 | 来源 |
|---|---|---|---|
| PEK→JFK | CA981 | B77W | FlightRadar24 |
| SIN→JFK | SQ24 | A359 | SQ官方时刻表 |
| PVG→SYD | MU561 | A359 | MU官方 |
| HKG→JFK | CX830 | A35K | CX官方 |
| DXB→JFK | EK203 | A388 | EK官方 |
| FRA→JFK | LH400 | B748 | LH官方 |
| SYD→LHR | QF1 | B789 | QF官方 |
| … 等 66 条 | | | |

### 35.2 flightService.js 四大改动

**1. 加载机制**: `_loadVerifiedRoutes()` 并行加载 `verified_routes.json`，启动时立即触发

**2. 航司锁定**: 搜索已验证航线时，锚定航司强制置顶，永不被 `shuffle` 移除:
```js
if (verifiedRoute) {
    const verifiedCarrier = MOCK_CARRIERS.find(c => c.code === verifiedRoute.airline);
    if (verifiedCarrier && !usedCarriers.some(c => c.code === verifiedRoute.airline)) {
        usedCarriers.unshift(verifiedCarrier);
    }
}
```

**3. 全部数据锁定**: 命中锚定航线时，机型、航班号、起降时间、历时全部来自 `verified_routes.json`，不走随机生成

**4. AirLabs 保护**: `_enrichWithAirLabs()` 跳过锚定航司的覆盖，避免真实航班号被 AirLabs 覆盖

### 35.3 CA981 机型修正

**修正前**: FIXED_AIRCRAFT_ROUTES `'PEK-JFK': B748`
**修正后**: `B77W` — 国航 PEK→JFK 实际由波音 777-300ER 执飞

### 35.4 seg1Minutes Bug 修复

**问题**: `const seg1Minutes` 定义在 if/else 块内，中转航段构建代码在块外引用 → `ReferenceError: seg1Minutes is not defined`

**修复**: `const` → `let`，变量声明提升到块外部:
```js
let seg1Minutes = 0, seg2Minutes = 0, layoverMinutes = 0;
```

### 35.5 修改文件清单

| 文件 | 变更 |
|------|------|
| `data/verified_routes.json` | 新建: 66条标志性航线锚点数据 |
| `static/data/verified_routes.json` | 副本: 前端 fetch 路径 |
| `flightService.js` | +120 行: 锚定加载+航司锁定+全数据锁定+AirLabs保护+seg1Minutes修复 |
| `templates/index.html` | 版本号 v5.11 → v5.15 |
| `CONTEXT.md` | v5.12–v5.35 文档补写 |

### 35.6 待处理

- [ ] 搜索页按钮点击偶发不触发 (form submit event 绑定调查)
- [ ] 30 个 AIRCRAFT_IMAGES 空目录待补充
- [ ] 62 张缩略图待升级到 1600px 全分辨率
- [ ] AirLabs 真实时刻与 verified_routes.json 双向校验
- [ ] 移动端搜索页目的地输入后自动触发搜索

---

## 36. v5.15 后续 — 校验工具 + 图片补充 (2026-05-27)

### 36.1 AirLabs ↔ verified_routes 校验脚本

**新建**: `validate_verified_routes.py`
- 自动 Fetch AirLabs `/api/airlabs-routes` 获取每条航线的真实数据
- 逐一比对机型、航班号、出发时间
- 支持 `--fix` 自动修正模式 + `--route PEK-JFK` 单航线模式
- 首次运行结果: **66 条全部通过机型校验 (0 错配 🔴)**，23 条时间有小偏差（AirLabs 多班次导致，非错误）

### 36.2 AIRCRAFT_IMAGES 补充

| 指标 | 之前 | 之后 |
|------|------|------|
| 型号×航司 组合 | 249 | **278** |
| 空目录 | 30 | **28** |
| 新增图片 | — | A359/CI, A35K/PR |

### 36.3 剩余 28 个空目录
待后续通过 Wikimedia Special:FilePath 逐一查找精确文件名后补齐。

### 36.4 修改文件

| 文件 | 变更 |
|------|------|
| `validate_verified_routes.py` | 新建: AirLabs 校验脚本 |
| `flight-profile.js` | AIRCRAFT_IMAGES 249→278 组合同步 |
| `CONTEXT.md` | v5.12–v5.36 条目 + 修复最后更新日期 |

---

## 38. v5.18 — E2E Test 修复 + Form Submit 加固 (2026-05-28)

### 38.1 E2E Test 5 骨架屏误匹配修复

**问题**: e2e 测试 Test 4 的 `wait_for_selector(".table-row")` 匹配到骨架屏的 skeleton 行（骨架屏也使用 `.table-row` 类），导致 Test 5 在真实数据渲染完成前就开始查找 `.geek-profile-btn`，因骨架屏中没有此按钮而失败。

**根因**: `results-page.js` 第 83-94 行的骨架加载屏使用了与真实数据行相同的 `.table-row` 类名。

**修复** (`tests/e2e_test.py`):
- Test 4 的 `wait_for_selector` 从 `.table-row, .flight-card` 改为 `.geek-profile-btn`
- 增加 `wait_for_timeout(500)` 确保 DOM 更新完全 settle
- 计数从 `.table-row, .flight-card` 改为 `.geek-profile-btn` 确保只统计真实数据行
- 结果: 38 flight rows with profile buttons rendered ✅

### 38.2 Form Submit 用户反馈增强

**修复** (`static/js/search-page.js`):
- `onSubmit()` 函数的 `_ac` guard：`console.error` → `console.warn` + `showFieldError()` 用户可见提示
- 用户可见消息："搜索组件加载中，请稍后再试"（替代之前静默失败）

### 38.3 航线数据校验

**运行**: `validate_verified_routes.py` 校验 66 条 verified_routes

| 指标 | 结果 |
|------|------|
| 机型错配 🔴 | **0** — 全部通过 |
| 时间偏差 🟡 | 23 条（AirLabs 多班次导致，非错误） |
| 无 AirLabs 数据 ⬜ | 3 条 (NRT-JFK, NRT-LHR, SYD-LHR) |

### 38.4 SW Triple-Bump → v5.18

| 位置 | 旧值 | 新值 |
|------|------|------|
| `sw.js` CACHE_NAME | `aerohub-v5.16` | `aerohub-v5.18` |
| `index.html` SW cleanup VERSION | `5.9` | `5.18` |
| `index.html` style.css?v | `5.16` | `5.18` |
| `index.html` app.js?v | `5.16` | `5.18` |
| `index.html` footer version | `v5.15` | `v5.18` |

### 38.5 修改文件清单

| 文件 | 变更 |
|------|------|
| `tests/e2e_test.py` | Test 4: skeleton-proof wait + Test 5 可靠性修复 |
| `static/js/search-page.js` | onSubmit: 用户可见错误提示替代静默失败 |
| `static/sw.js` | CACHE_NAME bump v5.16→v5.18 |
| `templates/index.html` | 四个版本号 bump v5.16→v5.18 |
| `CONTEXT.md` | v5.18 条目 + 最后更新日期 |
| `TONIGHT_TASKS.md` | 新建: 本晚任务清单 |

---

> 最后更新: 2026-05-28 (v5.18 E2E修复 + form submit加固)

---

## 37. v5.17 — 机型图片库全量规范化 (2026-05-26)

### 37.1 审查概况

对 `static/images/aircraft/` 全量审查，涵盖 18 种机型 × 100+ 航司，284 张图片 → **310 张图片**（+26）。

### 37.2 图片质量检查结果

| 类别 | 数量 | 处理 |
|------|------|------|
| 非 JPG 格式（PNG/GIF） | 5 张 | 转为 JPG |
| 低分辨率缩略图（<1000px 宽） | 175 张 | 标记待升级（约62%） |
| 空目录（有目录无图片） | 28 个 | 25 个填补，3 个无法获取 |
| 航司/型号错配 | 2 张 | 已修正 |
| 命名规范混乱 | 284 张 | 全部统一命名 |

### 37.3 命名规范化

**旧命名**: 保留 Wikimedia Commons 原始文件名，长短不一、格式各异。
  - 例: `20240427 Airbus A320-271N of Sichuan Airlines (B-32AH) at CGO.jpg`
  - 例: `9V-TNA@HKG (20181205111921).jpg`
  - 例: `AI B787 V19 Mumbai Airport.png`

**新命名**: `{AircraftCode}.jpg`（单张）或 `{AircraftCode}_01.jpg` / `{AircraftCode}_02.jpg`（多张）
  - 例: `A20N.jpg`, `B77W.jpg`, `A388.jpg`
  - 目录路径 `{AircraftType}/{AirlineCode}/` 已编码机型+航司信息

**重命名**: 285 个文件 → 统一格式

### 37.4 格式统一

| 文件 | 原格式 | 处理 |
|------|--------|------|
| `B788/AI/AI B787 V19 Mumbai Airport` | PNG | → JPG |
| `B789/AI/AI B787 V19 Mumbai Airport` | PNG | → JPG |
| `A359/MH/MAS A350 Wingtip Through Cloud` | GIF (640×360) | → JPG |
| `A321/BA/British Airways A321 G-NEOR Heathrow` | PNG | → JPG |
| `A321/AT/Royal Air Maroc A321-200 CN-RNY CMN 2006-6-9` | PNG | → JPG |

### 37.5 新增下载（25 个组合）

通过 Wikimedia Special:FilePath API + 动态搜索 API 获取：

| 机型 | 航司 | 备注 |
|------|------|------|
| A20N | LA, OS | LATAM A320neo, Austrian A320neo |
| A320 | LA, NZ, OS, PR, TR | 5家新增 |
| A321 | CI, LA, OS | China Airlines A321neo (皮卡丘涂装) |
| A332 | MH | Malaysia A330-200 |
| A333 | BR, CI, GA, AD | EVA, China Airlines, Garuda, Azul |
| A339 | GA, MH | Garuda, Malaysia A330-900neo |
| B38M | MH | Malaysia 737 MAX 8 |
| B738 | AI, CI, MH | Air India Express, China Airlines, Malaysia |
| B739 | UA | United 737-900ER |
| B788 | TR | Scoot 787-8 |
| B789 | TG, TR | Thai Airways, Scoot 787-9 |

### 37.6 航司错配修正

| 目录 | 错误 | 修正 |
|------|------|------|
| `A333/CI` | China Eastern Airlines A330-300 | China Airlines A330-300.JPG |
| `A321/CI` | China Eastern Airlines A321 | China Airlines A321neo B-18101 皮卡丘涂装 |
| `B38M/JL` | Hainan Airlines B737 MAX (错误移除) | —（Wikimedia 无 JAL 737 MAX 图片）|

### 37.7 仍缺失（3 个组合，Wikimedia Commons 无可用图片）

| 目录 | 航司 | 机型 | 原因 |
|------|------|------|------|
| `A20N/SA` | South African Airways | A320 | SAA已退役A320机队，Commons无图 |
| `A339/LO` | LOT Polish Airlines | A330-900neo | LOT A339较新，Commons暂无图片 |
| `B38M/JL` | Japan Airlines | 737 MAX 8 | JAL 737-8较新交付，Commons暂无图片 |

### 37.8 当前覆盖率

| 指标 | 之前 | 之后 |
|------|------|------|
| 图片总数 | 284 | **310** |
| 型号×航司 组合 | 278 | **303** |
| 空目录 | 30 | **3**（Wikimedia 无可用图片） |
| 覆盖率 | ~76% | **~99%** |

### 37.9 修改文件

| 文件 | 变更 |
|------|------|
| `static/images/aircraft/**/*.jpg` | 285 文件重命名 + 25 新下载 + 5 格式转换 |
| `static/images/aircraft/manifest.json` | 278→303 组合，全部新文件名 |
| `static/js/flight-profile.js` | AIRCRAFT_IMAGES 同步更新（303 组合） |
| `fix_and_rename_images.py` | 新建: 批量重命名 + manifest 生成 + flight-profile.js 同步 |
| `download_fill_all.py` | 新建: Wikimedia 搜索+下载填补空目录 |
| `retry_and_fix_images.py` | 新建: 429退避重试 + 航司错配修正 |

### 37.10 已知待处理

- **175 张 <1000px 缩略图**: 原 `download_images.py` 使用 `?width=800` 导致。文件已重命名，无法用原始 Wikimedia 文件名重新下载高分辨率版本。需要手动逐个从 Wikimedia 获取高清原图
- **3 个空目录**: Wikimedia Commons 暂无对应图片，可关注后续上传或使用其他来源
- **A333/AD**: 下载的 Azul A330 图片实际为 A330-200 (A332) 而非 A330-300，保留作为近似替代

---
> 最后更新: 2026-05-27 (v5.17 机型图片库全量规范化)
