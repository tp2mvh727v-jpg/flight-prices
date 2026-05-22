// ============================================================
// ResultsPage — single-day first, trend lazy-loaded on demand
// ============================================================

import AppState from './state.js';
import { fetchPrices, fetchDateRange } from './api.js';
import { renderFlightRow } from './flight-card.js';
import {
  sourceLabel, modeBadge, formatDate, formatPrice,
  getTripTypeLabel, escapeHtml
} from './utils.js';

let trendChart = null;
let trendPanelOpen = false;
let trendDataLoaded = false;
let trendDays = 14; // current selected day range
let trendResultsCache = []; // cached for tooltip date formatting & card strip

export function initResultsPage() {
  document.getElementById('backToSearch').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'search' } }));
  });
}

// ——— Entry: load ONLY single-day, nothing else ———

export async function renderResults() {
  trendDataLoaded = false;
  trendPanelOpen = false;
  trendDays = 14;

  const summary = AppState.getSearchSummary();
  updateResultsHeader(summary);

  document.getElementById('singleDaySection').innerHTML = `
    <div class="loading-state"><div class="spinner"></div>正在查询航班...</div>`;

  await loadSingleDay(summary);
  // NOTE: no trend pre-fetch — user must click the toggle to trigger it
}

// ——— Header ———

function updateResultsHeader(summary) {
  const routeText = `${summary.from.city} (${summary.from.code}) → ${summary.to.city} (${summary.to.code})`;
  document.querySelector('.search-summary .route-text').textContent = routeText;

  let dateInfo = formatDate(summary.departDate);
  if (summary.tripType === 'roundtrip' && summary.returnDate) {
    dateInfo += ` — ${formatDate(summary.returnDate)}`;
  }
  dateInfo += ` (${getTripTypeLabel(summary.tripType)})`;
  document.querySelector('.search-summary .date-info').textContent = dateInfo;

  document.getElementById('alertArea').innerHTML = '';
}

// ============================================================
//  SINGLE-DAY (always loaded, always primary)
// ============================================================

async function loadSingleDay(summary) {
  const container = document.getElementById('singleDaySection');
  const isDateSwitch = !!document.getElementById('singlePriceList');

  if (!isDateSwitch) {
    container.innerHTML = `
      <div class="loading-state"><div class="spinner"></div>正在查询航班...</div>`;
  }

  try {
    const data = await fetchPrices(summary.from.code, summary.to.code, summary.departDate);
    AppState.singleDayData = data;

    if (isDateSwitch) {
      updateSingleDayContent(data, summary);
    } else {
      renderSingleDaySection(data, summary);
    }
  } catch (e) {
    container.innerHTML = buildErrorState('网络请求失败，请检查服务器连接', () => loadSingleDay(summary));
  }
}

// ——— Surgical update for date switches — leaves trend panel intact ———

function updateSingleDayContent(data, summary) {
  const prices = data.prices || [];
  const dateStr = formatDate(data.date || summary.departDate);
  const sorted = [...prices].sort((a, b) => a.price - b.price);

  // Section header date
  const h2 = document.querySelector('#singleDaySection .section-header h2');
  if (h2) h2.textContent = `单日航班详情 — ${dateStr}`;

  // Mode badge
  const badge = document.getElementById('singleModeBadge');
  if (badge) badge.innerHTML = modeBadge(data);

  // Return-to-original button
  const existingBtn = document.getElementById('backToOriginalBtn');
  if (AppState.isViewingDifferentDate()) {
    const label = `← 返回基准日 (${formatDate(AppState.originalSearchDate)})`;
    if (existingBtn) {
      existingBtn.textContent = label;
    } else {
      const header = document.querySelector('#singleDaySection .section-header');
      const btn = document.createElement('button');
      btn.id = 'backToOriginalBtn';
      btn.className = 'back-to-original-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => returnToOriginalDate());
      header.appendChild(btn);
    }
  } else {
    if (existingBtn) existingBtn.remove();
  }

  // Stats grid
  const stats = document.querySelector('#singleDaySection .stats-grid');
  if (stats) stats.outerHTML = renderStatsGrid(prices);

  // Flight list
  const list = document.getElementById('singlePriceList');
  if (list) {
    list.innerHTML = sorted.length
      ? sorted.map((p, i) => renderFlightRow({ ...p, _index: prices.indexOf(p) }, data.date || summary.departDate, 7)).join('')
      : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>';
  }

  document.getElementById('sourceInfo').textContent = sourceLabel(data);
}

