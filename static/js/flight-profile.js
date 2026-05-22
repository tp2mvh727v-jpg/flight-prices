// ============================================================
// FlightProfile v3.5 — Real Aviation Seat Matrix + Globe.gl 3D
//   - Authentic 1-2-1 / 2-2 business class column mappings
//   - A380/B747 double-decker with deck-switching tabs
//   - Globe.gl WebGL 3D interactive Earth (replaces 2D Canvas)
// ============================================================

// ============================================================
//  AIRPORT COORDINATE DICTIONARY — IATA → [lat, lng]
// ============================================================

const AIRPORT_COORDS = {
  PEK: [39.9042, 116.4074],   // 北京首都
  PKX: [39.5098, 116.4105],   // 北京大兴
  SYD: [-33.8688, 151.2093],  // 悉尼
  LHR: [51.4700, -0.4543],    // 伦敦希思罗
  PVG: [31.1443, 121.8083],   // 上海浦东
  SHA: [31.1979, 121.3363],   // 上海虹桥
  DXB: [25.2532, 55.3657],    // 迪拜
  ICN: [37.4602, 126.4407],   // 首尔仁川
  FRA: [50.0379, 8.5622],     // 法兰克福
  BKK: [13.6900, 100.7501],   // 曼谷素万那普
  HKG: [22.3080, 113.9185],   // 香港
  SIN: [1.3644, 103.9915],    // 新加坡
  HND: [35.5494, 139.7798],   // 东京羽田
  NRT: [35.7647, 140.3864],   // 东京成田
  SFO: [37.6213, -122.3790],  // 旧金山
  CDG: [49.0097, 2.5479],     // 巴黎戴高乐
  LAX: [33.9416, -118.4085],  // 洛杉矶
  JFK: [40.6413, -73.7781],   // 纽约肯尼迪
  EWR: [40.6895, -74.1745],   // 纽约纽瓦克
  CAN: [23.3924, 113.2990],   // 广州白云
  SZX: [22.6394, 113.8144],   // 深圳宝安
  CTU: [30.5785, 103.9469],   // 成都天府
  CKG: [29.7192, 106.6417],   // 重庆江北
  KUL: [2.7456, 101.7076],    // 吉隆坡
  TPE: [25.0777, 121.2328],   // 台北桃园
  MUC: [48.3537, 11.7860],    // 慕尼黑
  AMS: [52.3105, 4.7683],     // 阿姆斯特丹
  IST: [41.2611, 28.7420],    // 伊斯坦布尔
  DOH: [25.2610, 51.5650],    // 多哈
  AUH: [24.4330, 54.6511],    // 阿布扎比
  MEL: [-37.6690, 144.8410],  // 墨尔本
  AKL: [-37.0082, 174.7850],  // 奥克兰
  YVR: [49.1947, -123.1790],  // 温哥华
  ORD: [41.9742, -87.9073],   // 芝加哥
  MIA: [25.7959, -80.2870],   // 迈阿密
  GRU: [-23.4356, -46.4731],  // 圣保罗
  CPT: [-33.9715, 18.6021],   // 开普敦
  JNB: [-26.1372, 28.2416],   // 约翰内斯堡
  DPS: [-8.7482, 115.1675],   // 巴厘岛
  MNL: [14.5086, 121.0198],   // 马尼拉
  DEL: [28.5562, 77.0992],    // 德里
  BOM: [19.0890, 72.8680],    // 孟买
  KIX: [34.4320, 135.2304],   // 大阪关西
  CTS: [42.7752, 141.6923],   // 札幌新千岁
  FUK: [33.5860, 130.4509],   // 福冈
  DMK: [13.9125, 100.6067],   // 曼谷廊曼
  CGK: [-6.1256, 106.6558],   // 雅加达
  SGN: [10.8188, 106.6520],   // 胡志明市
  HAN: [21.2212, 105.8072],   // 河内
};

