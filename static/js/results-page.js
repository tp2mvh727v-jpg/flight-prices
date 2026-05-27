// ============================================================
// ResultsPage — single-day first, trend lazy-loaded on demand
// ============================================================

import AppState from './state.js';
import { fetchPrices, fetchDateRange, createAbortController } from './api.js';
import { renderFlightRow, renderFlightCard, renderRoundtripSummary } from './flight-card.js';
import {
  sourceLabel, modeBadge, formatDate, formatPrice,
  getTripTypeLabel, escapeHtml
} from './utils.js';
import { addToWatchlist, removeFromWatchlist, isTracked, refreshWatchlistFromResults } from './watchlist.js';
import { AIRCRAFT_IMAGES } from './flight-profile.js';

let trendChart = null;
let trendPanelOpen = false;
let trendDataLoaded = false;
let trendDays = 14; // current selected day range
let trendResultsCache = []; // cached for tooltip date formatting & card strip

export function initResultsPage() {
  document.getElementById('backToSearch').addEventListener('click', () => {
    // H6: Navigation guard — warn if roundtrip partially selected
    if (AppState.tripType === 'roundtrip') {
      const hasOutbound = AppState.selectedOutbound !== null;
      const hasReturn = AppState.selectedReturn !== null;
      const partialSelection = (hasOutbound || hasReturn) && !(hasOutbound && hasReturn);
      if (partialSelection && !confirm('您尚未完成往返选择，确定要返回搜索吗？')) {
        return;
      }
    }
    document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'search' } }));
  });
}

// ——— Entry: load ONLY single-day, nothing else ———

let _abortController = null;

export async function renderResults() {
  trendDataLoaded = false;
  trendPanelOpen = false;
  trendDays = 14;
  AppState.selectedOutbound = null;
  AppState.selectedReturn = null;

  _abortController = createAbortController();
  const signal = _abortController.signal;

  // ——— Flight lookup mode ———
  const flightData = AppState.flightLookupData;
  if (!flightData) {
    const flightCard = document.getElementById('flightLookupResult');
    if (flightCard) flightCard.style.display = 'none';
  }
  if (flightData && flightData.flight) {
    renderFlightLookupResult(flightData);
    // Clear after rendering so city searches work next time
    AppState.flightLookupData = null;
    return;
  }

  const summary = AppState.getSearchSummary();
  updateResultsHeader(summary);

  const isRT = summary.tripType === 'roundtrip';
  const legLabel = isRT ? 'STEP 1 · 去程航班' : '单日航班详情';
  const lastColHeader = isRT ? '选择' : '更多信息';
  document.getElementById('singleDaySection').innerHTML = `
    <div class="section">
      <div class="search-loading" style="padding:20px;text-align:center;">
        <div class="search-loading-icon">🛰</div>
        <div>正在扫描航线网络...</div>
      </div>
      <div class="section-header" style="display:none;">
        <h2>${legLabel} — <span class="skeleton-line" style="display:inline-block;width:90px;vertical-align:middle;"></span></h2>
        ${isRT ? '<p class="section-step-hint">请在下方选择一个去程航班，再选择返程航班以计算往返总价</p>' : ''}
      </div>
      <div class="section-body">
        <div class="stats-grid">
          ${[1,2,3,4].map(() => `
            <div class="stat-card">
              <div class="skeleton-line w-60" style="height:10px;margin:0 auto 8px;"></div>
              <div class="skeleton-line w-80 h-lg" style="margin:0 auto;"></div>
              <div class="skeleton-line w-40" style="height:10px;margin:8px auto 0;"></div>
            </div>
          `).join('')}
        </div>
        <div class="filter-bar" id="filterBar">
          <button class="filter-chip active" data-filter="all">全部航班</button>
          <button class="filter-chip" data-filter="direct">仅直飞</button>
          <select class="sort-select" id="sortSelect" aria-label="排序">
            <option value="price">价格 ↑</option>
            <option value="duration">飞行时长 ↑</option>
            <option value="departure">出发时间 ↑</option>
          </select>
        </div>
        <div class="table-header cols7">
          <span>航空公司 / 航班号</span><span>起降时间</span><span>飞行时长</span><span>中转详情</span><span>机型</span><span>价格</span><span>收藏</span><span>${lastColHeader}</span>
        </div>
        ${[1,2,3,4,5].map(() => `
          <div class="table-row cols7" style="border-bottom:1px solid var(--border);">
            <div><div class="skeleton-line w-60"></div></div>
            <div><div class="skeleton-line w-50"></div></div>
            <div><div class="skeleton-line w-40"></div></div>
            <div><div class="skeleton-line w-50"></div></div>
            <div><div class="skeleton-line w-35"></div></div>
            <div><div class="skeleton-line w-50 h-lg"></div></div>
            <div><div class="skeleton-line w-25"></div></div>
            <div><div class="skeleton-line w-55"></div></div>
          </div>
        `).join('')}
      </div>
    </div>`;

  await loadSingleDay(summary);

  if (isRT && summary.returnDate) {
    await loadReturnDay(summary);
    renderRoundtripBar();
    bindRoundtripSelection();
  }
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

  // Pax + cabin badge
  const pax = AppState.passengers || 1;
  const cabinLabels = { economy: '经济舱', premium: '超值经济舱', business: '商务舱', first: '头等舱' };
  const cabinLabel = cabinLabels[AppState.cabinClass] || '经济舱';
  document.querySelector('.search-summary .pax-info').textContent = `${pax}人 · ${cabinLabel}`;

  document.getElementById('alertArea').innerHTML = AppState.cityWarning
    ? `<div class="alert alert-warning">${AppState.cityWarning}</div>`
    : '';
  if (AppState.cityWarning) AppState.cityWarning = '';
}