function renderSingleDaySection(data, summary) {
  const container = document.getElementById('singleDaySection');
  const prices = data.prices || [];
  const dateStr = formatDate(data.date || summary.departDate);

  // Sort: price low to high
  const sorted = [...prices].sort((a, b) => a.price - b.price);

  const returnBtnHtml = AppState.isViewingDifferentDate() ? `
        <button class="back-to-original-btn" id="backToOriginalBtn">
          ← 返回基准日 (${formatDate(AppState.originalSearchDate)})
        </button>` : '';

  container.innerHTML = `
    <div class="section">
      <div class="section-header">
        <h2>单日航班详情 — ${dateStr}</h2>
        <span id="singleModeBadge">${modeBadge(data)}</span>
        ${returnBtnHtml}
      </div>
      <div class="section-body">
        ${renderStatsGrid(prices)}
        <div class="table-header cols7">
          <span>航空公司 / 航班号</span><span>起降时间</span><span>飞行时长</span><span>中转详情</span><span>机型</span><span>价格</span><span>操作</span>
        </div>
        <div id="singlePriceList">
          ${sorted.length
            ? sorted.map((p, i) => renderFlightRow({ ...p, _index: prices.indexOf(p) }, data.date || summary.departDate, 7)).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>'
          }
        </div>
        <!-- Collapsible trend panel (lazy-loaded on click) -->
        <div class="trend-collapse" id="trendCollapse"></div>
      </div>
    </div>`;

  document.getElementById('sourceInfo').textContent = sourceLabel(data);

  // Render the toggle button (no data loaded yet)
  renderTrendToggle();

  // Bind return-to-original button if present
  const backBtn = document.getElementById('backToOriginalBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => returnToOriginalDate());
  }
}

// ============================================================
//  TREND — lazy-loaded on first click, cached in session
// ============================================================

function renderTrendToggle() {
  const anchor = document.getElementById('trendCollapse');
  if (!anchor) return;

  anchor.innerHTML = `
    <button class="trend-toggle" id="trendToggle">
      <span class="trend-toggle-icon">📊</span>
      <span class="trend-toggle-text">
        <span class="trend-toggle-title">查看前后${trendDays}天低价趋势</span>
        <span class="trend-toggle-savings" id="trendSavingsText">点击展开，按需加载附近日期价格走势</span>
      </span>
      <span class="trend-toggle-arrow" id="trendArrow">▸</span>
    </button>
    <div class="trend-panel" id="trendPanel">
      <div class="trend-panel-body" id="trendPanelBody"></div>
    </div>`;

  document.getElementById('trendToggle').addEventListener('click', () => toggleTrendPanel());
}

function toggleTrendPanel() {
  const summary = AppState.getSearchSummary();
  trendPanelOpen = !trendPanelOpen;
  const panel = document.getElementById('trendPanel');
  const arrow = document.getElementById('trendArrow');

  if (trendPanelOpen) {
    panel.classList.add('trend-open');
    if (arrow) arrow.textContent = '▾';

    // LAZY LOAD: only fetch when first opening
    // Trend is ALWAYS anchored to the original search date, not the current focus date
    if (!trendDataLoaded) {
      fetchTrendData(AppState.getTrendAnchorSummary(), trendDays);
    } else {
      // Re-render trend content to reflect current focus date highlight
      const results = AppState.trendData?.results || [];
      const activeIdx = results.findIndex(r => r.date === AppState.currentFocusDate);
      renderMiniChart(results, activeIdx >= 0 ? activeIdx : -1);
      renderDateGrid(results, summary, activeIdx >= 0 ? activeIdx : -1);
    }
  } else {
    panel.classList.remove('trend-open');
    if (arrow) arrow.textContent = '▸';
  }
}

