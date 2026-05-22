// ============================================================
// API — delegates to flightService (feature-toggled data layer)
// ============================================================

import { getFlights, getDateRange, isRealAPIEnabled } from './flightService.js';

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

export async function fetchPrices(origin, dest, date) {
  return getFlights(origin, dest, date);
}

export async function fetchDateRange(origin, dest, start, days = 30) {
  return getDateRange(origin, dest, start, days);
}
