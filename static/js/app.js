// ============================================================
// App — entry point, view orchestration
// ============================================================

import AppState from './state.js';
import { initSearchPage } from './search-page.js';
import { initResultsPage, renderResults } from './results-page.js';
import { initFlightProfile } from './flight-profile.js';
import { fetchApiStatus } from './api.js';

// ——— View switching ———

function showView(viewName) {
  AppState.navigateTo(viewName);

  document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');

  if (viewName === 'results') {
    renderResults();
  }
}

// ——— API status check ———

async function checkApiStatus() {
  try {
    const status = await fetchApiStatus();
    if (status.mode === 'google_flights') {
      document.getElementById('alertArea').innerHTML = `
        <div class="alert alert-info">📡 数据来源: Google Flights 实时抓取 — 显示真实经济舱机票价格（免费，无需 API Key）</div>`;
    }
  } catch {
    // Silently ignore — the alert area will just stay empty
  }
}

// ——— Bootstrap ———

document.addEventListener('DOMContentLoaded', () => {
  // Initialize search page
  initSearchPage();

  // Initialize results page event bindings
  initResultsPage();

  // Initialize flight geek profile panel
  initFlightProfile();

  // Check API status
  checkApiStatus();

  // Listen for navigation events from search-page
  document.addEventListener('navigate', (e) => {
    showView(e.detail.view);
  });
});