// ——— Fetch trend data (triggered by first panel open OR day-range switch) ———

async function fetchTrendData(summary, days) {
  const body = document.getElementById('trendPanelBody');
  if (!body) return;

  body.innerHTML = '<div class="loading-state"><div class="spinner"></div>正在加载趋势数据...</div>';

  const origin = summary?.from?.code || AppState.origin;
  const dest = summary?.to?.code || AppState.dest;
  const start = summary?.departDate || AppState.originalSearchDate;

  try {
    const data = await fetchDateRange(origin, dest, start, days);
    AppState.trendData = data;
    trendDataLoaded = true;

    const currentPrices = AppState.singleDayData?.prices || [];
    const currentLowest = currentPrices.length
      ? Math.min(...currentPrices.map(p => p.price))
      : null;
    updateSavingsText(data, currentLowest);

    // Rendering happens in a separate try so API data is never lost on render errors
    try {
      renderTrendPanelContent(data, summary, days);
    } catch (renderErr) {
      console.error('renderTrendPanelContent failed:', renderErr);
      body.innerHTML = `
        <div class="error-state" style="padding:20px;">
          <p>趋势图表渲染失败：${escapeHtml(renderErr?.message || String(renderErr))}</p>
          <p style="font-size:0.85rem;color:var(--muted);">数据已加载，可能是 Chart.js CDN 加载超时。请刷新页面后重试。</p>
          <button class="btn" id="retryTrendRender">重新渲染</button>
        </div>`;
      document.getElementById('retryTrendRender').addEventListener('click', () => {
        renderTrendPanelContent(data, summary, days);
      });
    }
  } catch (e) {
    console.error('fetchTrendData failed:', e);
    const errMsg = e?.message || String(e) || '未知错误';
    body.innerHTML = `
      <div class="error-state" style="padding:20px;">
        <p>趋势数据加载失败：${escapeHtml(errMsg)}</p>
        <button class="btn" id="retryTrend">重试</button>
      </div>`;
    document.getElementById('retryTrend').addEventListener('click', () => fetchTrendData(summary, days));
  }
}

// ——— Render full trend panel content ———

function renderTrendPanelContent(data, summary, days) {
  const body = document.getElementById('trendPanelBody');
  const results = data.results || [];

  if (!results.length) {
    body.innerHTML = '<div class="empty-state" style="padding:20px;"><p>暂无趋势数据</p></div>';
    return;
  }

  body.innerHTML = `
    <div class="trend-days-tabs">
      <button class="trend-days-tab ${days === 7 ? 'active' : ''}" data-days="7">7天</button>
      <button class="trend-days-tab ${days === 14 ? 'active' : ''}" data-days="14">14天</button>
      <button class="trend-days-tab ${days === 30 ? 'active' : ''}" data-days="30">30天</button>
    </div>
    <div class="trend-summary-inline" id="trendSummaryInline"></div>
    <div class="mini-chart-wrap">
      <canvas id="trendMiniChart"></canvas>
    </div>
    <div class="date-grid-label">点击日期卡片或图表节点可切换查看当天航班详情</div>
    <div class="date-grid" id="dateGrid"></div>
  `;

  // Bind day-range tab clicks
  body.querySelectorAll('.trend-days-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const newDays = parseInt(tab.dataset.days);
      if (newDays !== trendDays) {
        trendDays = newDays;
        // Update toggle title
        const titleEl = document.querySelector('.trend-toggle-title');
        if (titleEl) titleEl.textContent = `查看前后${trendDays}天低价趋势`;
        // Re-fetch with new day count
        fetchTrendData(AppState.getTrendAnchorSummary(), newDays);
      }
    });
  });

  const currentDateStr = AppState.departDate;
  const activeIdx = results.findIndex(r => r.date === currentDateStr);

  renderMiniChart(results, activeIdx >= 0 ? activeIdx : -1);
  renderTrendInlineSummary(results);
  renderDateGrid(results, summary, activeIdx >= 0 ? activeIdx : -1);
}

