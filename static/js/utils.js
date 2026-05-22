// ============================================================
// Utils — shared rendering helpers
// ============================================================

export function aircraftBadge(ac) {
  const code = ac.aircraft_code || '?';
  const type = ac.aircraft_type || '未知';
  let cls = 'ac-unknown';
  if (type === '大型机') cls = 'ac-wide';
  else if (type === '中型机') cls = 'ac-narrow';
  return `<span class="ac-badge ${cls}" title="${code}">${code} ${type}</span>`;
}

export function sourceLabel(data) {
  if (!data) return '';
  if (data.mode === 'live') return 'FlightAPI.io 实时数据';
  if (data.mode === 'mock') return '高仿真模拟数据 (FlightAPI.io 格式，开关关闭中)';
  return '演示数据 (Google Flights 暂不可用时的模拟数据)';
}

export function flightInfo(p) {
  const code = p.airline || 'XX';
  const initials = (code || 'XX').slice(0, 2);
  const logoSrc = `https://pics.avs.io/200/200/${code}.png`;

  const logoBlock = `<div class="airline-logo-wrap">
    <img class="airline-logo" src="${logoSrc}" alt="${escapeHtml(code)}"
         loading="lazy"
         onerror="this.classList.add('airline-logo-hidden');this.nextElementSibling.style.display='inline-flex';">
    <span class="airline-logo-fallback">${escapeHtml(initials)}</span>
  </div>`;

  const segs = p.segments || [];

  // Build full flight number: "CA915" from segment's airline code + flight_no
  function segLabel(s) {
    const ac = s.airline || '';
    const fn = s.flight_no || '';
    return escapeHtml(ac + fn);
  }

  let fnRow;

  if (segs.length === 0) {
    fnRow = '<span class="fn-placeholder">--</span>';
  } else if (segs.length === 1) {
    // Direct: CA915
    fnRow = `<span class="fn-display">${segLabel(segs[0])}</span>`;
  } else {
    // Connecting: JL436-JL120 — each segment gets its own airline code, joined by "-"
    fnRow = segs.map(s => `<span class="fn-display">${segLabel(s)}</span>`).join('<span class="fn-dash">-</span>');
  }

  return `<div class="airline-header">
    ${logoBlock}
    <div class="airline-info-col">
      <div class="airline-name-row">
        <span class="airline">${escapeHtml(p.airline_name || p.airline)}</span>
        <span class="airline-code">${escapeHtml(p.airline)}</span>
      </div>
      <div class="flight-number-line">${fnRow}</div>
    </div>
  </div>`;
}

export function layoverInfo(p) {
  if (p.stops === 0) return '<span class="stops-direct">直飞</span>';
  let text = `${p.stops} 转`;
  if (p.layover_airport) {
    text += `<br><span style="font-size:0.72rem;color:var(--muted);">${escapeHtml(p.layover_airport)}`;
    if (p.layover_duration) text += ` ${escapeHtml(p.layover_duration)}`;
    text += '</span>';
  }
  return text;
}

export function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[1]}月${parts[2]}日`;
  return dateStr;
}

export function formatPrice(price) {
  return `¥${Number(price).toLocaleString()}`;
}

export function getTripTypeLabel(type) {
  return type === 'roundtrip' ? '往返' : '单程';
}

export function modeBadge(data) {
  if (!data) return '';
  if (data.mode === 'live') {
    return '<span class="mode-badge mode-live">实时数据</span>';
  }
  if (data.mode === 'mock') {
    return '<span class="mode-badge mode-mock">高仿真模拟</span>';
  }
  if (data.mode === 'demo') {
    return '<span class="mode-badge mode-demo">演示数据</span>';
  }
  return '';
}
