// ============================================================
// App — entry point, view orchestration, Aero-Hub v4.0
//   Splash → Search → Results (SPA views)
// ============================================================

import AppState from './state.js';
import { initSearchPage } from './search-page.js';
import { initResultsPage, renderResults } from './results-page.js';
import { initFlightProfile } from './flight-profile.js';
import { fetchApiStatus, abortPending } from './api.js';
import Analytics from './analytics.js';

// ——— Splash Screen Particle Canvas ———

let _splashRaf = null;

function _initSplashParticles() {
  const canvas = document.getElementById('splashParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let W, H;
  const particles = [];
  const COUNT = 60;

  function resize() {
    W = canvas.width = canvas.clientWidth || window.innerWidth;
    H = canvas.height = canvas.clientHeight || window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // M9: Depth layers — far/medium/near particles
  const layers = [
    { count: 25, rMin: 0.2, rMax: 0.6, oMin: 0.04, oMax: 0.18, vMult: 0.5 },   // far
    { count: 25, rMin: 0.6, rMax: 1.5, oMin: 0.12, oMax: 0.4, vMult: 1.0 },     // mid
    { count: 10, rMin: 1.5, rMax: 2.8, oMin: 0.04, oMax: 0.14, vMult: 1.6 },    // near (large, faint, fast)
  ];

  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * (layer.rMax - layer.rMin) + layer.rMin,
        vx: (Math.random() - 0.5) * 0.25 * layer.vMult,
        vy: (Math.random() * 0.18 + 0.04) * layer.vMult,
        opacity: Math.random() * (layer.oMax - layer.oMin) + layer.oMin,
        phase: Math.random() * Math.PI * 2,
        pulse: Math.random() * 0.006 + 0.003,
      });
    }
  }

  function draw() {
    if (!canvas.isConnected) { _splashRaf = null; return; }
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.x += p.vx;
      p.y -= p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;

      p.opacity += Math.sin(Date.now() * p.pulse + p.phase) * 0.005;
      p.opacity = Math.max(0.06, Math.min(0.55, p.opacity));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,210,245,${p.opacity.toFixed(2)})`;
      ctx.fill();
    }

    _splashRaf = requestAnimationFrame(draw);
  }

  _splashRaf = requestAnimationFrame(draw);
}

function _destroySplashParticles() {
  if (_splashRaf) { cancelAnimationFrame(_splashRaf); _splashRaf = null; }
}

// ——— Splash → Search transition ———

function _setupSplashTransition() {
  const enterBtn = document.getElementById('splashEnterBtn');
  const splashView = document.getElementById('view-splash');
  if (!enterBtn || !splashView) return;

  function transitionToSearch() {
    const screen = splashView.querySelector('.splash-screen');
    if (!screen) return;

    screen.classList.add('exit');

    // After transition completes, switch to search view
    setTimeout(() => {
      _destroySplashParticles();
      splashView.classList.remove('active');
      showView('search');
    }, 750);
  }

  enterBtn.addEventListener('click', transitionToSearch);
}

// ——— ATC Radar Scope Canvas (search page background) ———
//   Draws a subtle air-traffic-control style radar scope:
//   range rings, cross-hairs, rotating sweep, random aircraft blips.

let _aeroRaf = null;

function _initAeroCanvas() {
  const canvas = document.getElementById('aeroBgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let W, H, cx, cy, radius;
  const blips = [];
  const BLIP_COUNT = 18;
  let sweepAngle = 0;
  const SWEEP_SPEED = 0.012; // radians per frame (~0.7°/frame)

  function resize() {
    W = canvas.width = canvas.clientWidth || window.innerWidth;
    H = canvas.height = canvas.clientHeight || window.innerHeight;
    cx = W * 0.5;
    cy = H * 0.45;
    radius = Math.min(W, H) * 0.42;
  }
  window.addEventListener('resize', resize);
  resize();

  // Initialize blips (simulated aircraft positions)
  for (let i = 0; i < BLIP_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.9;
    blips.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      r: Math.random() * 1.8 + 0.6,
      opacity: 0,
      targetOpacity: Math.random() * 0.5 + 0.1,
      fadeSpeed: 0.003 + Math.random() * 0.006,
      heading: Math.random() * Math.PI * 2,
      trail: [],
    });
  }

  function draw() {
    if (!canvas.isConnected) { _aeroRaf = null; return; }
    ctx.clearRect(0, 0, W, H);

    // —— Background: radial gradient ——
    const bg = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.3);
    bg.addColorStop(0, 'rgba(10, 25, 45, 0.10)');
    bg.addColorStop(0.5, 'rgba(8, 18, 32, 0.06)');
    bg.addColorStop(1, 'rgba(5, 10, 18, 0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const ringColor = 'rgba(14, 165, 233, 0.07)';
    const crossColor = 'rgba(14, 165, 233, 0.05)';
    const sweepColor = 'rgba(16, 185, 129, 0.10)';
    const blipColor = 'rgba(16, 185, 129, 0.60)';

    // —— Range rings ——
    for (let i = 1; i <= 4; i++) {
      const r = (radius / 4) * i;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 0.5;
      if (i % 2 === 0) ctx.setLineDash([3, 12]);
      else ctx.setLineDash([]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // —— Cross-hairs ——
    ctx.strokeStyle = crossColor;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // —— Tick marks on outer ring ——
    for (let i = 0; i < 36; i++) {
      const a = (Math.PI * 2 / 36) * i;
      const len = i % 3 === 0 ? 10 : 5;
      const inner = radius - len;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    // —— Rotating radar sweep ——
    sweepAngle = (sweepAngle + SWEEP_SPEED) % (Math.PI * 2);
    const trailLen = Math.PI * 0.35; // ~63° trailing fade
    for (let t = 0; t < 16; t++) {
      const a = sweepAngle - (t / 16) * trailLen;
      const alpha = 0.001 + (1 - t / 16) * 0.06;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, a - 0.008, a + 0.008);
      ctx.closePath();
      ctx.fillStyle = `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
      ctx.fill();
    }

    // —— Sweep line ——
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(sweepAngle) * radius,
      cy + Math.sin(sweepAngle) * radius
    );
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // —— Center dot ——
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.fill();

    // —— Aircraft blips ——
    for (const b of blips) {
      // Slowly move blip along its heading
      b.x += Math.cos(b.heading) * 0.08;
      b.y += Math.sin(b.heading) * 0.08;
      // Wrap around radar scope
      const dx = b.x - cx, dy = b.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius * 0.95) {
        b.heading = Math.atan2(cy - b.y, cx - b.x) + (Math.random() - 0.5) * 1.2;
        b.x = cx + Math.cos(b.heading) * radius * 0.2;
        b.y = cy + Math.sin(b.heading) * radius * 0.2;
      }

      // Random target opacity changes
      if (Math.random() < 0.008) {
        b.targetOpacity = Math.random() * 0.5 + 0.05;
      }

      // Fade toward target
      b.opacity += (b.targetOpacity - b.opacity) * b.fadeSpeed;

      // Draw tiny trail
      if (b.opacity > 0.08) {
        b.trail.push({ x: b.x, y: b.y, life: 1 });
        if (b.trail.length > 8) b.trail.shift();
        for (let t = 0; t < b.trail.length; t++) {
          b.trail[t].life -= 0.12;
          if (b.trail[t].life <= 0) continue;
          ctx.beginPath();
          ctx.arc(b.trail[t].x, b.trail[t].y, b.r * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(16, 185, 129, ${(b.opacity * b.trail[t].life * 0.3).toFixed(3)})`;
          ctx.fill();
        }
      }

      // Blip glow
      if (b.opacity > 0.04) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${(b.opacity * 0.15).toFixed(3)})`;
        ctx.fill();
      }

      // Blip core
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(16, 185, 129, ${b.opacity.toFixed(2)})`;
      ctx.fill();
    }

    _aeroRaf = requestAnimationFrame(draw);
  }

  _aeroRaf = requestAnimationFrame(draw);
}

function _destroyAeroCanvas() {
  if (_aeroRaf) { cancelAnimationFrame(_aeroRaf); _aeroRaf = null; }
}

// ——— View switching ———

function showView(viewName, params = {}) {
  AppState.navigateTo(viewName);
  Analytics.trackPageView(viewName);

  // H8: Abort pending fetch requests when navigating away from results
  if (AppState.currentView === 'results' && viewName !== 'results') {
    abortPending();
  }

  document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  // H2: Focus management — focus the primary interactive element
  requestAnimationFrame(() => {
    if (viewName === 'search') {
      const originInput = document.getElementById('originInput');
      if (originInput) originInput.focus();
    } else if (viewName === 'results') {
      const backBtn = document.getElementById('backToSearch');
      if (backBtn) backBtn.focus();
    }
  });

  if (viewName === 'search') {
    _initAeroCanvas();
    // Update URL hash
    const url = new URL(window.location);
    url.hash = '#search';
    history.pushState({ view: 'search' }, '', url);
  } else if (viewName === 'results') {
    _destroyAeroCanvas();
    // Build hash with search params
    const p = new URLSearchParams();
    if (params.from) p.set('from', params.from);
    if (params.to) p.set('to', params.to);
    if (params.date) p.set('date', params.date);
    if (params.returnDate) p.set('return', params.returnDate);
    if (params.trip) p.set('trip', params.trip);
    const url = new URL(window.location);
    url.hash = '#results';
    if ([...p.keys()].length) url.hash += '?' + p.toString();
    history.pushState({ view: 'results', ...params }, '', url);
  }

  if (viewName === 'results') {
    renderResults();
  }
}

// ——— Restore view from URL hash on initial load / popstate ———

function _restoreFromHash() {
  const hash = window.location.hash;
  if (!hash) return; // stay on search (default)

  if (hash.startsWith('#results')) {
    // Parse query string from hash
    const qIdx = hash.indexOf('?');
    const params = {};
    if (qIdx >= 0) {
      const qs = hash.slice(qIdx + 1);
      const sp = new URLSearchParams(qs);
      for (const [k, v] of sp) params[k] = v;
    }

    // Set AppState from URL params
    if (params.from) AppState.origin = params.from;
    if (params.to) AppState.dest = params.to;
    if (params.date) {
      AppState.originalSearchDate = params.date;
      AppState.currentFocusDate = params.date;
      AppState.departDate = params.date;
    }
    if (params.return) AppState.returnDate = params.return;
    if (params.trip) AppState.tripType = params.trip;

    // Go straight to results
    showView('results', { from: params.from, to: params.to, date: params.date, returnDate: params.return, trip: params.trip });
  } else if (hash === '#search') {
    // Already on search — just focus input
    const originInput = document.getElementById('originInput');
    if (originInput) originInput.focus();
  }
}

function _onPopState(event) {
  if (event.state && event.state.view) {
    const v = event.state.view;
    document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`view-${v}`);
    if (target) target.classList.add('active');

    if (v === 'search') {
      _initAeroCanvas();
    } else {
      _destroyAeroCanvas();
    }

    if (v === 'results') {
      // Restore AppState from popstate
      if (event.state.from) AppState.origin = event.state.from;
      if (event.state.to) AppState.dest = event.state.to;
      if (event.state.date) {
        AppState.originalSearchDate = event.state.date;
        AppState.currentFocusDate = event.state.date;
        AppState.departDate = event.state.date;
      }
      if (event.state.returnDate) AppState.returnDate = event.state.returnDate;
      if (event.state.trip) AppState.tripType = event.state.trip;
      renderResults();
    }
  }
}

// ——— API status check ———

async function checkApiStatus() {
  try {
    const status = await fetchApiStatus();
    const alertEl = document.getElementById('alertArea');
    if (!alertEl) return;
    if (status.mode === 'google_flights') {
      alertEl.innerHTML = `
        <div class="alert alert-info">📡 数据来源: Google Flights 实时抓取 — 显示真实经济舱机票价格（免费，无需 API Key）</div>`;
    }
  } catch {
    // Silently ignore
  }
}

// ——— Bootstrap ———

function _bootstrap() {
  // H2: Preload AppState from URL hash before initSearchPage so autocomplete is backfilled
  const hash = window.location.hash;
  if (hash && hash.startsWith('#search')) {
    const qIdx = hash.indexOf('?');
    if (qIdx >= 0) {
      const sp = new URLSearchParams(hash.slice(qIdx + 1));
      if (sp.get('from')) AppState.origin = sp.get('from');
      if (sp.get('to')) AppState.dest = sp.get('to');
    }
  }

  // Phase 3: Initialize all subsystems (idle until views activate)
  try { initSearchPage(); } catch (e) { console.error('[App] initSearchPage failed:', e); }
  try { initResultsPage(); } catch (e) { console.error('[App] initResultsPage failed:', e); }
  try { initFlightProfile(); } catch (e) { console.error('[App] initFlightProfile failed:', e); }

  // Check API status
  checkApiStatus();

  // Start privacy-friendly analytics
  Analytics.init();

  // Listen for navigation events from search-page
  document.addEventListener('navigate', (e) => {
    // H6: Navigation guard — warn if leaving results with partially selected roundtrip
    if (AppState.currentView === 'results' && e.detail.view === 'search' && AppState.tripType === 'roundtrip') {
      const hasOut = AppState.selectedOutbound !== null;
      const hasRet = AppState.selectedReturn !== null;
      if ((hasOut || hasRet) && !(hasOut && hasRet)) {
        if (!confirm('您尚未完成往返选择，确定要返回搜索吗？')) return;
      }
    }
    showView(e.detail.view, e.detail.params || {});
    if (e.detail.view === 'results') {
      const p = e.detail.params || {};
      if (p.from && p.to) {
        Analytics.trackSearch(p.from, p.to, p.trip || 'oneway');
      }
      // M2: Show same-city multi-airport warning
      if (e.detail.cityWarning) {
        AppState.cityWarning = e.detail.cityWarning;
      }
    }
  });

  // History API: browser back/forward
  window.addEventListener('popstate', _onPopState);

  // Initial load: restore from URL hash (e.g. bookmark, refresh)
  if (window.location.hash) {
    _restoreFromHash();
  }

  // PWA: register service worker for offline caching
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// Module scripts are deferred — DOMContentLoaded has already fired by the time
// this runs. Check readyState to avoid missing the event entirely.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootstrap);
} else {
  _bootstrap();
}