// ——— Savings text on toggle ———

function updateSavingsText(trendData, currentPrice) {
  const el = document.getElementById('trendSavingsText');
  if (!el || !trendData || !trendData.results) return;

  const results = trendData.results;
  if (!results.length) {
    el.textContent = '暂无附近日期数据';
    return;
  }

  const prices = results.map(r => r.lowest);
  const bestPrice = Math.min(...prices);
  const bestResult = results[prices.indexOf(bestPrice)];

  if (currentPrice && bestPrice < currentPrice) {
    const saved = Math.round(currentPrice - bestPrice);
    el.textContent = `💰 ${bestResult.date} 最低仅 ${formatPrice(bestPrice)}，比当天省 ${formatPrice(saved)}！`;
  } else if (bestResult) {
    el.textContent = `📅 ${bestResult.date} 最低 ${formatPrice(bestPrice)} — 点击查看趋势图`;
  }
}

// ============================================================
//  CHART — Crosshair plugin + Axis tooltip
// ============================================================

const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart.tooltip || !chart.tooltip.getActiveElements().length) return;
    const active = chart.tooltip.getActiveElements();
    if (!active.length) return;
    const el = active[0].element;
    const x = el.x;
    const ctx = chart.ctx;
    const topY = chart.scales.y.top;
    const bottomY = chart.scales.y.bottom;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    // Subtle dot at intersection
    ctx.beginPath();
    ctx.arc(x, el.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.restore();
  }
};

function formatTooltipDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const wd = weekdays[d.getDay()];
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日 (${wd})`;
}

function renderMiniChart(results, activeIdx) {
  const canvas = document.getElementById('trendMiniChart');
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded, skipping mini chart');
    return;
  }
  const ctx = canvas.getContext('2d');
  if (trendChart) trendChart.destroy();

  trendResultsCache = results;
  const labels = results.map(r => r.date.slice(5));
  const prices = results.map(r => r.lowest);
  const minIdx = prices.indexOf(Math.min(...prices));

  trendChart = new Chart(ctx, {
    type: 'line',
    plugins: [crosshairPlugin],
    data: {
      labels,
      datasets: [{
        label: '每日最低价 (CNY)',
        data: prices,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        fill: true,
        tension: 0.3,
        pointRadius: labels.map((_, i) => {
          if (i === activeIdx) return 7;
          if (i === minIdx) return 5;
          return 2;
        }),
        pointBackgroundColor: labels.map((_, i) => {
          if (i === activeIdx) return '#2563eb';
          if (i === minIdx) return '#10b981';
          return '#94a3b8';
        }),
        pointBorderColor: labels.map((_, i) => {
          if (i === activeIdx) return '#1d4ed8';
          if (i === minIdx) return '#065f46';
          return '#94a3b8';
        }),
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          titleColor: '#e2e8f0',
          bodyColor: '#f1f5f9',
          padding: 14,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const idx = items[0].dataIndex;
              const r = trendResultsCache[idx];
              return r ? formatTooltipDate(r.date) : items[0].label;
            },
            label: ctx => `最低价: ¥${ctx.parsed.y.toLocaleString()}`,
          }
        }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 10, font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          ticks: { callback: v => '¥' + v.toLocaleString(), font: { size: 10 } },
          grid: { color: 'rgba(148, 163, 184, 0.12)' }
        }
      },
      interaction: { intersect: false, mode: 'index' },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const dateStr = results[idx].date;
          switchToDate(dateStr);
        }
      },
    }
  });
}

// ——— Inline trend summary ———

function renderTrendInlineSummary(results) {
  const el = document.getElementById('trendSummaryInline');
  const prices = results.map(r => r.lowest);
  const minIdx = prices.indexOf(Math.min(...prices));
  const best = results[minIdx];
  const avg = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0);

  el.innerHTML = `
    <div class="trend-quick-stat">
      <span class="quick-label">📊 ${results.length}天均价</span>
      <span class="quick-value">${formatPrice(avg)}</span>
    </div>
    <div class="trend-quick-stat best">
      <span class="quick-label">🏆 最低价日</span>
      <span class="quick-value">${formatPrice(best.lowest)} <span class="quick-date">${best.date}</span></span>
    </div>
    <div class="trend-quick-stat">
      <span class="quick-label">📈 最高日最低</span>
      <span class="quick-value">${formatPrice(Math.max(...prices))}</span>
    </div>
  `;
}

// ============================================================
//  DATE CARD STRIP — horizontal scroll + bidirectional linkage
// ============================================================

function renderDateGrid(results, summary, activeIdx) {
  const grid = document.getElementById('dateGrid');
  if (!grid) return;

  const minPrice = Math.min(...results.map(x => x.lowest));

  grid.innerHTML = `
    <div class="date-strip-track" id="dateStripTrack">
      ${results.map((r) => {
        const isActive = r.date === AppState.departDate;
        const isBest = r.lowest === minPrice;
        const dayOfWeek = new Date(r.date + 'T00:00:00').toLocaleDateString('zh-CN', { weekday: 'short' });

        return `
          <button class="date-strip-card ${isActive ? 'active' : ''} ${isBest ? 'best' : ''}"
                  id="dateCard-${r.date}"
                  data-date="${r.date}"
                  title="${r.date} — 最低 ${formatPrice(r.lowest)}">
            <span class="dsc-dow">${dayOfWeek}</span>
            <span class="dsc-date">${r.date.slice(5)}</span>
            <span class="dsc-price">${formatPrice(r.lowest)}</span>
            ${isBest ? '<span class="dsc-badge">最低</span>' : ''}
          </button>
        `;
      }).join('')}
    </div>`;

  // Bind card clicks → switchToDate (updates chart + flights)
  grid.querySelectorAll('.date-strip-card').forEach(card => {
    card.addEventListener('click', () => {
      const dateStr = card.dataset.date;
      if (dateStr !== AppState.departDate) {
        switchToDate(dateStr);
      }
    });
  });

  // Scroll active card into view on first render
  requestAnimationFrame(() => {
    scrollDateCardIntoView(AppState.departDate);
  });
}

// ——— Smooth-scroll the horizontal card strip so target date is centered ———
function scrollDateCardIntoView(dateStr) {
  const track = document.getElementById('dateStripTrack');
  const card = document.getElementById(`dateCard-${dateStr}`);
  if (!track || !card) return;

  const trackRect = track.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const offset = cardRect.left - trackRect.left - (trackRect.width / 2) + (cardRect.width / 2);
  track.scrollBy({ left: offset, behavior: 'smooth' });
}

// ——— Switch to a different date (from trend grid or chart click) ———

async function switchToDate(newDate) {
  AppState.setFocusDate(newDate);

  const summary = AppState.getSearchSummary();
  let dateInfo = formatDate(summary.departDate);
  if (summary.tripType === 'roundtrip' && summary.returnDate) {
    dateInfo += ` — ${formatDate(summary.returnDate)}`;
  }
  dateInfo += ` (${getTripTypeLabel(summary.tripType)})`;
  document.querySelector('.search-summary .date-info').textContent = dateInfo;

  await loadSingleDay(summary);

  // Update savings text if trend is loaded
  if (trendDataLoaded && AppState.trendData) {
    const currentPrices = AppState.singleDayData?.prices || [];
    const currentLowest = currentPrices.length
      ? Math.min(...currentPrices.map(p => p.price))
      : null;
    updateSavingsText(AppState.trendData, currentLowest);
  }

  // Lightweight highlight update — NEVER destroy/recreate the chart.
  // Trend data is permanently anchored to originalSearchDate.
  if (trendPanelOpen && trendDataLoaded && AppState.trendData) {
    const results = AppState.trendData.results || [];
    updateChartHighlight(results, newDate);
    updateDateGridHighlight(newDate);
  }

  document.getElementById('view-results').scrollIntoView({ behavior: 'smooth' });
}

// ——— Lightweight highlight updates (no chart destroy/recreate) ———

function updateChartHighlight(results, activeDate) {
  if (!trendChart) return;
  const ds = trendChart.data.datasets[0];
  const prices = results.map(r => r.lowest);
  const minIdx = prices.indexOf(Math.min(...prices));
  const activeIdx = results.findIndex(r => r.date === activeDate);

  const count = ds.data.length;
  ds.pointRadius = Array.from({ length: count }, (_, i) => {
    if (i === activeIdx) return 7;
    if (i === minIdx) return 5;
    return 2;
  });
  ds.pointBackgroundColor = Array.from({ length: count }, (_, i) => {
    if (i === activeIdx) return '#2563eb';
    if (i === minIdx) return '#10b981';
    return '#94a3b8';
  });
  ds.pointBorderColor = Array.from({ length: count }, (_, i) => {
    if (i === activeIdx) return '#1d4ed8';
    if (i === minIdx) return '#065f46';
    return '#94a3b8';
  });

  trendChart.update('none');
}

function updateDateGridHighlight(newDate) {
  const grid = document.getElementById('dateGrid');
  if (!grid) return;
  grid.querySelectorAll('.date-strip-card.active').forEach(b => b.classList.remove('active'));
  const target = grid.querySelector(`.date-strip-card[data-date="${newDate}"]`);
  if (target) {
    target.classList.add('active');
    scrollDateCardIntoView(newDate);
  }
}

// ——— Return to original search date ———

async function returnToOriginalDate() {
  if (!AppState.isViewingDifferentDate()) return;
  await switchToDate(AppState.originalSearchDate);
}

// ============================================================
//  Shared helpers
// ============================================================

function renderStatsGrid(prices) {
  if (!prices.length) {
    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="label">状态</div><div class="value" style="font-size:1rem;color:var(--muted);">暂无数据</div></div>
      </div>`;
  }

  const sorted = [...prices].sort((a, b) => a.price - b.price);
  const lowest = sorted[0];
  const avg = (sorted.reduce((s, p) => s + p.price, 0) / sorted.length).toFixed(0);
  const direct = sorted.filter(p => p.stops === 0);
  const directLowest = direct.length ? Math.min(...direct.map(p => p.price)) : null;

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">当日最低价</div>
        <div class="value price-low">${formatPrice(lowest.price)}</div>
        <div class="sub">${escapeHtml(lowest.airline_name || lowest.airline)}${lowest.stops === 0 ? ' · 直飞' : ''}</div>
      </div>
      <div class="stat-card">
        <div class="label">当日均价</div>
        <div class="value">${formatPrice(avg)}</div>
        <div class="sub">${prices.length} 个航班报价</div>
      </div>
      <div class="stat-card">
        <div class="label">直飞最低价</div>
        <div class="value price-low">${directLowest ? formatPrice(directLowest) : '无直飞'}</div>
        <div class="sub">${direct.length} 个直飞航班</div>
      </div>
      <div class="stat-card">
        <div class="label">当日最高价</div>
        <div class="value price-high">${formatPrice(sorted[sorted.length - 1].price)}</div>
        <div class="sub">${escapeHtml(sorted[sorted.length - 1].airline_name || '')}</div>
      </div>
    </div>`;
}

function buildErrorState(message, retryFn) {
  return `
    <div class="section">
      <div class="section-header"><h2>出错了</h2></div>
      <div class="section-body">
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h3>数据加载失败</h3>
          <p>${escapeHtml(message)}</p>
          <button class="btn" id="retryBtn">重试</button>
        </div>
      </div>
    </div>`;
}
