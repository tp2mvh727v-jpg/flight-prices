// ============================================================
// FlightProfile v3 — Multi-class cabin + 3D Wireframe Globe
//   - Business / Premium Economy / Economy cabin segmentation
//   - Cabin divider banners with distinct layouts per class
//   - 3D particle wireframe rotating globe (pure Canvas, no Three.js)
//   - Great-circle arc with animated aircraft + particle trail
// ============================================================

import AppState from './state.js';
import { formatPrice, escapeHtml } from './utils.js';

// ============================================================
//  AIRCRAFT DATABASE — cabin class config per type
// ============================================================

const WINDOWLESS_SEATS = {
  'B789': { A: [9,10,21,22,23], K: [9,10,21,22,23] },
  'B788': { A: [7,8,18,19,20], K: [7,8,18,19,20] },
  'A359': { A: [11,24], K: [11,24] },
  'A35K': { A: [12,27], K: [12,27] },
  'A333': { A: [8,19], H: [8,19] },
  'B77W': { A: [10,25,26], K: [10,25,26] },
  'A388': { A: [11,26,27], K: [11,26,27] },
};

const EXIT_ROWS = {
  'B789': [16,17,32,33], 'B788': [14,15,27,28],
  'A359': [14,15,33,34], 'A35K': [16,17,37,38],
  'A333': [12,13,25,26], 'B77W': [19,20,44,45],
  'A388': [17,18,29,30,48,49],
  'A320': [11,12], 'A321': [11,12,28,29],
  'B738': [14,15], 'B739': [14,15,30,31],
  'A20N': [11,12], 'B38M': [14,15],
};

function _getAcInfo(acCode) {
  const isWide = ['A359','A35K','A333','A388','B789','B788','B77W','B748'].includes(acCode);
  const totalRows = isWide ? 33 : 29;

  if (isWide) {
    return {
      rows: totalRows,
      economyLayout: acCode === 'B77W' || acCode === 'A388' ? [3,4,3] : (acCode === 'A333' ? [2,4,2] : [3,3,3]),
      cabins: [
        { cls: 'business', name: '头等 / 公务舱', short: 'Business', rowStart: 1, rowEnd: 5, layout: [1,2,1], noiseBase: 58, desc: '平躺隐私包厢，极度安静 (58dB)。飞友终极梦想。' },
        { cls: 'premium', name: '超级经济舱', short: 'Premium Economy', rowStart: 6, rowEnd: 9, layout: [2,3,2], noiseBase: 64, desc: '加宽座椅、更大后仰角度。舒适与性价比的黄金分割点。' },
        { cls: 'economy', name: '经济舱', short: 'Economy', rowStart: 10, rowEnd: totalRows, layout: acCode === 'B77W' || acCode === 'A388' ? [3,4,3] : (acCode === 'A333' ? [2,4,2] : [3,3,3]), noiseBase: 70, desc: '标准经济舱。翼根区域引擎声澎湃。' },
      ],
    };
  }
  // Narrow-body
  return {
    rows: totalRows,
    economyLayout: [3,3],
    cabins: [
      { cls: 'business', name: '公务舱', short: 'Business', rowStart: 1, rowEnd: 3, layout: [2,2], noiseBase: 58, desc: '前排安静包厢。窄体机优选。' },
      { cls: 'economy', name: '经济舱', short: 'Economy', rowStart: 4, rowEnd: totalRows, layout: [3,3], noiseBase: 68, desc: '标准经济舱。中后段感受引擎韵律。' },
    ],
  };
}

// ============================================================
//  NOISE MODEL
// ============================================================

