// ============================================================
// FlightCard — renders a single flight row / mobile card
// ============================================================

import { flightInfo, layoverInfo, aircraftBadge, formatPrice, escapeHtml } from './utils.js';

function _quoteAgeLabel(minutes) {
  if (!minutes && minutes !== 0) return '';
  if (minutes < 2) return '<span class="quote-age quote-fresh">刚刚</span>';
  if (minutes < 60) return `<span class="quote-age quote-fresh">${minutes}分钟前</span>`;
  const hrs = Math.floor(minutes / 60);
  if (hrs < 24) return `<span class="quote-age">${hrs}小时前</span>`;
  return `<span class="quote-age quote-stale">${Math.floor(hrs / 24)}天前</span>`;
}

export function renderFlightRow(flight, dateVal, columns = 7, opts = {}) {
  const { selectable = false, selected = false, leg = 'outbound' } = opts;
  const colClass = `cols${columns}`;
  const selClass = selectable ? ' flight-row-selectable' : '';
  const activeClass = selected ? ' flight-row-selected' : '';

  const timeCell = `<div class="time-cell">${flight.departure || '--:--'} &rarr; ${flight.arrival || '--:--'}</div>`;
  const durCell = `<div class="dur-cell">${flight.duration || '--'}</div>`;
  const layoverCell = `<div class="layover-cell">${layoverInfo(flight)}</div>`;
  const acCell = `<div>${aircraftBadge(flight)}</div>`;
  const quoteAgeHtml = _quoteAgeLabel(flight.quote_age);
  const priceCell = `<div class="price-val">${formatPrice(flight.price)}${quoteAgeHtml}</div>`;
  const profileBtn = `<button class="geek-profile-btn" data-flight-index="${flight._index ?? ''}">飞行器深度档案</button>`;
  const selIndicator = selectable
    ? `<div class="flight-sel-radio ${selected ? 'checked' : ''}" data-leg="${leg}" data-idx="${flight._index ?? ''}"></div>`
    : '';
  const trackBtn = `<button class="track-btn" data-track-origin="${flight.origin || ''}" data-track-dest="${flight.dest || ''}" data-track-cabin="${flight._cabin || 'economy'}" data-track-price="${flight.price || 0}" data-track-airline="${flight.airline || ''}" data-track-airline-name="${escapeHtml(flight.airline_name || '')}" data-track-key="${flight.origin || ''}-${flight.dest || ''}-${flight._cabin || 'economy'}" title="追踪此航线价格">☆</button>`;

  if (columns === 8) {
    const dateCell = `<div class="date-cell">${dateVal.slice(5)}</div>`;
    return `
      <div class="table-row ${colClass}${selClass}${activeClass}" data-leg="${leg}" data-idx="${flight._index ?? ''}">
        ${dateCell}
        <div>${flightInfo(flight)}</div>
        ${timeCell}
        ${durCell}
        ${layoverCell}
        <div class="ac-badge-placeholder">${acCell}</div>
        ${priceCell}
        <div>${trackBtn}${selIndicator}${profileBtn}</div>
      </div>`;
  }

  return `
    <div class="table-row ${colClass}${selClass}${activeClass}" data-leg="${leg}" data-idx="${flight._index ?? ''}">
      <div>${flightInfo(flight)}</div>
      ${timeCell}
      ${durCell}
      ${layoverCell}
      ${acCell}
      ${priceCell}
      <div>${trackBtn}${selIndicator}${profileBtn}</div>
    </div>`;
}

// ——— Mobile card layout (used below 700px breakpoint) ———

export function renderFlightCard(flight, dateVal, opts = {}) {
  const { selectable = false, selected = false, leg = 'outbound' } = opts;
  const selClass = selectable ? ' flight-card-selectable' : '';
  const activeClass = selected ? ' flight-card-selected' : '';

  const timeHtml = flight.departure
    ? `<span class="fpc-time">${escapeHtml(flight.departure)}</span>
       <span class="fpc-arrow">&rarr;</span>
       <span class="fpc-time">${escapeHtml(flight.arrival)}</span>`
    : '<span class="fpc-time">--:--</span>';

  const selDot = selectable
    ? `<div class="flight-sel-radio ${selected ? 'checked' : ''}" data-leg="${leg}" data-idx="${flight._index ?? ''}"></div>`
    : '';

  return `
    <div class="flight-card${selClass}${activeClass}" data-leg="${leg}" data-idx="${flight._index ?? ''}">
      <div class="fpc-top">
        ${flightInfo(flight)}
        <div class="fpc-price">${formatPrice(flight.price)}${_quoteAgeLabel(flight.quote_age)}</div>
      </div>
      <div class="fpc-mid">
        <div class="fpc-timeline">${timeHtml}</div>
        <div class="fpc-duration">${flight.duration || '--'}</div>
      </div>
      <div class="fpc-bottom">
        <span class="fpc-tag">${layoverInfo(flight)}</span>
        <span class="fpc-tag">${aircraftBadge(flight)}</span>
        ${selDot}
        <button class="track-btn" data-track-origin="${flight.origin || ''}" data-track-dest="${flight.dest || ''}" data-track-cabin="${flight._cabin || 'economy'}" data-track-price="${flight.price || 0}" data-track-airline="${flight.airline || ''}" data-track-airline-name="${escapeHtml(flight.airline_name || '')}" data-track-key="${flight.origin || ''}-${flight.dest || ''}-${flight._cabin || 'economy'}" title="追踪此航线价格">☆</button>
        <button class="geek-profile-btn" data-flight-index="${flight._index ?? ''}">飞行器深度档案</button>
      </div>
    </div>`;
}

// ——— Roundtrip total bar ———

export function renderRoundtripSummary(outFlight, retFlight, total) {
  if (!outFlight || !retFlight) {
    return `
      <div class="rt-summary rt-summary-incomplete">
        <span class="rt-summary-hint">请分别选择去程和返程航班以查看总价</span>
      </div>`;
  }
  return `
    <div class="rt-summary">
      <div class="rt-summary-leg">
        <span class="rt-summary-label">去程</span>
        <span class="rt-summary-flight">${escapeHtml(outFlight.airline)} ${(outFlight.segments||[]).map(s=>s.flight_no).join('-') || '--'}</span>
        <span class="rt-summary-price">${formatPrice(outFlight.price)}</span>
      </div>
      <div class="rt-summary-plus">+</div>
      <div class="rt-summary-leg">
        <span class="rt-summary-label">返程</span>
        <span class="rt-summary-flight">${escapeHtml(retFlight.airline)} ${(retFlight.segments||[]).map(s=>s.flight_no).join('-') || '--'}</span>
        <span class="rt-summary-price">${formatPrice(retFlight.price)}</span>
      </div>
      <div class="rt-summary-equals">=</div>
      <div class="rt-summary-total">
        <span class="rt-summary-total-label">往返总价</span>
        <span class="rt-summary-total-price">${formatPrice(total)}</span>
      </div>
    </div>`;
}
