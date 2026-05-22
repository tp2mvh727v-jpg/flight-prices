// ============================================================
// FlightCard — renders a single flight row
// ============================================================

import { flightInfo, layoverInfo, aircraftBadge, formatPrice } from './utils.js';

export function renderFlightRow(flight, dateVal, columns = 7) {
  const colClass = columns === 8 ? 'cols8' : 'cols7';

  const timeCell = `<div class="time-cell">${flight.departure || '--:--'} &rarr; ${flight.arrival || '--:--'}</div>`;
  const durCell = `<div class="dur-cell">${flight.duration || '--'}</div>`;
  const layoverCell = `<div class="layover-cell">${layoverInfo(flight)}</div>`;
  const acCell = `<div>${aircraftBadge(flight)}</div>`;
  const priceCell = `<div class="price-val">${formatPrice(flight.price)}</div>`;
  const profileBtn = `<button class="geek-profile-btn" data-flight-index="${flight._index ?? ''}">飞行器深度档案</button>`;

  if (columns === 8) {
    // Used in trend table: date + 7 cols
    const dateCell = `<div class="date-cell">${dateVal.slice(5)}</div>`;
    return `
      <div class="table-row ${colClass}">
        ${dateCell}
        <div>${flightInfo(flight)}</div>
        ${timeCell}
        ${durCell}
        ${layoverCell}
        <div class="ac-badge-placeholder">${acCell}</div>
        ${priceCell}
        <div>${profileBtn}</div>
      </div>`;
  }

  // Standard 7-col layout
  return `
    <div class="table-row ${colClass}">
      <div>${flightInfo(flight)}</div>
      ${timeCell}
      ${durCell}
      ${layoverCell}
      ${acCell}
      ${priceCell}
      <div>${profileBtn}</div>
    </div>`;
}