function _calcNoise(row, totalRows, noiseBase) {
  const ratio = row / totalRows;
  if (ratio <= 0.22) return { zone: 'quiet', level: noiseBase, label: '极度静谧', desc: '远离引擎，耳语级安静。ANC 降噪耳机非必需。', rec: '闭眼即眠，飞友力荐此区域。' };
  if (ratio <= 0.50) return { zone: 'moderate', level: noiseBase + 7, label: '轻微低噪', desc: '可闻轻微引擎低鸣。建议轻度 ANC。', rec: '看书睡觉两相宜，性价比之选。' };
  if (ratio <= 0.72) return { zone: 'loud', level: noiseBase + 14, label: '轰鸣明显', desc: '翼根引擎正侧方，持续中频轰鸣。强烈建议佩戴 ANC 降噪耳机。', rec: '引擎咆哮最为澎湃，硬核飞友 ASMR 现场。' };
  return { zone: 'very-loud', level: noiseBase + 19, label: '尾噪较强', desc: '尾部临近 APU 与尾流紊流区，全频段噪音较高。ANC 必备。', rec: '尾排飞友专属白噪音，摇晃+低频共振沉浸体验。' };
}

function _noiseColor(level) {
  if (level <= 62) return '#10b981';
  if (level <= 70) return '#f59e0b';
  if (level <= 78) return '#f97316';
  return '#ef4444';
}

// ============================================================
//  MULTI-CLASS SEAT GENERATION
// ============================================================

function generateSeatMap(acCode) {
  const acInfo = _getAcInfo(acCode);
  const totalRows = acInfo.rows;
  const allSeats = [];
  const sections = [];

  const badWindowA = (WINDOWLESS_SEATS[acCode] && WINDOWLESS_SEATS[acCode]['A']) || [];
  const badWindowLast = (WINDOWLESS_SEATS[acCode] && WINDOWLESS_SEATS[acCode]['K']) || [];
  const exitRows = EXIT_ROWS[acCode] || [];
  const bulkheadRows = [1];

  for (const cabin of acInfo.cabins) {
    const layout = cabin.layout;
    const colLetters = _getColLetters(layout);
    const windowCols = new Set([colLetters[0], colLetters[colLetters.length - 1]]);
    const seats = [];

    for (let row = cabin.rowStart; row <= cabin.rowEnd; row++) {
      let colIdx = 0;
      for (let section = 0; section < layout.length; section++) {
        const colsInSection = layout[section];
        for (let c = 0; c < colsInSection; c++) {
          const col = colLetters[colIdx];
          const isWindow = windowCols.has(col);
          const isAisle = (c === 0 || c === colsInSection - 1) && colsInSection > 1;

          let quality = 'standard';
          let qualityLabel = '标准座位';
          let qualityDetail = '标准座位，中规中矩。';

          const badWindows = col === colLetters[0] ? badWindowA : (col === colLetters[colLetters.length - 1] ? badWindowLast : []);

          if (isWindow && badWindows.includes(row)) {
            quality = 'bad';
            qualityLabel = '无窗靠窗座 — 极度避坑';
            qualityDetail = '该排靠窗实为一堵完整死墙，零舷窗视野。花钱买靠窗座，结果面壁思过两万里。飞友锐评：航空史上最大消费者欺诈之一。';
          } else if (exitRows.includes(row) && (isWindow || isAisle)) {
            quality = 'good';
            qualityLabel = '安全出口加长腿空间';
            qualityDetail = cabin.cls === 'business' ? '公务舱安全出口排，空间无敌奢华。' : '间距 38" / 宽度 18"。腿部空间极其充裕，长途飞行神器！';
          } else if (bulkheadRows.includes(row) && (isWindow || isAisle)) {
            quality = 'good';
            qualityLabel = '隔板排额外空间';
            qualityDetail = '前排无座椅后仰侵扰，空间开阔。' + (cabin.cls === 'business' ? '私密性极佳。' : '起身方便。');
          } else if (isWindow && !badWindows.includes(row)) {
            quality = 'good';
            qualityLabel = '靠窗优质座';
            qualityDetail = cabin.cls === 'business' ? '舷窗对齐完美，尊享私密视野。' : '窗口对齐完美，舷窗外景色一览无余。飞友力荐：拍照党最爱！';
          } else if (row <= cabin.rowStart + 1 || row >= cabin.rowEnd - 1) {
            quality = 'warning';
            qualityLabel = '注意座 — 舱段边界区';
            qualityDetail = '靠近舱段分隔或洗手间区域，可能有气味与人流干扰。';
          } else if (!isWindow && !isAisle && layout.length >= 3 && section === Math.floor(layout.length / 2)) {
            quality = 'warning';
            qualityLabel = '中央夹心座';
            qualityDetail = '左右均有人，出入需跨两人。长时间较局促。飞友锐评：社恐勿选。';
          }

          if (cabin.cls === 'business') {
            qualityDetail = `[公务舱专属] ${qualityDetail} 音量 ${cabin.noiseBase}dB — 极度安静。`;
            if (quality === 'standard') {
              quality = 'good';
              qualityLabel = '公务舱尊享座';
              qualityDetail = `平躺包厢，至高私密性。音量仅 ${cabin.noiseBase}dB。飞友终极梦想。`;
            }
          } else if (cabin.cls === 'premium' && quality === 'standard') {
            qualityDetail = `[超经专属] ${qualityDetail} 加宽座椅、更大后仰。`;
          }

          const noise = _calcNoise(row, totalRows, cabin.noiseBase);
          seats.push({ row, col, isWindow, isAisle, quality, qualityLabel, qualityDetail, noise, cabinClass: cabin.cls });
          colIdx++;
        }
      }
    }

    sections.push({ ...cabin, seats, colLetters, layout });
    allSeats.push(...seats);
  }

  return { sections, allSeats, totalRows, acInfo };
}

