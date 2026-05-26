// ============================================================
// SearchPage v4.0 — State-driven autocomplete, zero DOM-vs-State drift
//   AppState.origin / AppState.dest 是唯一真相来源。
//   自动补全选择 → 写入 AppState → 由 setCode() 回填 input。
//   交换城市 → 读写 AppState → 同步两个自动补全组件。
// ============================================================

import AppState from './state.js';
import { createAutocomplete } from './autocomplete.js';
import { AIRPORT_DB, CODE_MAP } from './airports.js';
import { getWatchlist, removeFromWatchlist, getTrend, getPriceChange, refreshWatchlist } from './watchlist.js';

// Autocomplete instance registry — keyed by 'origin' | 'dest'
const _ac = { origin: null, dest: null };

// Alliance → carrier mapping for the alliance filter
const ALLIANCES = {
  star:     { name: '星空联盟', icon: '⭐', carriers: ['CA','ZH','SQ','NH','UA','LH','TK','TG','OZ','ET','NZ','SK','TP','LO','SN','LX','OS','SA','AV','MS','AI','A3','OU'] },
  skyteam:  { name: '天合联盟', icon: '🌐', carriers: ['CZ','MU','MF','KE','KL','AF','DL','AM','VN','CI','GA','SV','AR','ME','KQ','UX','RO','SU','OK'] },
  oneworld: { name: '寰宇一家', icon: '🌍', carriers: ['CX','JL','BA','QF','AA','QR','AY','IB','MH','RJ','UL','AT','LA','MA','AS'] },
};

function getAllianceCarriers() {
  const chips = document.querySelectorAll('.alliance-chip');
  const selected = [];
  chips.forEach(c => { if (c.classList.contains('active')) selected.push(c.dataset.alliance); });
  // If all 3 selected, return empty = no restriction
  if (selected.length === 3 || selected.length === 0) return [];
  const set = new Set();
  selected.forEach(a => ALLIANCES[a]?.carriers?.forEach(code => set.add(code)));
  return [...set];
}

// ——— Public init ———

export function initSearchPage() {
  try {
    setDefaultDates();
    initAutocompletes();
    initAllianceChips();
    bindEvents();
    renderRecentSearches();
    renderWatchlistPanel();
    console.log('[SearchPage] v4.0 State-driven — autocomplete ready, form bound. Defaults:',
      AppState.origin, '→', AppState.dest);
  } catch (e) {
    console.error('[SearchPage] Init failed:', e);
  }
}

// ——— Alliance chip interaction ———

function getSelectedCarriers() {
  return getAllianceCarriers();
}

function initAllianceChips() {
  const container = document.getElementById('allianceChips');
  if (!container) return;

  // Restore from AppState if set
  const saved = AppState.preferredCarriers || [];
  if (saved.length > 0) {
    // Non-empty saved carriers → determine which alliance(s) to activate
    const chips = container.querySelectorAll('.alliance-chip');
    chips.forEach(c => c.classList.remove('active'));
    let matched = false;
    chips.forEach(c => {
      const codes = ALLIANCES[c.dataset.alliance]?.carriers || [];
      if (saved.some(sc => codes.includes(sc))) {
        c.classList.add('active');
        matched = true;
      }
    });
    if (!matched) chips.forEach(c => c.classList.add('active'));
  }

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.alliance-chip');
    if (!chip) return;
    chip.classList.toggle('active');
  });
}

function initAutocompletes() {
  const originInput = document.getElementById('originInput');
  const destInput   = document.getElementById('destInput');

  if (!originInput || !destInput) {
    console.error('[SearchPage] Input elements not found — DOM not ready?');
    return;
  }

  // Origin autocomplete — onSelect writes to AppState
  try {
    _ac.origin = createAutocomplete(originInput, {
      placeholder: '输入城市名、拼音或机场代码...',
      onSelect(apt) {
        AppState.origin = apt.code;
        clearFieldErrors();
        checkAndShowSameCityWarning();
      },
    });
    _ac.origin.setCode(AppState.origin);   // 'PEK' by default
  } catch (e) {
    console.error('[SearchPage] origin autocomplete failed:', e);
    _ac.origin = null;
  }

  // Destination autocomplete
  try {
    _ac.dest = createAutocomplete(destInput, {
      placeholder: '输入城市名、拼音或机场代码...',
      onSelect(apt) {
        AppState.dest = apt.code;
        clearFieldErrors();
        checkAndShowSameCityWarning();
      },
    });
    _ac.dest.setCode(AppState.dest);       // 'SYD' by default
  } catch (e) {
    console.error('[SearchPage] dest autocomplete failed:', e);
    _ac.dest = null;
  }
}