function _lookupCoords(iata) {
  const c = AIRPORT_COORDS[iata];
  if (c) return c;
  console.warn('[FlightProfile] Unknown airport IATA:', iata);
  return [0, 0]; // fallback — null island
}

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
  // —— Double-decker: Airbus A380 ——
  if (acCode === 'A388') {
    return {
      isDoubleDecker: true, rows: 38,
      decks: [{
        name: '一楼客舱', short: 'Lower',
        cabins: [
          { cls: 'first', name: '头等套房', short: 'First', rowStart: 1, rowEnd: 4, layout: [1,2,1], refColumns: ['A','AISLE','D','G','AISLE','K'], noiseBase: 55, desc: '空中宫殿，极致私密。仅 4 排 16 座。' },
          { cls: 'economy', name: '经济舱', short: 'Economy', rowStart: 10, rowEnd: 38, layout: [3,4,3], refColumns: ['A','B','C','AISLE','D','E','F','G','AISLE','H','J','K'], noiseBase: 70, desc: 'A380 独有静谧宽体经济舱。3-4-3 布局。' },
        ]
      }, {
        name: '二楼客舱', short: 'Upper',
        cabins: [
          { cls: 'business', name: '公务舱', short: 'Business', rowStart: 1, rowEnd: 22, layout: [1,2,1], refColumns: ['A','AISLE','D','G','AISLE','K'], noiseBase: 58, desc: 'A380 上层全公务舱，尊享云端平躺体验。' },
          { cls: 'premium', name: '超级经济舱', short: 'Premium Economy', rowStart: 23, rowEnd: 28, layout: [2,3,2], refColumns: ['A','B','AISLE','D','E','F','AISLE','H','K'], noiseBase: 64, desc: '上层尾部超经，加宽座椅、更大后仰。' },
        ]
      }]
    };
  }

  // —— Double-decker: Boeing 747-8 ——
  if (acCode === 'B748') {
    return {
      isDoubleDecker: true, rows: 33,
      decks: [{
        name: '一楼客舱', short: 'Lower',
        cabins: [
          { cls: 'first', name: '头等套房', short: 'First', rowStart: 1, rowEnd: 3, layout: [1,2,1], refColumns: ['A','AISLE','D','G','AISLE','K'], noiseBase: 55, desc: '747 机头鼻舱尊位，女王级空中体验。' },
          { cls: 'economy', name: '经济舱', short: 'Economy', rowStart: 7, rowEnd: 33, layout: [3,4,3], refColumns: ['A','B','C','AISLE','D','E','F','G','AISLE','H','J','K'], noiseBase: 70, desc: '标准经济舱。翼根区域引擎声澎湃。' },
        ]
      }, {
        name: '二楼客舱', short: 'Upper',
        cabins: [
          { cls: 'business', name: '公务舱', short: 'Business', rowStart: 1, rowEnd: 16, layout: [2,2], refColumns: ['A','C','AISLE','D','F'], noiseBase: 58, desc: '747 上层公务舱，经典 2-2 大板凳布局。' },
        ]
      }]
    };
  }

  const isWide = ['A359','A35K','A333','B789','B788','B77W'].includes(acCode);
  const totalRows = isWide ? 33 : 29;

  if (isWide) {
    return {
      isDoubleDecker: false, rows: totalRows,
      decks: [{
        name: '', short: '',
        cabins: [
          { cls: 'business', name: '头等 / 公务舱', short: 'Business', rowStart: 1, rowEnd: 5, layout: [1,2,1], refColumns: ['A','AISLE','D','G','AISLE','K'], noiseBase: 58, desc: '平躺隐私包厢，极度安静 (58dB)。飞友终极梦想。' },
          { cls: 'premium', name: '超级经济舱', short: 'Premium Economy', rowStart: 6, rowEnd: 9, layout: [2,3,2], refColumns: ['A','B','AISLE','D','E','F','AISLE','H','K'], noiseBase: 64, desc: '加宽座椅、更大后仰角度。舒适与性价比的黄金分割点。' },
          { cls: 'economy', name: '经济舱', short: 'Economy', rowStart: 10, rowEnd: totalRows, layout: acCode === 'B77W' ? [3,4,3] : (acCode === 'A333' ? [2,4,2] : [3,3,3]), refColumns: ['A','B','C','AISLE','D','E','F','G','AISLE','H','J','K'], noiseBase: 70, desc: '标准经济舱。翼根区域引擎声澎湃。' },
        ]
      }]
    };
  }
  // Narrow-body
  return {
    isDoubleDecker: false, rows: totalRows,
    decks: [{
      name: '', short: '',
      cabins: [
        { cls: 'business', name: '公务舱', short: 'Business', rowStart: 1, rowEnd: 3, layout: [2,2], refColumns: ['A','C','AISLE','D','F'], noiseBase: 58, desc: '前排安静包厢。窄体机 2-2 大板凳布局。' },
        { cls: 'economy', name: '经济舱', short: 'Economy', rowStart: 4, rowEnd: totalRows, layout: [3,3], refColumns: ['A','B','C','AISLE','D','E','F'], noiseBase: 68, desc: '标准经济舱。中后段感受引擎韵律。' },
      ]
    }]
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
//  MULTI-CLASS SEAT GENERATION (with deck support)
// ============================================================

function generateSeatMap(acCode) {
  const acInfo = _getAcInfo(acCode);
  const totalRows = acInfo.rows;
  const allSeats = [];
  const decks = [];

  const badWindowA = (WINDOWLESS_SEATS[acCode] && WINDOWLESS_SEATS[acCode]['A']) || [];
  const badWindowLast = (WINDOWLESS_SEATS[acCode] && WINDOWLESS_SEATS[acCode]['K']) || [];
  const exitRows = EXIT_ROWS[acCode] || [];
  const bulkheadRows = [1];

  for (const deck of acInfo.decks) {
    const sections = [];

    for (const cabin of deck.cabins) {
      const layout = cabin.layout;
      const colLetters = _getColLetters(layout);
      const activeCols = _getActiveCols(cabin.refColumns, layout);
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
              if (quality === 'standard') { quality = 'good'; qualityLabel = '公务舱尊享座'; qualityDetail = `平躺包厢，至高私密性。音量仅 ${cabin.noiseBase}dB。飞友终极梦想。`; }
            } else if (cabin.cls === 'first') {
              quality = 'good'; qualityLabel = '头等套房尊享';
              qualityDetail = `[头等专属] 空中宫殿级私密包厢，噪音仅 ${cabin.noiseBase}dB。飞友朝圣之选。`;
            } else if (cabin.cls === 'premium' && quality === 'standard') {
              qualityDetail = `[超经专属] ${qualityDetail} 加宽座椅、更大后仰。`;
            }

            const noise = _calcNoise(row, totalRows, cabin.noiseBase);
            seats.push({ row, col, isWindow, isAisle, quality, qualityLabel, qualityDetail, noise, cabinClass: cabin.cls });
            colIdx++;
          }
        }
      }

      sections.push({ ...cabin, seats, colLetters, layout, refColumns: cabin.refColumns, activeCols });
      allSeats.push(...seats);
    }

    decks.push({ ...deck, sections });
  }

  return { decks, allSeats, totalRows, acInfo };
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