function _getColLetters(layout) {
  const totalCols = layout.reduce((a, b) => a + b, 0);
  if (totalCols <= 4) return ['A', 'B', 'D', 'K'];
  if (totalCols <= 6) return ['A', 'B', 'C', 'D', 'E', 'F'];
  if (totalCols === 7) return ['A', 'B', 'D', 'E', 'F', 'H', 'K'];
  if (totalCols === 8) return ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'K'];
  if (totalCols === 9) return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'];
  if (totalCols === 10) return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
  return Array.from({ length: totalCols }, (_, i) => String.fromCharCode(65 + i));
}

// ============================================================
//  HTML BUILDERS
// ============================================================

function buildProfileHTML(flight) {
  const g = flight.geek || {};
  const acCode = flight.aircraft_code || 'B789';
  const seatMap = generateSeatMap(acCode);

  return `
    <div class="fp-overlay" id="fpOverlay">
      <div class="fp-panel" id="fpPanel">
        <button class="fp-close" id="fpClose">&times;</button>
        ${_buildHeader(flight, g, acCode)}
        ${_buildSpecsRow(g)}
        ${_buildSeatExplorer(seatMap)}
        ${_buildTelemetry(g.telemetry)}
        ${_buildLogs(g.recentLogs)}
        ${_buildGlobe(flight)}
        <div class="fp-footer">航空爱好者社区与公开飞行数据 | 仅供极客探索，不提供购票/值机服务</div>
      </div>
    </div>`;
}

function _buildHeader(flight, g, acCode) {
  return `
    <div class="fp-header">
      <div class="fp-registration">${escapeHtml(g.registration || 'B-0000')}</div>
      <div class="fp-model">${escapeHtml(g.exactModel || acCode)}</div>
      <div class="fp-airline-badge">
        <span class="fp-airline-name">${escapeHtml(flight.airline_name || flight.airline)}</span>
        <span class="fp-airline-code">${escapeHtml(flight.airline)}</span>
      </div>
      ${g.liveryType === 'special' ? `<div class="fp-livery-badge special">${escapeHtml(g.liveryName)}</div>` : ''}
    </div>`;
}

function _buildSpecsRow(g) {
  return `
    <div class="fp-specs-row">
      <div class="fp-spec-item">
        <span class="fp-spec-label">机龄</span>
        <span class="fp-spec-value">${escapeHtml(g.aircraftAge || '?')}</span>
        <span class="fp-spec-sub">${escapeHtml(g.ageLabel || '')}</span>
      </div>
      <div class="fp-spec-item">
        <span class="fp-spec-label">发动机</span>
        <span class="fp-spec-value fp-spec-engines">${escapeHtml(g.engines || '?')}</span>
      </div>
      <div class="fp-spec-item">
        <span class="fp-spec-label">座位数</span>
        <span class="fp-spec-value">${g.seatCount || '?'} 座</span>
        <span class="fp-spec-sub">${(g.seatLayout || []).join('-')} 布局</span>
      </div>
      <div class="fp-spec-item">
        <span class="fp-spec-label">涂装</span>
        <span class="fp-spec-value fp-livery-text ${g.liveryType === 'special' ? 'special' : ''}">${escapeHtml(g.liveryName || '标准涂装')}</span>
      </div>
    </div>`;
}