// ——— Default dates ———

function setDefaultDates() {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const tomorrow = today.toISOString().split('T')[0];

  const departInput = document.getElementById('departDate');
  const returnInput = document.getElementById('returnDate');
  if (!departInput || !returnInput) return;

  departInput.value = tomorrow;
  departInput.min   = tomorrow;

  const returnDefault = new Date(today);
  returnDefault.setDate(returnDefault.getDate() + 7);
  returnInput.value = returnDefault.toISOString().split('T')[0];
  returnInput.min   = tomorrow;
}

// ——— DOM event bindings ———

function bindEvents() {
  // Trip type toggle
  document.querySelectorAll('.trip-type-btn').forEach(btn => {
    btn.addEventListener('click', () => onTripTypeChange(btn.dataset.type));
  });

  // Swap cities
  const swapBtn = document.getElementById('swapBtn');
  if (swapBtn) swapBtn.addEventListener('click', onSwapCities);

  // Departure date → constrain return min
  const departInput = document.getElementById('departDate');
  if (departInput) departInput.addEventListener('change', onDepartDateChange);

  // M1: Inline validation on blur
  const originInput = document.getElementById('originInput');
  const destInput = document.getElementById('destInput');
  if (originInput) originInput.addEventListener('blur', () => validateField('origin'));
  if (destInput) destInput.addEventListener('blur', () => validateField('dest'));

  // Form submit
  const form = document.getElementById('searchForm');
  if (form) form.addEventListener('submit', onSubmit);
}

// ——— Trip type toggle ———

