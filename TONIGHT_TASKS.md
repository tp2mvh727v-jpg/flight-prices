# TONIGHT_TASKS — v5.18 体验打磨
**日期: 2026-05-27 | 状态: ✅ 全部完成**

---

## Task 1: E2E 测试回归验证
**优先级: P0 | 预估: 0.5h**

- [ ] 运行 `python3 tests/e2e_test.py`
- [ ] 如失败，根据错误信息修复对应文件
- [ ] 确认 7/7 测试通过

---

## Task 2: 搜索按钮 loading 反馈
**优先级: P0 | 预估: 0.5h | 文件: results-page.js + style.css**

- [ ] 在 `results-page.js` 的 `renderResults()` 开头注入 loading HTML
- [ ] 在 `style.css` 添加 `.search-loading` 脉冲动画
- [ ] 数据加载完成后替换为实际结果
- [ ] SW 版本 bump: sw.js → v5.18, index.html → ?v=5.18

**实现方案:**
```js
// results-page.js renderResults() 开头:
const container = document.getElementById('resultsContainer');
container.innerHTML = '<div class="search-loading">🛰 正在扫描航线网络...</div>';
// ... 异步加载数据后替换 innerHTML
```

```css
/* style.css 新增: */
@keyframes searchPulse {
  0% { opacity: 0.3; transform: scale(0.95); }
  50% { opacity: 0.6; transform: scale(1.02); }
  100% { opacity: 0.3; transform: scale(0.95); }
}
.search-loading {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; padding: 60px 20px;
  color: var(--muted); font-size: 1rem;
  animation: searchPulse 1.8s ease-in-out infinite;
}
```

---

## Task 3: 趋势图 hover tooltip
**优先级: P1 | 预估: 1h | 文件: results-page.js**

- [ ] Chart.js 配置添加 `plugins.tooltip` 显示日期+价格+涨跌幅
- [ ] 移动端添加 `ontouch` 事件适配（点击节点显示 tooltip）
- [ ] tooltip 样式：半透明深色背景、圆角、白色文字

---

## Task 4: 移动端 ☆ 按钮扩大触控区
**优先级: P1 | 预估: 0.3h | 文件: style.css**

- [ ] `@media (max-width: 420px)` 中 `.fav-btn` min-width/min-height: 44px
- [ ] 增加 padding 保证图标居中
- [ ] 不可改动 PC 端样式

---

## 执行后检查清单

- [ ] `python3 tests/e2e_test.py` — 7/7 通过
- [ ] `sw.js` CACHE_NAME → 'aerohub-v5.18'
- [ ] `templates/index.html` style.css?v=5.18 + app.js?v=5.18
- [ ] `CONTEXT.md` 新增 v5.18 版本记录
- [ ] 浏览器验证 PEK→SYD 搜索正常