function _buildSeatExplorer(seatMap) {
  let html = `
    <div class="fp-section">
      <div class="fp-section-title">
        <span class="fp-section-icon">S</span> SeatGuru 客舱座舱图探险家
        <span class="fp-section-hint">— 点击座位查看飞友评测与噪音雷达</span>
      </div>
      <div class="fp-legend">
        <span class="fp-legend-item good"><i></i>优质座</span>
        <span class="fp-legend-item warning"><i></i>注意座</span>
        <span class="fp-legend-item bad"><i></i>糟糕座</span>
        <span class="fp-legend-item standard"><i></i>标准座</span>
      </div>
      <div class="fp-seat-wrap">`;

  for (let si = 0; si < seatMap.sections.length; si++) {
    const sec = seatMap.sections[si];
    if (si > 0) {
      html += `<div class="fp-cabin-divider">
        <span class="fp-cabin-line"></span>
        <span class="fp-cabin-badge ${sec.cls}">${sec.name} (Row ${sec.rowStart}-${sec.rowEnd})</span>
        <span class="fp-cabin-line"></span>
      </div>`;
    }
    html += `<div class="fp-seat-grid" style="--cols: ${sec.colLetters.length}">`;
    html += _buildCabinSeatsHTML(sec);
    html += '</div>';
  }

  html += `
      </div>
      <div class="fp-seat-detail" id="fpSeatDetail">
        <div class="fp-seat-detail-inner">
          <div class="fp-detail-top">
            <span class="fp-detail-seat" id="fpDetailSeat"></span>
            <span class="fp-detail-quality" id="fpDetailQuality"></span>
          </div>
          <p class="fp-detail-text" id="fpDetailText"></p>
          <div class="fp-noise-section">
            <div class="fp-noise-header">
              <span class="fp-noise-label-text">客舱音量降噪雷达</span>
              <span class="fp-noise-db" id="fpNoiseDb">-- dB</span>
            </div>
            <div class="fp-noise-bar-wrap"><div class="fp-noise-bar" id="fpNoiseBar" style="width:0%"></div></div>
            <div class="fp-noise-scale"><span>55dB</span><span>65dB</span><span>75dB</span><span>85dB</span></div>
            <p class="fp-noise-desc" id="fpNoiseDesc"></p>
            <p class="fp-noise-rec" id="fpNoiseRec"></p>
          </div>
        </div>
      </div>
    </div>`;
  return html;
}

function _buildCabinSeatsHTML(sec) {
  const { seats, layout } = sec;
  const byRow = {};
  for (const s of seats) {
    if (!byRow[s.row]) byRow[s.row] = [];
    byRow[s.row].push(s);
  }
  const aisleAfter = [];
  let acc = 0;
  for (let i = 0; i < layout.length - 1; i++) { acc += layout[i]; aisleAfter.push(acc); }

  let html = '';
  const rows = Object.keys(byRow).map(Number).sort((a, b) => a - b);
  for (const row of rows) {
    const rowSeats = byRow[row];
    html += `<div class="fp-row-label">${row}</div>`;
    for (let ci = 0; ci < rowSeats.length; ci++) {
      const s = rowSeats[ci];
      if (aisleAfter.includes(ci)) html += '<div class="fp-aisle"></div>';
      const isPremium = s.cabinClass === 'business' || s.cabinClass === 'premium';
      html += `<button class="fp-seat fp-seat-${s.quality}${isPremium ? ' fp-seat-premium' : ''}"
        data-row="${s.row}" data-col="${s.col}"
        data-label="${escapeHtml(s.qualityLabel)}"
        data-detail="${escapeHtml(s.qualityDetail)}"
        data-noise-db="${s.noise.level}" data-noise-desc="${escapeHtml(s.noise.desc)}" data-noise-rec="${escapeHtml(s.noise.rec)}"
        title="${s.row}${s.col}">${s.col}</button>`;
    }
  }
  return html;
}

