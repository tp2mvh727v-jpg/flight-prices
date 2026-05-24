# CONTEXT.md — Aero-Hub 项目状态

> 最后更新: 2026-05-24 (v5.8.2 座舱图布局+航程距离精度修复)

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
| `server.py` | Flask 服务器 + /api/analytics + /sw.js 路由 | ~370 |
| `scraper.py` | Google Flights Playwright 抓取器 | ~400 |
| `build_fleet_library.py` | 机队图片库构建器 v3.0 — 真实机队映射 45航司×14机型 + Commons搜索/下载/续传 (v5.3) | ~310 |
| `download_images.py` | 指定图片批量下载器 — 精确文件名列表 | ~136 |

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
