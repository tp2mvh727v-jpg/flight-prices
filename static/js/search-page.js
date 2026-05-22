// ============================================================
// SearchPage — search form with autocomplete city pickers
// ============================================================

import AppState from './state.js';
import { createAutocomplete } from './autocomplete.js';

let originAC = null;
let destAC = null;

export function initSearchPage() {
  setDefaultDates();
  initAutocompletes();
  bindEvents();
}

// ——— Initialize autocomplete inputs ———

function initAutocompletes() {
  const originInput = document.getElementById('originInput');
  const destInput = document.getElementById('destInput');

  originAC = createAutocomplete(originInput, {
    placeholder: '输入城市名、拼音或机场代码...',
    onSelect(apt) {
      clearFieldErrors();
    },
  });

  destAC = createAutocomplete(destInput, {
    placeholder: '输入城市名、拼音或机场代码...',
    onSelect(apt) {
      clearFieldErrors();
    },
  });

  // Set defaults
  originAC.setCode(AppState.origin);
  destAC.setCode(AppState.dest);
}

// ——— Set default dates ———

function setDefaultDates() {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const tomorrow = today.toISOString().split('T')[0];

  const departInput = document.getElementById('departDate');
  const returnInput = document.getElementById('returnDate');

  departInput.value = tomorrow;
  departInput.min = tomorrow;

  const returnDefault = new Date(today);
  returnDefault.setDate(returnDefault.getDate() + 7);
  returnInput.value = returnDefault.toISOString().split('T')[0];
  returnInput.min = tomorrow;
}

// ——— Event bindings ———

function bindEvents() {
  // Trip type toggle
  document.querySelectorAll('.trip-type-btn').forEach(btn => {
    btn.addEventListener('click', () => onTripTypeChange(btn.dataset.type));
  });

  // Swap cities
  document.getElementById('swapBtn').addEventListener('click', onSwapCities);

  // Departure date change → update return min
  document.getElementById('departDate').addEventListener('change', onDepartDateChange);

  // Form submit
  document.getElementById('searchForm').addEventListener('submit', onSubmit);
}

// ——— Trip type ———

function onTripTypeChange(type) {
  AppState.tripType = type;

  document.querySelectorAll('.trip-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  const returnGroup = document.getElementById('returnDateGroup');
  const dateRow = document.getElementById('dateRow');

  if (type === 'roundtrip') {
    returnGroup.style.display = '';
    dateRow.classList.remove('single-date');
  } else {
    returnGroup.style.display = 'none';
    dateRow.classList.add('single-date');
  }

  clearFieldErrors();
}

// ——— Swap cities ———

function onSwapCities() {
  const originCode = originAC.getCode();
  const destCode = destAC.getCode();

  if (originCode && destCode) {
    originAC.setCode(destCode);
    destAC.setCode(originCode);
  } else if (originCode) {
    destAC.setCode(originCode);
    originAC.clear();
  } else if (destCode) {
    originAC.setCode(destCode);
    destAC.clear();
  }
  clearFieldErrors();
}

// ——— Departure date changed ———

function onDepartDateChange() {
  const departVal = document.getElementById('departDate').value;
  const returnInput = document.getElementById('returnDate');
  if (departVal) {
    returnInput.min = departVal;
    if (returnInput.value && returnInput.value < departVal) {
      returnInput.value = departVal;
    }
  }
  clearFieldErrors();
}

// ——— Form submit with validation ———

function onSubmit(e) {
  e.preventDefault();

  const origin = originAC.getCode();
  const dest = destAC.getCode();
  const departDate = document.getElementById('departDate').value;
  const tripType = AppState.tripType;
  const returnDate = tripType === 'roundtrip'
    ? document.getElementById('returnDate').value
    : '';

  clearFieldErrors();

  let valid = true;

  // Required: origin
  if (!origin) {
    showFieldError('originInput', '请选择出发城市');
    valid = false;
  }

  // Required: dest
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

  // Required: departure date
  if (!departDate) {
    showFieldError('departDate', '请选择出发日期');
    valid = false;
  }

  // Round-trip: return date required & must be >= departure
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

  // Store search params with real airport codes
  AppState.setSearchParams({ origin, dest, departDate, returnDate, tripType });
  AppState.clearResults();

  // Navigate to results
  document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'results' } }));
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
    el.closest('.city-group')?.appendChild(errorEl);
    if (!el.closest('.city-group')) {
      el.parentNode.appendChild(errorEl);
    }
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
  document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
}