function _buildTelemetry(t) {
  if (!t) return '<div class="fp-section"><div class="fp-telemetry-empty">遥测数据不可用</div></div>';
  return `
    <div class="fp-section">
      <div class="fp-section-title"><span class="fp-section-icon">R</span> 飞行遥测与性能大盘</div>
      <div class="fp-telem-grid">
        <div class="fp-telem-card"><div class="fp-telem-icon">C</div><div class="fp-telem-label">预计巡航高度</div><div class="fp-telem-value">${escapeHtml(t.altitude||'37,000 ft')}</div></div>
        <div class="fp-telem-card"><div class="fp-telem-icon">S</div><div class="fp-telem-label">巡航速度</div><div class="fp-telem-value">${escapeHtml(t.mach||'Mach 0.84')}</div><div class="fp-telem-sub">${escapeHtml(t.groundSpeed||'')}</div></div>
        <div class="fp-telem-card"><div class="fp-telem-icon">W</div><div class="fp-telem-label">高空风况</div><div class="fp-telem-value">${escapeHtml(t.headwind||'静风')}</div></div>
        <div class="fp-telem-card"><div class="fp-telem-icon">T</div><div class="fp-telem-label">预计飞行时间</div><div class="fp-telem-value">${escapeHtml(t.estFlightTime||'?h')}</div></div>
      </div>
    </div>`;
}

function _buildLogs(logs) {
  if (!logs || !logs.length) return '<div class="fp-section"><div class="fp-logs-empty">暂无历史飞行记录</div></div>';
  return `
    <div class="fp-section">
      <div class="fp-section-title"><span class="fp-section-icon">L</span> 历史飞行日志<span class="fp-section-hint">— 该机注册号近期执飞记录</span></div>
      <div class="fp-logs">
        ${logs.map(log => `
          <div class="fp-log-item">
            <div class="fp-log-date">${escapeHtml(log.date)}</div>
            <div class="fp-log-route">
              <span class="fp-log-airport">${escapeHtml(log.from)}</span><span class="fp-log-city">${escapeHtml(log.fromName)}</span>
              <span class="fp-log-arrow">&rarr;</span>
              <span class="fp-log-airport">${escapeHtml(log.to)}</span><span class="fp-log-city">${escapeHtml(log.toName)}</span>
            </div>
            <div class="fp-log-meta"><span>航班 ${escapeHtml(log.flightNo)}</span><span>|</span><span>飞行 ${escapeHtml(log.duration)}</span></div>
          </div>`).join('')}
      </div>
    </div>`;
}

function _buildGlobe(flight) {
  return `
    <div class="fp-section">
      <div class="fp-section-title"><span class="fp-section-icon">G</span> 3D 粒子矩阵旋转地球大圆航线图</div>
      <div class="fp-globe-wrap">
        <canvas id="fpGlobeCanvas" class="fp-globe-canvas"></canvas>
        <div class="fp-globe-overlay">
          <span class="fp-globe-label" id="fpGlobeJetLabel">高空急流: --</span>
          <span class="fp-globe-label" id="fpGlobeETOPSLabel">ETOPS --</span>
        </div>
      </div>
    </div>`;
}

// ============================================================
//  3D WIREFRAME GLOBE — Pure Canvas Orthographic Projection
// ============================================================

const GLOBE_R = 130;

// Simplified continent outlines as [lat, lng][] polygons
const CONTINENTS = {
  eurasia: [[70,-10],[70,55],[68,90],[65,120],[60,150],[50,170],[40,140],[38,130],[45,50],[50,10],[55,-5],[60,-10],[68,-8],[70,-10]],
  africa: [[35,-5],[35,20],[30,30],[15,40],[5,40],[-5,38],[-20,35],[-30,20],[-35,15],[-25,10],[-15,10],[-5,8],[5,-5],[15,-15],[25,-12],[30,-5],[35,-5]],
  northAmerica: [[70,-160],[65,-140],[58,-125],[48,-125],[35,-120],[22,-110],[15,-95],[20,-85],[28,-82],[42,-70],[52,-68],[62,-76],[70,-90],[70,-130],[70,-160]],
  southAmerica: [[10,-83],[5,-75],[0,-55],[-5,-38],[-15,-40],[-25,-50],[-35,-58],[-40,-70],[-32,-73],[-20,-70],[-8,-75],[5,-78],[10,-83]],
  australia: [[-12,125],[-18,130],[-22,140],[-28,148],[-35,152],[-38,145],[-33,137],[-28,130],[-20,120],[-14,116],[-12,125]],
  eastAsia: [[35,100],[38,105],[42,108],[45,110],[50,120],[55,130],[55,140],[48,145],[42,145],[38,140],[35,130],[30,122],[28,115],[35,100]],
};