// ============================================================
//  SINGLE-DAY (always loaded, always primary)
// ============================================================

async function loadSingleDay(summary) {
  const container = document.getElementById('singleDaySection');
  const isDateSwitch = !!document.getElementById('singlePriceList');

  if (!isDateSwitch) {
    container.innerHTML = `
      <div class="section">
        <div class="section-header">
          <h2><span class="skeleton-line" style="display:inline-block;width:200px;"></span></h2>
        </div>
        <div class="section-body">
          <div class="stats-grid">
            ${[1,2,3,4].map(() => `
              <div class="stat-card">
                <div class="skeleton-line w-60" style="height:10px;margin:0 auto 8px;"></div>
                <div class="skeleton-line w-80 h-lg" style="margin:0 auto;"></div>
                <div class="skeleton-line w-40" style="height:10px;margin:8px auto 0;"></div>
              </div>
            `).join('')}
          </div>
          <div class="table-header cols7">
            <span>航空公司 / 航班号</span><span>起降时间</span><span>飞行时长</span><span>中转详情</span><span>机型</span><span>价格</span><span>收藏</span><span>选择</span>
          </div>
          ${[1,2,3,4,5].map(() => `
            <div class="table-row cols7" style="border-bottom:1px solid var(--border);">
              <div><div class="skeleton-line w-60"></div></div>
              <div><div class="skeleton-line w-50"></div></div>
              <div><div class="skeleton-line w-40"></div></div>
              <div><div class="skeleton-line w-50"></div></div>
              <div><div class="skeleton-line w-35"></div></div>
              <div><div class="skeleton-line w-50 h-lg"></div></div>
              <div><div class="skeleton-line w-25"></div></div>
              <div><div class="skeleton-line w-55"></div></div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  try {
    const data = await fetchPrices(summary.from.code, summary.to.code, summary.departDate, _abortController?.signal);
    AppState.singleDayData = data;

    if (isDateSwitch) {
      updateSingleDayContent(data, summary);
    } else {
      renderSingleDaySection(data, summary);
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    const errInfo = _classifyError(e);
    container.innerHTML = buildErrorState(errInfo.message, () => loadSingleDay(summary));
  }
}

// ============================================================
//  ROUNDTRIP — return flight loading + selection
// ============================================================

async function loadReturnDay(summary) {
  const isRT = summary.tripType === 'roundtrip';
  if (!isRT || !summary.returnDate) return;

  try {
    const data = await fetchPrices(summary.to.code, summary.from.code, summary.returnDate, _abortController?.signal);
    AppState.returnData = data;
    renderReturnSection(data, summary);
  } catch (e) {
    if (e.name === 'AbortError') return;
    const errInfo = _classifyError(e);
    const container = document.getElementById('returnDaySection');
    if (container) {
      container.innerHTML = buildErrorState(errInfo.message, () => loadReturnDay(summary));
    }
  }
}

function renderReturnSection(data, summary) {
  const container = document.getElementById('returnDaySection');
  if (!container) return;

  const prices = data.prices || [];
  const dateStr = formatDate(data.date || summary.returnDate);
  const sorted = [...prices].sort((a, b) => a.price - b.price);

  // Store indices back into the array for profile button
  prices.forEach((p, i) => { p._index = i; });

  container.innerHTML = `
    <div class="section">
      <div class="section-header">
        <h2>STEP 2 · 返程航班 — ${dateStr}</h2>
        <span>${modeBadge(data)}</span>
      </div>
      <div class="section-body">
        ${renderStatsGrid(prices)}
        <div class="table-header cols7">
          <span>航空公司 / 航班号</span><span>起降时间</span><span>飞行时长</span><span>中转详情</span><span>机型</span><span>价格</span><span>收藏</span><span>选择</span>
        </div>
        <div id="returnPriceList">
          ${sorted.length
            ? sorted.map((p, i) => renderFlightRow({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.returnDate, 7, { selectable: true, selected: AppState.selectedReturn === prices.indexOf(p), leg: 'return' })).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到返程航班</h3><p>请尝试更换返程日期</p></div>'
          }
        </div>
        <!-- Mobile card list for return -->
        <div class="flight-card-list" id="returnCardList">
          ${sorted.length
            ? sorted.map((p, i) => renderFlightCard({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.returnDate, { selectable: true, selected: AppState.selectedReturn === prices.indexOf(p), leg: 'return' })).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到返程航班</h3><p>请尝试更换返程日期</p></div>'}
        </div>
      </div>
    </div>`;
}

function renderRoundtripBar() {
  const bar = document.getElementById('roundtripSummaryBar');
  if (!bar) return;

  const outIdx = AppState.selectedOutbound;
  const retIdx = AppState.selectedReturn;
  const outFlight = outIdx !== null ? (AppState.singleDayData?.prices || [])[outIdx] : null;
  const retFlight = retIdx !== null ? (AppState.returnData?.prices || [])[retIdx] : null;
  const total = AppState.getRoundtripTotal();

  bar.innerHTML = renderRoundtripSummary(outFlight, retFlight, total);
}

let _filterState = { mode: 'all', sort: 'price' };

function _handleTrackBtn(btn) {
  const { trackOrigin, trackDest, trackCabin, trackPrice, trackAirline, trackAirlineName, trackKey } = btn.dataset;
  if (!trackOrigin || !trackDest) return;
  const price = parseInt(trackPrice) || 0;
  if (isTracked(trackKey)) {
    removeFromWatchlist(trackKey);
    btn.classList.remove('tracked');
    btn.textContent = '☆';
  } else {
    addToWatchlist({
      origin: trackOrigin, dest: trackDest, cabin: trackCabin,
      originName: trackOrigin, destName: trackDest,
      price, airline: trackAirline, airlineName: trackAirlineName,
    });
    btn.classList.add('tracked');
    btn.textContent = '★';
  }
}

function _updateTrackBtns() {
  document.querySelectorAll('.track-btn').forEach(btn => {
    const key = btn.dataset.trackKey;
    if (isTracked(key)) {
      btn.classList.add('tracked');
      btn.textContent = '★';
    } else {
      btn.classList.remove('tracked');
      btn.textContent = '☆';
    }
  });
}

function _applyFilterSort(prices) {
  let filtered = [...prices];
  if (_filterState.mode === 'direct') {
    filtered = filtered.filter(p => p.stops === 0);
  }
  // v5.10: Carrier preference — prioritize (sort to top) instead of filter out
  const preferredCarriers = AppState.preferredCarriers && AppState.preferredCarriers.length > 0
    ? new Set(AppState.preferredCarriers) : null;

  filtered.sort((a, b) => {
    // First: preferred carriers always above non-preferred
    if (preferredCarriers) {
      const aCode = a.airline || (a.segments && a.segments[0] && a.segments[0].airline) || '';
      const bCode = b.airline || (b.segments && b.segments[0] && b.segments[0].airline) || '';
      const aPref = preferredCarriers.has(aCode) ? 0 : 1;
      const bPref = preferredCarriers.has(bCode) ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
    }
    // Second: sort by selected criteria within same preference group
    if (_filterState.sort === 'duration') return (a.duration_minutes || 999) - (b.duration_minutes || 999);
    if (_filterState.sort === 'departure') return (a.departure_time || '99:99').localeCompare(b.departure_time || '99:99');
    return (a.price || 99999) - (b.price || 99999);
  });
  return filtered;
}

function _bindFilterBar(container, getPricesFn, renderFn) {
  if (!container || container._filterBound) return;
  container._filterBound = true;
  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    container.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c === chip);
      c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
    });
    _filterState.mode = chip.dataset.filter;
    renderFn(_applyFilterSort(getPricesFn()));
  });
  const sortSel = container.querySelector('.sort-select');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      _filterState.sort = sortSel.value;
      renderFn(_applyFilterSort(getPricesFn()));
    });
  }
}