function onTripTypeChange(type) {
  AppState.tripType = type;

  document.querySelectorAll('.trip-type-btn').forEach(btn => {
    const isActive = btn.dataset.type === type;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  const returnGroup = document.getElementById('returnDateGroup');
  const dateRow     = document.getElementById('dateRow');
  if (!returnGroup || !dateRow) return;

  if (type === 'roundtrip') {
    returnGroup.style.display = '';
    dateRow.classList.remove('single-date');
  } else {
    returnGroup.style.display = 'none';
    dateRow.classList.add('single-date');
  }

  clearFieldErrors();
}

// ——— Swap cities — driven entirely by AppState ———

function onSwapCities() {
  const o = _ac.origin;
  const d = _ac.dest;

  // Both autocompletes must be alive
  if (!o || !d) {
    console.warn('[SearchPage] Swap aborted — autocomplete not ready');
    return;
  }

  const originCode = AppState.origin;
  const destCode   = AppState.dest;

  if (originCode && destCode) {
    // Full swap: both codes are set
    AppState.origin = destCode;
    AppState.dest   = originCode;
    o.setCode(destCode);
    d.setCode(originCode);
  } else if (originCode) {
    // Only origin set → move it to dest
    AppState.origin = '';
    AppState.dest   = originCode;
    o.clear();
    d.setCode(originCode);
  } else if (destCode) {
    // Only dest set → move it to origin
    AppState.origin = destCode;
    AppState.dest   = '';
    d.clear();
    o.setCode(destCode);
  }

  clearFieldErrors();
}

// ——— Departure date changed ———

function onDepartDateChange() {
  const departVal   = document.getElementById('departDate')?.value;
  const returnInput = document.getElementById('returnDate');
  if (!departVal || !returnInput) return;

  returnInput.min = departVal;
  if (returnInput.value && returnInput.value < departVal) {
    returnInput.value = departVal;
  }
  clearFieldErrors();
}

// ——— Form submit — reads from AppState (single source of truth) ———

function onSubmit(e) {
  e.preventDefault();

  // Guard: autocomplete must be initialized
  if (!_ac.origin || !_ac.dest) {
    console.warn('[SearchPage] Submit blocked — autocomplete not initialized after page load');
    // Show user feedback instead of silently failing
    if (!_ac.origin) showFieldError('originInput', '搜索组件加载中，请稍后再试');
    if (!_ac.dest) showFieldError('destInput', '搜索组件加载中，请稍后再试');
    return;
  }

  // Read origin/dest from AppState (not from DOM or autocomplete closures)
  const origin = AppState.origin;
  const dest   = AppState.dest;

  const departDate = document.getElementById('departDate')?.value || '';
  const tripType   = AppState.tripType;
  const returnDate = tripType === 'roundtrip'
    ? (document.getElementById('returnDate')?.value || '')
    : '';

  clearFieldErrors();

  let valid = true;

  // Validate origin
  if (!origin) {
    showFieldError('originInput', '请选择出发城市');
    valid = false;
  }

  // Validate dest
  if (!dest) {
    showFieldError('destInput', '请选择到达城市');
    valid = false;
  }

  // Origin ≠ dest
  if (origin && dest && origin === dest) {
    showFieldError('originInput', '');
    showFieldError('destInput', '出发地与目的地不能相同');
    valid = false;
  }

  // Departure date required
  if (!departDate) {
    showFieldError('departDate', '请选择出发日期');
    valid = false;
  }

  // Round-trip validation
  if (tripType === 'roundtrip') {
    if (!returnDate) {
      showFieldError('returnDate', '请选择返程日期');
      valid = false;
    } else if (departDate && returnDate < departDate) {
      showFieldError('returnDate', '返程日期不能早于出发日期');
      valid = false;
    }
  }

  if (!valid) return;

  // M2: Show same-city multi-airport warning (non-blocking)
  const cityWarning = checkSameCityWarning(origin, dest);

  // M5: Save recent search
  saveRecentSearch(origin, dest);

  // Read passenger + cabin options
  const passengers = parseInt(document.getElementById('passengersSelect')?.value) || 1;
  const cabinClass = document.getElementById('cabinSelect')?.value || 'economy';
  AppState.passengers = passengers;
  AppState.cabinClass = cabinClass;

  // Read carrier preferences
  AppState.preferredCarriers = getSelectedCarriers();

  // Persist search params to global state
  AppState.setSearchParams({ origin, dest, departDate, returnDate, tripType });
  AppState.clearResults();

  console.log('[SearchPage] Navigating → results:', { origin, dest, departDate, tripType, passengers, cabinClass });

  // Navigate to results view with search params for History API
  document.dispatchEvent(new CustomEvent('navigate', { detail: {
    view: 'results',
    params: {
      from: origin,
      to: dest,
      date: departDate,
      returnDate: returnDate || undefined,
      trip: tripType,
      pax: passengers,
      cabin: cabinClass,
    },
    cityWarning,
  }}));
}

// ——— Field error helpers ———

function showFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (el) el.classList.add('field-error');

  let errorEl = document.getElementById(`${fieldId}-error`);
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = `${fieldId}-error`;
    errorEl.className = 'error-msg';
    const cityGroup = el?.closest('.city-group');
    if (cityGroup) {
      cityGroup.appendChild(errorEl);
    } else if (el?.parentNode) {
      el.parentNode.appendChild(errorEl);
    }
  }
  if (errorEl) errorEl.textContent = message;
}

// M1: Validate field value on blur (warn if not a known airport)
function validateField(field) {
  const code = field === 'origin' ? AppState.origin : AppState.dest;
  const inputId = field === 'origin' ? 'originInput' : 'destInput';
  const inputEl = document.getElementById(inputId);
  if (!code && inputEl?.value?.trim()) {
    showFieldError(inputId, '未识别该城市，请从下拉列表中选择');
  } else if (code) {
    clearFieldErrors();
  }
}

// M2: Check for same-city different airport (PEK→PKX)
function checkSameCityWarning(origin, dest) {
  const originAirports = AIRPORT_DB.filter(a => a.code === origin);
  const destAirports = AIRPORT_DB.filter(a => a.code === dest);
  if (!originAirports.length || !destAirports.length) return '';
  if (originAirports[0].city === destAirports[0].city && origin !== dest) {
    return `<span class="same-city-warning">⚠️ ${originAirports[0].city}同城多机场 (${origin}↔${dest})</span>`;
  }
  return '';
}

// H5: Show same-city warning inline on search form as user selects airports
function checkAndShowSameCityWarning() {
  const origin = AppState.origin;
  const dest = AppState.dest;
  const warningEl = document.getElementById('sameCityWarning');
  if (!origin || !dest) {
    if (warningEl) warningEl.style.display = 'none';
    return;
  }
  const msg = checkSameCityWarning(origin, dest);
  if (msg) {
    if (!warningEl) {
      const div = document.createElement('div');
      div.id = 'sameCityWarning';
      div.className = 'city-warning-inline';
      const searchCard = document.querySelector('.search-card form');
      if (searchCard) searchCard.appendChild(div);
    }
    const el = warningEl || document.getElementById('sameCityWarning');
    if (el) { el.innerHTML = msg; el.style.display = ''; }
  } else if (warningEl) {
    warningEl.style.display = 'none';
  }
}

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
  document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
}