// City markers
const CITIES = {
  PEK: { lat: 40.08, lng: 116.58, name: 'PEK', dot: true },
  SYD: { lat: -33.86, lng: 151.21, name: 'SYD', dot: true },
  PVG: { lat: 31.14, lng: 121.81, name: '', dot: false },
  HND: { lat: 35.55, lng: 139.78, name: '', dot: false },
  LAX: { lat: 33.94, lng: -118.41, name: '', dot: false },
  LHR: { lat: 51.47, lng: -0.46, name: '', dot: false },
  DXB: { lat: 25.25, lng: 55.36, name: '', dot: false },
  SIN: { lat: 1.36, lng: 103.99, name: '', dot: false },
};

function latLngTo3D(lat, lng, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  };
}

function rotateY(p, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: p.x * cos - p.z * sin, y: p.y, z: p.x * sin + p.z * cos };
}

function project(p, cx, cy) {
  return { x: cx + p.x, y: cy - p.y, visible: p.z >= 0 };
}

// Great-circle interpolation
function greatCirclePoints(lat1, lng1, lat2, lng2, steps) {
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad, lambda1 = lng1 * toRad;
  const phi2 = lat2 * toRad, lambda2 = lng2 * toRad;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const d = Math.acos(Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1));
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
    const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);
    const lat = Math.asin(z) / toRad;
    const lng = Math.atan2(y, x) / toRad;
    pts.push({ lat, lng });
  }
  return pts;
}

let globeAnimId = null;