function bindRoundtripSelection() {
  const section = document.getElementById('singleDaySection');
  if (!section) return;

  // Remove old listener by cloning (simple approach: use a flag)
  if (section._rtBound) return;
  section._rtBound = true;

  section.addEventListener('click', (e) => {
    // Track button handler
    const trackBtn = e.target.closest('.track-btn');
    if (trackBtn) {
      e.stopPropagation();
      _handleTrackBtn(trackBtn);
      return;
    }
    // Check for selection radio clicks
    const radio = e.target.closest('.flight-sel-radio');
    if (!radio) {
      // Also allow clicking the entire row/card
      const row = e.target.closest('[data-leg][data-idx]');
      if (!row) return;
      // Don't intercept profile button clicks
      if (e.target.closest('.geek-profile-btn') || e.target.closest('.track-btn')) return;
      const leg = row.dataset.leg;
      const idx = parseInt(row.dataset.idx);
      if (isNaN(idx)) return;

      if (leg === 'outbound') {
        AppState.selectOutbound(idx);
      } else if (leg === 'return') {
        AppState.selectReturn(idx);
      }
      refreshRoundtripUI();
      return;
    }

    const leg = radio.dataset.leg;
    const idx = parseInt(radio.dataset.idx);
    if (isNaN(idx)) return;

    if (leg === 'outbound') {
      AppState.selectOutbound(idx);
    } else if (leg === 'return') {
      AppState.selectReturn(idx);
    }
    refreshRoundtripUI();
  });
}

