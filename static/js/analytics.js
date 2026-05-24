// ============================================================
// Analytics — privacy-friendly, batch-send via sendBeacon
//   M4: Offline queue — caches events in localStorage when
//   sendBeacon fails (offline), retries when back online.
// ============================================================

const _queue = [];
const _FLUSH_INTERVAL = 5000;
const _MAX_BATCH = 10;
const _OFFLINE_KEY = 'aerohub_analytics_offline';
let _timer = null;

function _flush() {
  if (!_queue.length) return;
  const batch = _queue.splice(0);
  try {
    const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
    const sent = navigator.sendBeacon('/api/analytics', blob);
    // M4: If sendBeacon fails (offline), save to localStorage for retry
    if (!sent) {
      _saveOffline(batch);
    }
  } catch {
    _saveOffline(batch);
  }
}

// M4: Save events that couldn't be sent to localStorage
function _saveOffline(batch) {
  try {
    const stored = JSON.parse(localStorage.getItem(_OFFLINE_KEY) || '[]');
    stored.push(...batch);
    localStorage.setItem(_OFFLINE_KEY, JSON.stringify(stored.slice(-100))); // cap at 100
  } catch { /* ignore */ }
}

// M4: Retry sending offline events when back online
function _drainOffline() {
  try {
    const stored = JSON.parse(localStorage.getItem(_OFFLINE_KEY) || '[]');
    if (!stored.length) return;
    const blob = new Blob([JSON.stringify({ events: stored })], { type: 'application/json' });
    const sent = navigator.sendBeacon('/api/analytics', blob);
    if (sent) {
      localStorage.removeItem(_OFFLINE_KEY);
    }
  } catch { /* ignore */ }
}

function _enqueue(event, data = {}) {
  _queue.push({ event, data, ts: Date.now() });
  if (_queue.length >= _MAX_BATCH) _flush();
}

export function init() {
  if (_timer) return;
  _timer = setInterval(_flush, _FLUSH_INTERVAL);
  window.addEventListener('beforeunload', _flush);

  // M4: Drain offline queue when back online
  window.addEventListener('online', _drainOffline);
  // Also try on init (in case we're already online with queued data)
  if (navigator.onLine) _drainOffline();
}

export function trackPageView(view) {
  _enqueue('pageview', { view });
}

export function trackSearch(origin, dest, tripType) {
  _enqueue('search', { origin, dest, tripType });
}

export function trackProfileOpen(airline, aircraftCode) {
  _enqueue('profile_open', { airline, aircraftCode });
}

export function trackRoundtripComplete(outPrice, retPrice, total, origin, dest) {
  _enqueue('roundtrip_complete', { outPrice, retPrice, total, origin, dest });
}

export default { init, trackPageView, trackSearch, trackProfileOpen, trackRoundtripComplete };