function _startGlobeAnimation(canvas, origin, dest) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 340 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '340px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const cx = canvas.width / dpr / 2;
  const cy = canvas.height / dpr / 2;
  const R = Math.min(cx, cy) - 10;

  const originCity = Object.values(CITIES).find(c => c.name === origin) || CITIES.PEK;
  const destCity = Object.values(CITIES).find(c => c.name === dest) || CITIES.SYD;
  const gcPoints = greatCirclePoints(originCity.lat, originCity.lng, destCity.lat, destCity.lng, 120);

  // Pre-compute continent 3D points
  const continent3D = {};
  for (const [name, pts] of Object.entries(CONTINENTS)) {
    continent3D[name] = pts.map(([lat, lng]) => latLngTo3D(lat, lng, R));
  }
  const city3D = {};
  for (const [code, c] of Object.entries(CITIES)) {
    city3D[code] = latLngTo3D(c.lat, c.lng, R);
  }
  const gc3D = gcPoints.map(({ lat, lng }) => latLngTo3D(lat, lng, R));

  // Jet stream label
  const jetH = (210 + Math.random() * 60).toFixed(0);
  const jetK = (35 + Math.random() * 40).toFixed(0);
  document.getElementById('fpGlobeJetLabel').textContent = `急流: W-${jetH} / ${jetK}kts`;
  document.getElementById('fpGlobeETOPSLabel').textContent = `ETOPS 180min 安全圈 | ${origin} - ${dest}`;

  let rotation = 0;
  let trailPhase = 0;

  function draw() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cxW = w / 2;
    const cyW = h / 2;
    ctx.clearRect(0, 0, w, h);

    // Background stars
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    const starSeed = 42;
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137 + starSeed) % w);
      const sy = ((i * 251 + starSeed * 3) % h);
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6 + (i % 3) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw globe sphere glow
    ctx.beginPath();
    ctx.arc(cxW, cyW, R + 8, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(cxW, cyW, R - 5, cxW, cyW, R + 12);
    glow.addColorStop(0, 'rgba(37,99,235,0)');
    glow.addColorStop(0.5, 'rgba(37,99,235,0.08)');
    glow.addColorStop(1, 'rgba(37,99,235,0)');
    ctx.fillStyle = glow;
    ctx.fill();

    // Wireframe lat/lng lines
    ctx.strokeStyle = 'rgba(100,140,200,0.12)';
    ctx.lineWidth = 0.6;
    // Latitude circles
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let first = true;
      for (let lng = 0; lng <= 360; lng += 5) {
        const p3 = latLngTo3D(lat, lng, R);
        const p3r = rotateY(p3, rotation);
        const p2 = project(p3r, cxW, cyW);
        if (p2.visible || true) {
          if (first) { ctx.moveTo(p2.x, p2.y); first = false; }
          else ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();
    }
    // Longitude lines
    for (let lng = 0; lng < 360; lng += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 3) {
        const p3 = latLngTo3D(lat, lng, R);
        const p3r = rotateY(p3, rotation);
        const p2 = project(p3r, cxW, cyW);
        if (first) { ctx.moveTo(p2.x, p2.y); first = false; }
        else ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();
    }

    // Continents — draw only front-facing segments
    for (const [name, pts] of Object.entries(continent3D)) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(16,185,129,0.25)';
      ctx.lineWidth = 0.8;
      ctx.fillStyle = 'rgba(16,185,129,0.04)';
      let first = true;
      let prevVisible = false;
      for (let i = 0; i < pts.length; i++) {
        const p3r = rotateY(pts[i], rotation);
        const p2 = project(p3r, cxW, cyW);
        if (first) { ctx.moveTo(p2.x, p2.y); first = false; }
        else {
          if (p3r.z < 0 && prevVisible) ctx.stroke();
          ctx.lineTo(p2.x, p2.y);
        }
        prevVisible = p3r.z >= 0;
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // City dots
    for (const [code, c3] of Object.entries(city3D)) {
      const p3r = rotateY(c3, rotation);
      const p2 = project(p3r, cxW, cyW);
      if (p3r.z < 0 && code !== 'PEK' && code !== 'SYD') continue;
      const cInfo = CITIES[code];
      if (cInfo.dot || code === origin || code === dest) {
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, (code === origin || code === dest) ? 4.5 : 2, 0, Math.PI * 2);
        ctx.fillStyle = (code === origin || code === dest) ? '#10b981' : 'rgba(148,163,184,0.6)';
        ctx.fill();
        if (code === origin || code === dest) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 8px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(code, p2.x, p2.y - 10);
        }
      }
    }

    // Great circle arc
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(16,185,129,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    let gcFirst = true;
    let prevGcZ = 0;
    for (const p3 of gc3D) {
      const p3r = rotateY(p3, rotation);
      const p2 = project(p3r, cxW, cyW);
      if (gcFirst) { ctx.moveTo(p2.x, p2.y); gcFirst = false; }
      else {
        if (p3r.z < 0 && prevGcZ >= 0) ctx.stroke();
        ctx.lineTo(p2.x, p2.y);
      }
      prevGcZ = p3r.z;
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Bright overlay arc (traveled portion)
    const ti = Math.floor((trailPhase % 1) * gc3D.length);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(16,185,129,0.75)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(16,185,129,0.5)';
    ctx.shadowBlur = 6;
    for (let i = 0; i <= ti && i < gc3D.length; i++) {
      const p3r = rotateY(gc3D[i], rotation);
      const p2 = project(p3r, cxW, cyW);
      if (i === 0) ctx.moveTo(p2.x, p2.y);
      else ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Aircraft on arc
    const acIdx = Math.min(ti, gc3D.length - 1);
    const acP3 = rotateY(gc3D[acIdx], rotation);
    const acP2 = project(acP3, cxW, cyW);

    // Aircraft glow
    ctx.beginPath();
    ctx.arc(acP2.x, acP2.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16,185,129,0.2)';
    ctx.fill();

    // Aircraft triangle
    const acAngle = rotation + Math.PI / 2;
    ctx.save();
    ctx.translate(acP2.x, acP2.y);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-3, -3);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-3, 3);
    ctx.closePath();
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Particle trail
    for (let j = 1; j <= 8; j++) {
      const pIdx = Math.max(0, ti - j * 3);
      const tp3 = rotateY(gc3D[pIdx], rotation);
      const tp2 = project(tp3, cxW, cyW);
      ctx.beginPath();
      ctx.arc(tp2.x - acP2.x, tp2.y - acP2.y, Math.max(0.5, 3 - j * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(16,185,129,${0.5 - j * 0.06})`;
      ctx.fill();
    }
    ctx.restore();

    rotation += 0.004;
    trailPhase += 0.005;
    globeAnimId = requestAnimationFrame(draw);
  }
  draw();
}

function _stopGlobe() {
  if (globeAnimId) { cancelAnimationFrame(globeAnimId); globeAnimId = null; }
}

// ============================================================
//  PANEL LIFECYCLE
// ============================================================

let activePanel = null;

export function initFlightProfile() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.geek-profile-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.flightIndex);
    if (isNaN(idx)) return;
    const prices = AppState.singleDayData?.prices || [];
    const flight = prices[idx];
    if (!flight) return;
    openFlightProfile(flight);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#fpOverlay')) return;
    if (e.target.closest('#fpPanel')) return;
    closeFlightProfile();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activePanel) closeFlightProfile();
  });
}

function openFlightProfile(flight) {
  closeFlightProfile();

  const container = document.createElement('div');
  container.id = 'fpContainer';
  container.innerHTML = buildProfileHTML(flight);
  document.body.appendChild(container);
  document.body.style.overflow = 'hidden';

  document.getElementById('fpClose').addEventListener('click', closeFlightProfile);

  // Bind seat clicks
  const detailEl = document.getElementById('fpSeatDetail');
  container.querySelectorAll('.fp-seat').forEach(seatBtn => {
    seatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = seatBtn.dataset.row;
      const col = seatBtn.dataset.col;
      container.querySelectorAll('.fp-seat.selected').forEach(s => s.classList.remove('selected'));
      seatBtn.classList.add('selected');

      document.getElementById('fpDetailSeat').textContent = `${row}${col}`;
      document.getElementById('fpDetailQuality').textContent = seatBtn.dataset.label;
      document.getElementById('fpDetailText').innerHTML = seatBtn.dataset.detail;

      const db = parseInt(seatBtn.dataset.noiseDb) || 70;
      const bar = document.getElementById('fpNoiseBar');
      bar.style.width = Math.min(100, ((db - 50) / 40) * 100) + '%';
      bar.style.background = _noiseColor(db);
      document.getElementById('fpNoiseDb').textContent = `${db}dB`;
      document.getElementById('fpNoiseDesc').textContent = seatBtn.dataset.noiseDesc;
      document.getElementById('fpNoiseRec').textContent = seatBtn.dataset.noiseRec;
      detailEl.classList.add('active');
    });
  });

  // Dismiss detail on grid bg click
  container.querySelectorAll('.fp-seat-grid').forEach(grid => {
    grid.addEventListener('click', (e) => {
      if (!e.target.closest('.fp-seat')) detailEl.classList.remove('active');
    });
  });

  // Start 3D globe
  const canvas = document.getElementById('fpGlobeCanvas');
  if (canvas) _startGlobeAnimation(canvas, flight.origin || 'PEK', flight.dest || 'SYD');

  requestAnimationFrame(() => {
    document.getElementById('fpOverlay').classList.add('active');
    document.getElementById('fpPanel').classList.add('active');
  });
  activePanel = container;
}

function closeFlightProfile() {
  if (!activePanel) return;
  _stopGlobe();
  const overlay = document.getElementById('fpOverlay');
  const panel = document.getElementById('fpPanel');
  if (overlay && panel) {
    overlay.classList.remove('active');
    panel.classList.remove('active');
    setTimeout(() => {
      if (activePanel) { activePanel.remove(); activePanel = null; }
      document.body.style.overflow = '';
    }, 350);
  } else {
    if (activePanel) activePanel.remove();
    activePanel = null;
    document.body.style.overflow = '';
  }
}