function refreshRoundtripUI() {
  // Update row/card selected states
  const outIdx = AppState.selectedOutbound;
  const retIdx = AppState.selectedReturn;

  // Outbound rows
  document.querySelectorAll('#singleDaySection [data-leg="outbound"]').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    el.classList.toggle('flight-row-selected', idx === outIdx);
    const radio = el.querySelector('.flight-sel-radio');
    if (radio) radio.classList.toggle('checked', idx === outIdx);
    if (el.classList.contains('flight-card')) {
      el.classList.toggle('flight-card-selected', idx === outIdx);
    }
  });
  // Return rows
  document.querySelectorAll('#singleDaySection [data-leg="return"]').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    el.classList.toggle('flight-row-selected', idx === retIdx);
    const radio = el.querySelector('.flight-sel-radio');
    if (radio) radio.classList.toggle('checked', idx === retIdx);
    if (el.classList.contains('flight-card')) {
      el.classList.toggle('flight-card-selected', idx === retIdx);
    }
  });

  renderRoundtripBar();
}

// ——— Surgical update for date switches — leaves trend panel intact ———

function updateSingleDayContent(data, summary) {
  const prices = data.prices || [];
  const dateStr = formatDate(data.date || summary.departDate);
  const sorted = _applyFilterSort(prices);
  const isRT = summary.tripType === 'roundtrip';

  // Store indices for profile button
  prices.forEach((p, i) => { p._index = i; });

  // Section header date
  const h2 = document.querySelector('#singleDaySection .section-header h2');
  const legLabel = isRT ? 'STEP 1 · 去程航班' : '单日航班详情';
  if (h2) h2.textContent = `${legLabel} — ${dateStr}`;

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
  const outIdx = AppState.selectedOutbound;
  const lastColHeader = isRT ? '选择' : '更多信息';
  const thLast = document.querySelector('#singleDaySection .table-header span:last-child');
  if (thLast) thLast.textContent = lastColHeader;

  const list = document.getElementById('singlePriceList');
  if (list) {
    list.innerHTML = sorted.length
      ? sorted.map((p) => renderFlightRow({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.departDate, 7, { selectable: isRT, selected: outIdx === prices.indexOf(p), leg: 'outbound' })).join('')
      : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>';
  }

  // Mobile card list
  const cardList = document.getElementById('outboundCardList');
  if (cardList) {
    cardList.innerHTML = sorted.length
      ? sorted.map((p) => renderFlightCard({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.departDate, { selectable: isRT, selected: outIdx === prices.indexOf(p), leg: 'outbound' })).join('')
      : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>';
  }

  // Refresh watchlist with current prices
  refreshWatchlistFromResults(summary.from?.code || summary.from, summary.to?.code || summary.to, AppState.cabinClass, prices);
  _updateTrackBtns();

  // Re-bind filter bar with the new date's data (prevents stale closure)
  const filterContainer = document.getElementById('singleDaySection');
  if (filterContainer) {
    filterContainer._filterBound = false;
    _bindFilterBar(filterContainer,
      () => prices,
      (filtered) => {
        const list = document.getElementById('singlePriceList');
        if (list) {
          list.innerHTML = filtered.length
            ? filtered.map((p) => renderFlightRow({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.departDate, 7, { selectable: isRT, selected: outIdx === prices.indexOf(p), leg: 'outbound' })).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>';
        }
        const cardList = document.getElementById('outboundCardList');
        if (cardList) {
          cardList.innerHTML = filtered.length
            ? filtered.map((p) => renderFlightCard({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.departDate, { selectable: isRT, selected: outIdx === prices.indexOf(p), leg: 'outbound' })).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>';
        }
      }
    );
  }

  document.getElementById('sourceInfo').textContent = sourceLabel(data);
}

function renderSingleDaySection(data, summary) {
  const container = document.getElementById('singleDaySection');
  const prices = data.prices || [];
  const dateStr = formatDate(data.date || summary.departDate);
  const isRT = summary.tripType === 'roundtrip';

  // Store indices for profile button lookups
  prices.forEach((p, i) => { p._index = i; });

  const sorted = _applyFilterSort(prices);

  const returnBtnHtml = AppState.isViewingDifferentDate() ? `
        <button class="back-to-original-btn" id="backToOriginalBtn">
          ← 返回基准日 (${formatDate(AppState.originalSearchDate)})
        </button>` : '';

  const outIdx = AppState.selectedOutbound;
  const legLabel = isRT ? '去程航班' : '单日航班详情';
  const lastColHeader = isRT ? '选择' : '更多信息';

  container.innerHTML = `
    <div class="section">
      <div class="section-header">
        <h2>${legLabel} — ${dateStr}</h2>
        <span id="singleModeBadge">${modeBadge(data)}</span>
        ${returnBtnHtml}
      </div>
      <div class="section-body">
        ${renderStatsGrid(prices)}
        <div class="filter-bar" id="filterBarLive">
          <button class="filter-chip active" data-filter="all">全部航班</button>
          <button class="filter-chip" data-filter="direct">仅直飞</button>
          <select class="sort-select" id="sortSelectLive" aria-label="排序">
            <option value="price">价格 ↑</option>
            <option value="duration">飞行时长 ↑</option>
            <option value="departure">出发时间 ↑</option>
          </select>
        </div>
        <div class="table-header cols7">
          <span>航空公司 / 航班号</span><span>起降时间</span><span>飞行时长</span><span>中转详情</span><span>机型</span><span>价格</span><span>收藏</span><span>${lastColHeader}</span>
        </div>
        <div id="singlePriceList">
          ${sorted.length
            ? sorted.map((p) => renderFlightRow({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.departDate, 7, { selectable: isRT, selected: outIdx === prices.indexOf(p), leg: 'outbound' })).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>'
          }
        </div>
        <!-- Mobile card list for outbound -->
        <div class="flight-card-list" id="outboundCardList">
          ${sorted.length
            ? sorted.map((p) => renderFlightCard({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.departDate, { selectable: isRT, selected: outIdx === prices.indexOf(p), leg: 'outbound' })).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>'}
        </div>
        <!-- Return section placeholder (populated by loadReturnDay) -->
        <div id="returnDaySection"></div>
        <!-- Roundtrip summary bar -->
        <div id="roundtripSummaryBar"></div>
        <!-- Collapsible trend panel (lazy-loaded on click) -->
        <div class="trend-collapse" id="trendCollapse"></div>
      </div>
    </div>`;

  document.getElementById('sourceInfo').textContent = sourceLabel(data);

  // Render the toggle button (no data loaded yet)
  renderTrendToggle();

  // Bind filter bar
  const filterContainer = document.getElementById('singleDaySection');
  if (filterContainer) {
    const isRT = summary.tripType === 'roundtrip';
    const outIdx = AppState.selectedOutbound;
    _bindFilterBar(filterContainer,
      () => prices,
      (filtered) => {
        const list = document.getElementById('singlePriceList');
        if (list) {
          list.innerHTML = filtered.length
            ? filtered.map((p) => renderFlightRow({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.departDate, 7, { selectable: isRT, selected: outIdx === prices.indexOf(p), leg: 'outbound' })).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>';
        }
        const cardList = document.getElementById('outboundCardList');
        if (cardList) {
          cardList.innerHTML = filtered.length
            ? filtered.map((p) => renderFlightCard({ ...p, _index: prices.indexOf(p), _cabin: AppState.cabinClass }, data.date || summary.departDate, { selectable: isRT, selected: outIdx === prices.indexOf(p), leg: 'outbound' })).join('')
            : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关航班</h3><p>请尝试更换日期或城市</p></div>';
        }
      }
    );
  }

  // Bind return-to-original button if present
  const backBtn = document.getElementById('backToOriginalBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => returnToOriginalDate());
  }

  // Auto-expand trend panel on first load for discoverability
  if (!trendPanelOpen && !trendDataLoaded) {
    toggleTrendPanel();
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

  const toggleBtn = document.getElementById('trendToggle');
  if (trendPanelOpen) {
    panel.classList.add('trend-open');
    if (toggleBtn) toggleBtn.classList.add('trend-open');
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
    if (toggleBtn) toggleBtn.classList.remove('trend-open');
    if (arrow) arrow.textContent = '▸';
  }
}

// ——— Fetch trend data (triggered by first panel open OR day-range switch) ———

async function fetchTrendData(summary, days) {
  const body = document.getElementById('trendPanelBody');
  if (!body) return;

  body.innerHTML = `
    <div class="trend-quick-stats" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
      ${[1,2,3].map(() => `
        <div style="border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;">
          <div class="skeleton-line w-40" style="height:10px;margin:0 auto 8px;"></div>
          <div class="skeleton-line w-60 h-lg" style="margin:0 auto;"></div>
        </div>
      `).join('')}
    </div>
    <div class="skeleton-line" style="width:100%;height:280px;border-radius:12px;"></div>`;

  const origin = summary?.from?.code || AppState.origin;
  const dest = summary?.to?.code || AppState.dest;
  const start = summary?.departDate || AppState.originalSearchDate;

  try {
    const data = await fetchDateRange(origin, dest, start, days, _abortController?.signal);
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
              if (!r) return items[0].label;
              const d = new Date(r.date);
              const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
              return `${formatTooltipDate(r.date)} ${weekdays[d.getDay()]}`;
            },
            label: ctx => {
              const price = ctx.parsed.y;
              const currentPrice = trendResultsCache.find(r => r.date === AppState.departDate)?.lowest;
              const allPrices = trendResultsCache.map(r => r.lowest).filter(p => p > 0);
              const minPrice = Math.min(...allPrices);
              let lines = [`💰 最低价: ¥${price.toLocaleString()}`];
              if (currentPrice && price !== currentPrice) {
                const diff = price - currentPrice;
                const sign = diff > 0 ? '📈 贵' : '📉 便宜';
                lines.push(`${sign} ¥${Math.abs(diff).toLocaleString()} (vs 当天)`);
              }
              if (price === minPrice) lines.push('🔴 14天内最低价');
              return lines;
            },
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

  // H3: Add pulse indicator to the date card being loaded
  const activeCard = document.getElementById(`dateCard-${newDate}`);
  if (activeCard) activeCard.classList.add('loading');

  const summary = AppState.getSearchSummary();
  let dateInfo = formatDate(summary.departDate);
  if (summary.tripType === 'roundtrip' && summary.returnDate) {
    dateInfo += ` — ${formatDate(summary.returnDate)}`;
  }
  dateInfo += ` (${getTripTypeLabel(summary.tripType)})`;
  document.querySelector('.search-summary .date-info').textContent = dateInfo;

  // H7: Sync URL hash with current focus date
  updateResultsHash(summary);

  await loadSingleDay(summary);
  if (activeCard) activeCard.classList.remove('loading');

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

// H7: Sync URL hash with current focus date (without reloading)
function updateResultsHash(summary) {
  const p = new URLSearchParams();
  if (summary.from.code) p.set('from', summary.from.code);
  if (summary.to.code) p.set('to', summary.to.code);
  if (summary.departDate) p.set('date', summary.departDate);
  if (summary.returnDate) p.set('return', summary.returnDate);
  if (summary.tripType) p.set('trip', summary.tripType);
  const url = new URL(window.location);
  url.hash = '#results';
  if ([...p.keys()].length) url.hash += '?' + p.toString();
  history.replaceState({ view: 'results', from: summary.from.code, to: summary.to.code, date: summary.departDate, returnDate: summary.returnDate, trip: summary.tripType }, '', url);
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

// ============================================================
//  Flight Lookup Result Card
// ============================================================

const STATUS_LABELS = {
  'scheduled': '计划中',
  'active': '飞行中',
  'en-route': '飞行中',
  'landed': '已降落',
  'cancelled': '已取消',
  'unknown': '未知',
};

function renderFlightLookupResult(data) {
  // Hide normal results sections
  const singleDay = document.getElementById('singleDaySection');
  const flightCard = document.getElementById('flightLookupResult');
  if (singleDay) singleDay.innerHTML = '';

  // Update header
  document.querySelector('.search-summary .route-text').textContent = `✈️ ${data.flight}`;
  document.querySelector('.search-summary .date-info').textContent = '航班号直搜';
  document.querySelector('.search-summary .pax-info').textContent = '';
  document.getElementById('alertArea').innerHTML = '';
  const sourceEl = document.getElementById('sourceInfo');
  if (data.source === 'verified_db') {
    sourceEl.innerHTML = '<span class="source-badge source-local">本地数据库（基于过往航班数据总结；若航司飞行计划变更未能及时更新，欢迎反馈）</span>';
  } else {
    sourceEl.innerHTML = '<span class="source-badge source-live">AirLabs Schedules</span>';
    sourceEl.title = '实时航班数据，来源：AirLabs API';
  }

  if (!flightCard) return;

  const dep = data.departure || {};
  const arr = data.arrival || {};
  const airline = data.airline || {};
  const statusKey = (data.status || 'unknown').toLowerCase();
  const statusLabel = STATUS_LABELS[statusKey] || data.status || '未知';
  const statusClass = `fl-status-${statusKey}`;

  // Format times
  const depTime = dep.time ? formatDateTime(dep.time) : '--:--';
  const arrTime = arr.time ? formatDateTime(arr.time) : '--:--';

  // Duration
  const durMin = data.duration_min || 0;
  const durH = Math.floor(durMin / 60);
  const durM = durMin % 60;
  const durStr = durMin > 0 ? `${durH}h${durM.toString().padStart(2, '0')}m` : '--';

  // Aircraft image
  const aircraft = data.aircraft;
  const airlineIata = data.airline?.iata || '';
  let imgSrc = '';
  if (aircraft && AIRCRAFT_IMAGES[aircraft] && AIRCRAFT_IMAGES[aircraft][airlineIata]) {
    const files = AIRCRAFT_IMAGES[aircraft][airlineIata];
    if (files && files.length > 0) {
      imgSrc = `/static/images/aircraft/${aircraft}/${airlineIata}/${files[0]}`;
    }
  }

  // Airline name lookup
  const airlineName = getAirlineName(airline.iata);

  flightCard.style.display = '';
  flightCard.innerHTML = `
    <div class="flight-lookup-card">
      <div class="section">
        <div class="fl-lookup-header">
          <div class="fl-flight-code">${escapeHtml(data.flight)}</div>
          <div class="fl-airline-name">${escapeHtml(airlineName)}${airline.icao ? ` (${escapeHtml(airline.iata)}/${escapeHtml(airline.icao)})` : ''}</div>
        </div>

        <div class="fl-route-bar">
          <div class="fl-airport-block">
            <div class="fl-airport-code">${escapeHtml(dep.airport || '--')}</div>
            ${dep.terminal ? `<div class="fl-airport-terminal">${/^\d+$/.test(dep.terminal) ? 'T' : ''}${escapeHtml(dep.terminal)}</div>` : ''}
          </div>
          <div class="fl-route-arrow">→</div>
          <div class="fl-airport-block">
            <div class="fl-airport-code">${escapeHtml(arr.airport || '--')}</div>
            ${arr.terminal ? `<div class="fl-airport-terminal">${/^\d+$/.test(arr.terminal) ? 'T' : ''}${escapeHtml(arr.terminal)}</div>` : ''}
          </div>
        </div>

        <div class="fl-details-grid">
          <div class="fl-detail-item">
            <span class="fl-detail-label">出发时间</span>
            <span class="fl-detail-value">${escapeHtml(depTime)}</span>
          </div>
          <div class="fl-detail-item">
            <span class="fl-detail-label">到达时间</span>
            <span class="fl-detail-value">${escapeHtml(arrTime)}</span>
          </div>
          <div class="fl-detail-item">
            <span class="fl-detail-label">飞行时长</span>
            <span class="fl-detail-value">${escapeHtml(durStr)}</span>
          </div>
          <div class="fl-detail-item">
            <span class="fl-detail-label">状态</span>
            <span class="fl-detail-value">
              <span class="fl-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
            </span>
          </div>
        </div>

        <div class="fl-aircraft-section">
          ${aircraft
            ? (imgSrc
              ? `<div class="fp-aircraft-photo-wrap" style="margin:0 auto;max-width:700px;">
                   <img class="fp-aircraft-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(aircraft)}" loading="lazy"
                        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                   <div class="fp-aircraft-fallback" style="display:none;">
                     <span class="fp-fallback-icon">✈️</span>
                     <span>${escapeHtml(aircraft)}</span>
                   </div>
                   <div class="fp-aircraft-type-label">${escapeHtml(aircraft)}</div>
                 </div>`
              : `<div style="text-align:center;padding:16px 0;"><div style="font-size:2rem;margin-bottom:6px;">✈️</div><div style="font-weight:700;font-size:1rem;color:var(--aero-accent);margin-bottom:4px;">${escapeHtml(aircraft)}</div><div style="font-size:0.7rem;color:#94a3b8;">机型</div></div>`)
            : '<div class="fl-aircraft-na">机型信息暂无 (AirLabs 免费层限制)</div>'
          }
        </div>
      </div>
    </div>`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '--:--';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr.slice(-5) || isoStr;
    return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return isoStr;
  }
}

function getAirlineName(iata) {
  const names = {
    'CA': '中国国航', 'CZ': '南方航空', 'MU': '东方航空', 'HU': '海南航空',
    'MF': '厦门航空', '3U': '四川航空', 'ZH': '深圳航空', 'FM': '上海航空',
    'CX': '国泰航空', 'SQ': '新加坡航空', 'KE': '大韩航空', 'NH': '全日空',
    'JL': '日本航空', 'QF': '澳洲航空', 'OZ': '韩亚航空', 'BR': '长荣航空',
    'CI': '中华航空', 'TR': '酷航', 'NZ': '新西兰航空', 'TG': '泰国航空',
    'VN': '越南航空', 'PR': '菲律宾航空', 'MH': '马来西亚航空', 'GA': '印尼鹰航',
    'AI': '印度航空', 'EK': '阿联酋航空', 'QR': '卡塔尔航空', 'TK': '土耳其航空',
    'EY': '阿提哈德航空', 'LH': '汉莎航空', 'AF': '法国航空', 'BA': '英国航空',
    'KL': '荷兰皇家航空', 'UA': '美联航', 'DL': '达美航空', 'AA': '美国航空',
    'AC': '加拿大航空', 'ET': '埃塞俄比亚航空', 'MS': '埃及航空',
  };
  return names[iata] || iata || '未知航司';
}

function _classifyError(e) {
  if (!e) return { type: 'unknown', message: '未知错误' };
  if (e.name === 'AbortError') return { type: 'abort', message: '' };
  if (e.name === 'TypeError' || e.message?.includes('fetch') || e.message?.includes('network') || e.message?.includes('Failed to fetch'))
    return { type: 'network', message: '网络连接失败，请检查网络后重试' };
  if (e.name === 'TimeoutError' || e.message?.includes('timeout'))
    return { type: 'timeout', message: '请求超时，服务器响应缓慢' };
  if (e.status >= 500 || e.message?.includes('server'))
    return { type: 'server', message: '服务暂时不可用，请稍后重试' };
  return { type: 'error', message: '数据加载失败，请重试' };
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
