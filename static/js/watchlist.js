// ============================================================
// Watchlist v1 — Price tracking via localStorage
// ============================================================

const STORAGE_KEY = 'aerohub_watchlist';

function _load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch (_) { return []; }
}
function _save(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (_) {}
}

export function getWatchlist() {
  return _load();
}

export function addToWatchlist({ origin, dest, originName, destName, cabin, price, airline, airlineName, date }) {
  const items = _load();
  const key = `${origin}-${dest}-${cabin}`;
  const existing = items.find(i => i.key === key);
  const entry = {
    key,
    origin, dest,
    originName: originName || origin,
    destName: destName || dest,
    cabin: cabin || 'economy',
    addedAt: Date.now(),
    initialPrice: price,
    initialAirline: airline || '',
    history: [{ date: date || new Date().toISOString().slice(0, 10), price, airline: airline || '', airlineName: airlineName || '' }],
  };
  if (existing) {
    existing.history.push({ date: date || new Date().toISOString().slice(0, 10), price, airline: airline || '', airlineName: airlineName || '' });
    if (existing.history.length > 90) existing.history = existing.history.slice(-90);
    existing.initialPrice = existing.history[0].price;
  } else {
    items.push(entry);
  }
  _save(items);
  return !existing;
}

export function removeFromWatchlist(key) {
  const items = _load().filter(i => i.key !== key);
  _save(items);
}

export function isTracked(key) {
  return _load().some(i => i.key === key);
}

export function updatePrice(key, price, airline, airlineName, date) {
  const items = _load();
  const entry = items.find(i => i.key === key);
  if (!entry) return;
  entry.history.push({ date: date || new Date().toISOString().slice(0, 10), price, airline: airline || '', airlineName: airlineName || '' });
  if (entry.history.length > 90) entry.history = entry.history.slice(-90);
  _save(items);
}

/** Update watchlist prices with fresh search results */
export function refreshWatchlistFromResults(origin, dest, cabin, prices) {
  if (!prices || prices.length === 0) return;
  const key = `${origin}-${dest}-${cabin}`;
  const items = _load();
  const entry = items.find(i => i.key === key);
  if (!entry) return;
  const best = prices[0]; // prices are already sorted
  updatePrice(key, best.price, best.airline, best.airline_name, new Date().toISOString().slice(0, 10));
}

export function getTrend(key) {
  const items = _load();
  const entry = items.find(i => i.key === key);
  if (!entry || entry.history.length < 2) return 'flat';
  const latest = entry.history[entry.history.length - 1].price;
  const prev = entry.history[entry.history.length - 2].price;
  if (latest < prev) return 'down';
  if (latest > prev) return 'up';
  return 'flat';
}

export function getPriceChange(key) {
  const items = _load();
  const entry = items.find(i => i.key === key);
  if (!entry || entry.history.length < 2) return 0;
  const latest = entry.history[entry.history.length - 1].price;
  const prev = entry.history[0].price;
  return latest - prev;
}
