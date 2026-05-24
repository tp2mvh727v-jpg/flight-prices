// ============================================================
// SearchPage v4.0 — State-driven autocomplete, zero DOM-vs-State drift
//   AppState.origin / AppState.dest 是唯一真相来源。
//   自动补全选择 → 写入 AppState → 由 setCode() 回填 input。
//   交换城市 → 读写 AppState → 同步两个自动补全组件。
// ============================================================

import AppState from './state.js';
import { createAutocomplete } from './autocomplete.js';
import { AIRPORT_DB, CODE_MAP } from './airports.js';
import { getWatchlist, removeFromWatchlist, getTrend, getPriceChange } from './watchlist.js';

// Autocomplete instance registry — keyed by 'origin' | 'dest'
const _ac = { origin: null, dest: null };

// Carrier preference — airlines available in the filter
const CARRIER_LIST = [
  { code: 'CA', name: '国航' }, { code: 'CZ', name: '南航' }, { code: 'MU', name: '东航' },
  { code: 'HU', name: '海航' }, { code: '3U', name: '川航' }, { code: 'MF', name: '厦航' },
  { code: 'ZH', name: '深航' }, { code: 'CX', name: '国泰' }, { code: 'SQ', name: '新航' },
  { code: 'NH', name: '全日空' }, { code: 'JL', name: '日航' }, { code: 'KE', name: '大韩' },
  { code: 'OZ', name: '韩亚' }, { code: 'BR', name: '长荣' }, { code: 'QF', name: '澳航' },
  { code: 'EK', name: '阿联酋' }, { code: 'QR', name: '卡塔尔' }, { code: 'EY', name: '阿提哈德' },
  { code: 'TK', name: '土耳其' }, { code: 'LH', name: '汉莎' }, { code: 'AF', name: '法航' },
  { code: 'BA', name: '英航' }, { code: 'UA', name: '美联航' }, { code: 'DL', name: '达美' },
  { code: 'AA', name: '美航' },
];

// ——— Public init ———

export function initSearchPage() {
  try {
    setDefaultDates();
    initAutocompletes();
    initCarrierChips();
    bindEvents();
    renderRecentSearches();
    renderWatchlistPanel();
    console.log('[SearchPage] v4.0 State-driven — autocomplete ready, form bound. Defaults:',
      AppState.origin, '→', AppState.dest);
  } catch (e) {
    console.error('[SearchPage] Init failed:', e);
  }
}

// ——— Autocomplete initialization ———

function getSelectedCarriers() {
  const active = document.querySelectorAll('.carrier-chip.active');
  if (active.length === 0 || active.length === CARRIER_LIST.length) return [];
  return [...active].map(c => c.dataset.carrier);
}

function initCarrierChips() {
  const container = document.getElementById('carrierChips');
  const toggleBtn = document.getElementById('carrierToggleAll');
  if (!container) return;

  // Restore from AppState if set, otherwise all active
  const saved = AppState.preferredCarriers || [];
  const allOn = saved.length === 0;

  container.innerHTML = CARRIER_LIST.map(c => {
    const active = allOn || saved.includes(c.code);
    return `<button type="button" class="carrier-chip${active ? ' active' : ''}" data-carrier="${c.code}" title="${c.name} (${c.code})" aria-pressed="${active}">${c.code}</button>`;
  }).join('');

  if (toggleBtn) {
    toggleBtn.textContent = allOn ? '全部航司' : `已选 ${saved.length}`;
    toggleBtn.addEventListener('click', () => {
      const chips = container.querySelectorAll('.carrier-chip');
      const anyOff = container.querySelector('.carrier-chip:not(.active)');
      if (anyOff) {
        chips.forEach(c => { c.classList.add('active'); c.setAttribute('aria-pressed', 'true'); });
        toggleBtn.textContent = '全部航司';
      } else {
        chips.forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
        toggleBtn.textContent = '全部取消';
      }
    });
  }

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.carrier-chip');
    if (!chip) return;
    chip.classList.toggle('active');
    chip.setAttribute('aria-pressed', chip.classList.contains('active') ? 'true' : 'false');
    const active = container.querySelectorAll('.carrier-chip.active');
    if (toggleBtn) {
      toggleBtn.textContent = active.length === CARRIER_LIST.length ? '全部航司' : `已选 ${active.length}`;
    }
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
    console.error('[SearchPage] Submit blocked — autocomplete not initialized');
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
}