function _getActiveCols(refColumns, layout) {
  const groups = [];
  let current = [];
  for (const ref of refColumns) {
    if (ref === 'AISLE') { groups.push(current); current = []; }
    else { current.push(ref); }
  }
  groups.push(current);
  const active = new Set();
  for (let i = 0; i < layout.length && i < groups.length; i++) {
    const count = layout[i];
    for (let j = 0; j < count && j < groups[i].length; j++) {
      active.add(groups[i][j]);
    }
  }
  return active;
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
      </div>`;

  // Deck tabs (only when double-decker)
  if (seatMap.decks.length > 1) {
    html += '<div class="fp-deck-tabs">';
    seatMap.decks.forEach((deck, i) => {
      html += `<button class="fp-deck-tab${i === 0 ? ' active' : ''}" data-deck-index="${i}">${deck.name}</button>`;
    });
    html += '</div>';
  }

  html += '<div class="fp-seat-wrap">';

  seatMap.decks.forEach((deck, di) => {
    html += `<div class="fp-deck-section${di === 0 ? ' active' : ''}" data-deck-index="${di}">`;

    deck.sections.forEach((sec, si) => {
      if (si > 0) {
        html += `<div class="fp-cabin-divider">
          <span class="fp-cabin-line"></span>
          <span class="fp-cabin-badge ${sec.cls}">${sec.name} (Row ${sec.rowStart}-${sec.rowEnd})</span>
          <span class="fp-cabin-line"></span>
        </div>`;
      }
      const gridTemplateCols = '26px ' + sec.refColumns.map(c => c === 'AISLE' ? '16px' : '38px').join(' ');
      html += `<div class="fp-seat-grid" style="grid-template-columns: ${gridTemplateCols}">`;
      html += _buildCabinSeatsHTML(sec);
      html += '</div>';
    });

    html += '</div>'; // close fp-deck-section
  });

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
  const { seats, refColumns, activeCols } = sec;
  const byRow = {};
  for (const s of seats) {
    if (!byRow[s.row]) byRow[s.row] = {};
    byRow[s.row][s.col] = s;
  }

  let html = '';
  const rows = Object.keys(byRow).map(Number).sort((a, b) => a - b);
  for (const row of rows) {
    html += `<div class="fp-row-label">${row}</div>`;
    const rowMap = byRow[row] || {};
    for (const ref of refColumns) {
      if (ref === 'AISLE') {
        html += '<div class="fp-aisle"></div>';
      } else if (activeCols.has(ref)) {
        const s = rowMap[ref];
        if (!s) { html += '<div class="fp-placeholder"></div>'; continue; }
        const isPremium = s.cabinClass === 'business' || s.cabinClass === 'premium' || s.cabinClass === 'first';
        html += `<button class="fp-seat fp-seat-${s.quality}${isPremium ? ' fp-seat-premium' : ''}"
          data-row="${s.row}" data-col="${s.col}"
          data-label="${escapeHtml(s.qualityLabel)}"
          data-detail="${escapeHtml(s.qualityDetail)}"
          data-noise-db="${s.noise.level}" data-noise-desc="${escapeHtml(s.noise.desc)}" data-noise-rec="${escapeHtml(s.noise.rec)}"
          title="${s.row}${s.col}">${s.col}</button>`;
      } else {
        html += '<div class="fp-placeholder"></div>';
      }
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

// ============================================================
//  3D INTERACTIVE GLOBE — Globe.gl WebGL Earth
// ============================================================

function _buildGlobe(flight) {
  return `
    <div class="fp-section">
      <div class="fp-section-title"><span class="fp-section-icon">G</span> 3D 互动地球 — 大圆航线轨迹</div>
      <div class="fp-globe-wrap">
        <div id="fpGlobe3D" class="fp-globe-3d" style="display:flex;align-items:center;justify-content:center;color:#64748b;font-size:0.8rem;">🌍 3D 地球加载中...</div>
        <div class="fp-globe-overlay">
          <span class="fp-globe-label">${escapeHtml(flight.origin || 'PEK')} &rarr; ${escapeHtml(flight.dest || 'SYD')}</span>
          <span class="fp-globe-label">ETOPS 180min 安全圈</span>
        </div>
      </div>
    </div>`;
}

function _initGlobe3D(el, originIATA, originLat, originLng, destIATA, destLat, destLng) {
  if (!window.Globe) {
    console.warn('[FlightProfile] window.Globe not available — CDN may not have loaded');
    _showGlobeFallback(el, 'Globe.gl 库未加载，请刷新页面重试');
    return null;
  }

  // Guard: container must have non-zero dimensions for WebGL context
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    console.warn('[FlightProfile] Globe container has zero dimensions, retrying...');
    return null;
  }

  try {
    const globe = Globe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('rgba(56,189,248,0.25)')
      .atmosphereAltitude(0.25)
      (el);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.5;

    // Dynamic great-circle arc
    globe.arcsData([{
      startLat: originLat, startLng: originLng,
      endLat: destLat, endLng: destLng,
      color: '#10b981'
    }])
    .arcColor('color')
    .arcAltitude(0.38)
    .arcStroke(1.2)
    .arcDashLength(0.22)
    .arcDashGap(0.9)
    .arcDashAnimateTime(2200)
    .arcDashInitialGap(() => 1)
    .arcsTransitionDuration(0);

    // Dynamic 3D labels
    globe.labelsData([
      { lat: originLat, lng: originLng, text: originIATA, color: '#10b981', size: 2.2 },
      { lat: destLat, lng: destLng, text: destIATA, color: '#10b981', size: 2.2 },
    ])
    .labelColor('color')
    .labelSize('size')
    .labelDotRadius(0.45)
    .labelDotOrientation(() => 'bottom')
    .labelsTransitionDuration(0);

    // Dynamic pulse rings
    globe.ringsData([
      { lat: originLat, lng: originLng, color: '#10b981', radius: 2.8 },
      { lat: destLat, lng: destLng, color: '#10b981', radius: 2.8 },
    ])
    .ringColor('color')
    .ringMaxRadius('radius')
    .ringPropagationSpeed(2.5)
    .ringRepeatPeriod(1600);

    // Smoothly animate POV to frame both endpoints
    const midLat = (originLat + destLat) / 2;
    const midLng = (originLng + destLng) / 2;
    const latDiff = Math.abs(originLat - destLat);
    const lngDiff = Math.abs(originLng - destLng);
    const alt = Math.max(1.5, Math.min(3.5, Math.max(latDiff, lngDiff) * 0.025));
    globe.pointOfView({
      lat: midLat, lng: midLng, altitude: alt,
    }, 1200);

    console.log('[FlightProfile] Globe.gl 3D Earth initialized —', originIATA, '→', destIATA);
    return globe;
  } catch (err) {
    console.error('[FlightProfile] Globe.gl init failed:', err);
    _showGlobeFallback(el, '3D 地球渲染失败 — 您的浏览器可能不支持 WebGL');
    return null;
  }
}

function _showGlobeFallback(el, msg) {
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:300px;color:#94a3b8;font-size:0.85rem;text-align:center;padding:40px;">${msg}</div>`;
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

  // Bind deck tab clicks
  container.querySelectorAll('.fp-deck-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.dataset.deckIndex);
      container.querySelectorAll('.fp-deck-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
      container.querySelectorAll('.fp-deck-section').forEach((s, i) => s.classList.toggle('active', i === idx));
    });
  });

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

  // Resolve airport coordinates dynamically from the current flight
  const originIATA = flight.origin || 'PEK';
  const destIATA = flight.dest || 'SYD';
  const [originLat, originLng] = _lookupCoords(originIATA);
  const [destLat, destLng] = _lookupCoords(destIATA);

  requestAnimationFrame(() => {
    document.getElementById('fpOverlay').classList.add('active');
    document.getElementById('fpPanel').classList.add('active');
  });

  // Poll until the globe container has dimensions, then init (handles CDN latency + panel animation)
  let attempts = 0;
  const MAX_ATTEMPTS = 20;
  const _tryInitGlobe = () => {
    const el = container.querySelector('#fpGlobe3D');
    if (!el) return; // panel got closed
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (!window.Globe) {
        console.warn('[FlightProfile] Globe.gl CDN not loaded after ' + (attempts * 50 + 100) + 'ms');
        _showGlobeFallback(el, 'Globe.gl 库加载超时，请刷新页面重试');
        return;
      }
      _initGlobe3D(el, originIATA, originLat, originLng, destIATA, destLat, destLng);
    } else if (attempts >= MAX_ATTEMPTS) {
      console.warn('[FlightProfile] Globe container still zero-sized after ' + (MAX_ATTEMPTS * 50 + 100) + 'ms');
      _showGlobeFallback(el, '3D 地球容器未就绪，请关闭面板重试');
    } else {
      attempts++;
      setTimeout(_tryInitGlobe, 50);
    }
  };
  setTimeout(_tryInitGlobe, 100);
  activePanel = container;
}

function closeFlightProfile() {
  if (!activePanel) return;
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
