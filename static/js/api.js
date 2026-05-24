// ============================================================
// API — delegates to flightService (feature-toggled data layer)
// ============================================================

import { getFlights, getDateRange, isRealAPIEnabled } from './flightService.js';
import AppState from './state.js';

const CABIN_MULTIPLIERS = { economy: 1, premium: 1.5, business: 3, first: 5 };

let _currentController = null;

export function createAbortController() {
  _abortPending();
  _currentController = new AbortController();
  return _currentController;
}

export function abortPending() {
  _abortPending();
}

function _abortPending() {
  if (_currentController) {
    _currentController.abort();
    _currentController = null;
  }
}

export async function fetchApiStatus() {
  if (isRealAPIEnabled()) {
    return {
      mode: 'flightapi_io',
      method: 'FlightAPI.io real API',
      free: false,
    };
  }
  return {
    mode: 'mock',
    method: '高仿真模拟数据 (FlightAPI.io 格式)',
    free: true,
    hint: 'ENABLE_REAL_API = false, 未消耗 FlightAPI.io 额度',
  };
}

function _applyCabinMultiplier(data) {
  const cabinClass = AppState.cabinClass || 'economy';
  const mult = CABIN_MULTIPLIERS[cabinClass] || 1;
  if (mult === 1 || !data || !data.prices) return data;
  data.prices = data.prices.map(p => ({ ...p, price: Math.round(p.price * mult) }));
  return data;
}

export async function fetchPrices(origin, dest, date, signal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const result = await getFlights(origin, dest, date);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return _applyCabinMultiplier(result);
}

export async function fetchDateRange(origin, dest, start, days = 30, signal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const result = await getDateRange(origin, dest, start, days);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return result;
}