// ——— M5: Recent searches (localStorage) ———
const RECENT_KEY = 'aerohub_recent';
const MAX_RECENT = 5;

function saveRecentSearch(origin, dest) {
  try {
    const originApt = CODE_MAP[origin];
    const destApt = CODE_MAP[dest];
    if (!originApt || !destApt) return;
    const entry = {
      from: origin, to: dest,
      label: `${originApt.city} → ${destApt.city}`,
    };
    let recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    recent = recent.filter(r => !(r.from === entry.from && r.to === entry.to));
    recent.unshift(entry);
    if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    renderRecentSearches();
  } catch { /* localStorage may be unavailable */ }
}

function renderRecentSearches() {
  const container = document.getElementById('recentSearches');
  if (!container) return;
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    if (!recent.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div class="recent-searches">
        <span class="recent-label">最近搜索:</span>
        ${recent.map(r => `
          <button class="recent-chip" data-from="${r.from}" data-to="${r.to}" title="${r.label}">${r.label}</button>
        `).join('')}
      </div>`;
    container.querySelectorAll('.recent-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const from = chip.dataset.from;
        const to = chip.dataset.to;
        if (_ac.origin && _ac.dest) {
          AppState.origin = from;
          AppState.dest = to;
          _ac.origin.setCode(from);
          _ac.dest.setCode(to);
        }
      });
    });
  } catch { /* ignore */ }
}

export function renderWatchlistPanel() {
  const panel = document.getElementById('watchlistPanel');
  const content = document.getElementById('watchlistContent');
  if (!panel || !content) return;
  const items = getWatchlist();
  if (!items.length) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = '';

  const cabinLabels = { economy: '经济舱', premium: '超值经济舱', business: '商务舱', first: '头等舱' };
  content.innerHTML = items.map(item => {
    const last = item.history[item.history.length - 1];
    const change = getPriceChange(item.key);
    const trend = getTrend(item.key);
    const changeHtml = change !== 0
      ? `<span class="watchlist-change ${trend}">${change > 0 ? '+' : ''}¥${Math.abs(change).toLocaleString()}</span>`
      : '';
    return `
      <div class="watchlist-item" data-watch-key="${item.key}">
        <div>
          <div class="watchlist-route">${item.origin} → ${item.dest}</div>
          <div class="watchlist-cabin">${cabinLabels[item.cabin] || item.cabin}</div>
        </div>
        <div class="watchlist-prices">
          <span class="watchlist-current">¥${(last?.price || 0).toLocaleString()}</span>
          ${changeHtml}
        </div>
        <button class="watchlist-remove" data-remove-key="${item.key}">✕</button>
      </div>`;
  }).join('');

  content.querySelectorAll('.watchlist-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromWatchlist(btn.dataset.removeKey);
      renderWatchlistPanel();
    });
  });

  content.querySelectorAll('.watchlist-item').forEach(item => {
    item.addEventListener('click', () => {
      const key = item.dataset.watchKey;
      const [origin, dest] = key.split('-');
      if (_ac.origin && _ac.dest) {
        AppState.origin = origin;
        AppState.dest = dest;
        _ac.origin.setCode(origin);
        _ac.dest.setCode(dest);
      }
    });
  });

  // Refresh button handler
  const refreshBtn = document.getElementById('watchlistRefreshBtn');
  const statusEl = document.getElementById('watchlistStatus');
  if (refreshBtn) {
    refreshBtn.onclick = async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳ 刷新中...';
      if (statusEl) {
        statusEl.style.display = '';
        statusEl.textContent = '正在获取最新价格...';
      }
      try {
        const updated = await refreshWatchlist();
        const count = updated.filter(r => r.price != null).length;
        if (statusEl) {
          statusEl.textContent = count > 0 ? `✅ 已更新 ${count} 条价格` : '⚠️ 暂无价格数据';
        }
      } catch {
        if (statusEl) statusEl.textContent = '❌ 刷新失败，请稍后重试';
      }
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 刷新';
      renderWatchlistPanel();
      setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 3000);
    };
  }
}



