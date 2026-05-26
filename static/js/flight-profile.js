// ============================================================
// FlightProfile v5.3 — Real Aviation Seat Matrix + Globe.gl 3D
//   - Authentic 1-2-1 / 2-2 business class column mappings
//   - A380/B747 double-decker with deck-switching tabs
//   - Globe.gl WebGL 3D interactive Earth (replaces 2D Canvas)
//   - Airline alliance badges (Star Alliance / oneworld / SkyTeam)

// Module-level reference for WebGL context cleanup (prevent context leak)
let _activeGlobeInstance = null;

// ============================================================
//  AIRLINE ALLIANCES — Star Alliance / oneworld / SkyTeam
// ============================================================

const ALLIANCES = {
  'star':    { name: 'Star Alliance',  name_zh: '星空联盟', color: '#1a1a1a' },
  'oneworld':{ name: 'oneworld',       name_zh: '寰宇一家', color: '#96232b' },
  'skyteam': { name: 'SkyTeam',        name_zh: '天合联盟', color: '#0b1b41' },
};

const AIRLINE_ALLIANCE = {
  // Star Alliance
  'CA': 'star', 'NH': 'star', 'NZ': 'star', 'OZ': 'star', 'BR': 'star',
  'LH': 'star', 'MS': 'star', 'SA': 'star', 'SQ': 'star', 'TG': 'star',
  'UA': 'star', 'AC': 'star', 'CM': 'star', 'ET': 'star',
  'TK': 'star', 'ZH': 'star',
  // oneworld
  'AA': 'oneworld', 'BA': 'oneworld', 'CX': 'oneworld', 'JL': 'oneworld',
  'MH': 'oneworld', 'QF': 'oneworld', 'QR': 'oneworld', 'AT': 'oneworld',
  // SkyTeam
  'AF': 'skyteam', 'AM': 'skyteam', 'CI': 'skyteam', 'DL': 'skyteam',
  'GA': 'skyteam', 'KE': 'skyteam', 'KQ': 'skyteam', 'MU': 'skyteam',
  'VN': 'skyteam',
  // Non-allied (CZ left SkyTeam 2019; MF/3U/EK/EY/HU/PR/TR/5J/TN/AD/LA never in alliance)
};

function _allianceBadge(airlineCode) {
  const allianceKey = AIRLINE_ALLIANCE[airlineCode];
  if (!allianceKey) return '';
  const a = ALLIANCES[allianceKey];
  return `<span class="fp-alliance-badge fp-alliance-${allianceKey}" title="${a.name} · ${a.name_zh}">${a.name_zh}</span>`;
}
// ============================================================

// ============================================================
//  AIRPORT COORDINATE DICTIONARY — IATA → [lat, lng]
// ============================================================

const AIRPORT_COORDS = {
  PEK: [40.08, 116.58],     // 北京首都
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

// —— CDN fallback: fetch global airport database on first miss ——
let _airportDbPromise = null;

async function _fetchAirportDatabase() {
  if (_airportDbPromise) return _airportDbPromise;
  _airportDbPromise = fetch(
    'https://cdn.jsdelivr.net/gh/mwgg/Airports@master/airports.json'
  ).then(r => {
    if (!r.ok) throw new Error(`CDN HTTP ${r.status}`);
    return r.json();
  }).catch(err => {
    _airportDbPromise = null; // allow retry on next miss
    throw err;
  });
  return _airportDbPromise;
}

async function _lookupCoordsAsync(iata) {
  const cached = AIRPORT_COORDS[iata];
  if (cached) return cached;

  try {
    const db = await _fetchAirportDatabase();
    for (const entry of Object.values(db)) {
      if (entry.iata === iata && entry.lat != null && entry.lon != null) {
        const coords = [entry.lat, entry.lon];
        AIRPORT_COORDS[iata] = coords; // cache for future lookups
        return coords;
      }
    }
  } catch (err) {
    console.warn('[FlightProfile] CDN airport lookup failed:', err.message);
  }

  console.warn('[FlightProfile] Unknown airport IATA:', iata);
  return [0, 0];
}

async function _resolveAllCoordsAsync(flight) {
  const iatas = new Set();
  if (flight.segments && flight.segments.length > 1) {
    for (const seg of flight.segments) {
      iatas.add(seg.origin);
      iatas.add(seg.destination);
    }
  } else {
    iatas.add(flight.origin || 'PEK');
    iatas.add(flight.dest || 'SYD');
  }
  const map = new Map();
  const entries = [...iatas];
  const results = await Promise.allSettled(
    entries.map(async (iata) => {
      const coords = await _lookupCoordsAsync(iata);
      return { iata, coords };
    })
  );
  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.iata, result.value.coords);
    } else {
      map.set(entries[results.indexOf(result)], [0, 0]);
    }
  }
  return map;
}

// ============================================================

import AppState from './state.js';
import { formatPrice, escapeHtml } from './utils.js';
import Analytics from './analytics.js';

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
          { cls: 'business', name: '公务舱', short: 'Business', rowStart: 5, rowEnd: 9, layout: [1,2,1], refColumns: ['A','AISLE','D','G','AISLE','K'], noiseBase: 58, desc: '一楼前段公务舱，1-2-1 交错平躺包厢。距引擎最远，一楼最安静区域。' },
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
          { cls: 'premium', name: '超级经济舱', short: 'Premium Economy', rowStart: 4, rowEnd: 6, layout: [2,3,2], refColumns: ['A','B','AISLE','D','E','F','AISLE','H','K'], noiseBase: 64, desc: '一楼隔板后超经，加宽座椅+更大后仰。距引擎远，巡航安静。' },
          { cls: 'economy', name: '经济舱', short: 'Economy', rowStart: 7, rowEnd: 33, layout: [3,4,3], refColumns: ['A','B','C','AISLE','D','E','F','G','AISLE','H','J','K'], noiseBase: 70, desc: '标准经济舱。翼根区域引擎声澎湃。' },
        ]
      }, {
        name: '二楼客舱', short: 'Upper',
        cabins: [
          { cls: 'business', name: '公务舱', short: 'Business', rowStart: 1, rowEnd: 16, layout: [2,2], refColumns: ['A','B','AISLE','E','F'], noiseBase: 58, desc: '747 上层公务舱，经典 2-2 大板凳布局。' },
        ]
      }]
    };
  }

  const isWide = ['A359','A35K','A332','A333','B78X','B789','B788','B77W'].includes(acCode);
  const totalRows = isWide ? 33 : 29;

  if (isWide) {
    // Economy layout & column letters vary by aircraft type
    let econLayout, econRefColumns;
    if (acCode === 'B77W') {
      econLayout = [3,4,3]; econRefColumns = ['A','B','C','AISLE','D','E','F','G','AISLE','H','J','K'];
    } else if (acCode === 'A333' || acCode === 'A332') {
      econLayout = [2,4,2]; econRefColumns = ['A','B','AISLE','D','E','F','G','AISLE','H','K'];
    } else {
      econLayout = [3,3,3]; econRefColumns = ['A','B','C','AISLE','D','E','F','AISLE','H','J','K'];
    }

    return {
      isDoubleDecker: false, rows: totalRows,
      decks: [{
        name: '', short: '',
        cabins: [
          { cls: 'business', name: '头等 / 公务舱', short: 'Business', rowStart: 1, rowEnd: 5, layout: [1,2,1], refColumns: ['A','AISLE','D','G','AISLE','K'], noiseBase: 58, desc: '平躺隐私包厢，极度安静 (58dB)。飞友终极梦想。' },
          { cls: 'premium', name: '超级经济舱', short: 'Premium Economy', rowStart: 6, rowEnd: 9, layout: [2,3,2], refColumns: ['A','B','AISLE','D','E','F','AISLE','H','K'], noiseBase: 64, desc: '加宽座椅、更大后仰角度。舒适与性价比的黄金分割点。' },
          { cls: 'economy', name: '经济舱', short: 'Economy', rowStart: 10, rowEnd: totalRows, layout: econLayout, refColumns: econRefColumns, noiseBase: 70, desc: '标准经济舱。翼根区域引擎声澎湃。' },
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
        { cls: 'business', name: '公务舱', short: 'Business', rowStart: 1, rowEnd: 3, layout: [2,2], refColumns: ['A','B','AISLE','E','F'], noiseBase: 58, desc: '前排安静包厢。窄体机 2-2 大板凳布局。' },
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
//  AIRCRAFT VISUAL SPECS — for SVG illustration generation
// ============================================================

const AIRCRAFT_VISUAL = {
  // Wide-body — 2 engines
  'A359': { family:'a350', fuselageLen:320, fuselageH:38, nose:'curved', engines:2, engineSize:16, tailH:70, wingSweep:28, deckRows:14 },
  'A35K':{ family:'a350', fuselageLen:350, fuselageH:38, nose:'curved', engines:2, engineSize:17, tailH:72, wingSweep:28, deckRows:16 },
  'A333':{ family:'a330', fuselageLen:300, fuselageH:40, nose:'blunt',  engines:2, engineSize:16, tailH:68, wingSweep:26, deckRows:12 },
  'B789':{ family:'b787', fuselageLen:310, fuselageH:38, nose:'pointed', engines:2, engineSize:17, tailH:70, wingSweep:30, deckRows:13 },
  'B788':{ family:'b787', fuselageLen:280, fuselageH:38, nose:'pointed', engines:2, engineSize:17, tailH:68, wingSweep:30, deckRows:11 },
  'B77W':{ family:'b777', fuselageLen:360, fuselageH:42, nose:'blunt',  engines:2, engineSize:20, tailH:74, wingSweep:28, deckRows:17 },
  // Wide-body — 4 engines
  'A388':{ family:'a380', fuselageLen:370, fuselageH:52, nose:'blunt',  engines:4, engineSize:15, tailH:80, wingSweep:30, deckRows:18, doubleDecker:true },
  'B748':{ family:'b747', fuselageLen:350, fuselageH:44, nose:'pointed', engines:4, engineSize:14, tailH:76, wingSweep:28, deckRows:16, hump:true },
  // Narrow-body — 2 engines
  'A320':{ family:'a320', fuselageLen:200, fuselageH:28, nose:'blunt',  engines:2, engineSize:10, tailH:48, wingSweep:20, deckRows:7 },
  'A321':{ family:'a320', fuselageLen:230, fuselageH:28, nose:'blunt',  engines:2, engineSize:10, tailH:50, wingSweep:20, deckRows:8 },
  'A20N':{ family:'a320', fuselageLen:200, fuselageH:28, nose:'blunt',  engines:2, engineSize:11, tailH:48, wingSweep:22, deckRows:7 },
  'B738':{ family:'b737', fuselageLen:210, fuselageH:28, nose:'pointed', engines:2, engineSize:10, tailH:50, wingSweep:22, deckRows:7 },
  'B739':{ family:'b737', fuselageLen:225, fuselageH:28, nose:'pointed', engines:2, engineSize:10, tailH:52, wingSweep:22, deckRows:8 },
  'B38M':{ family:'b737', fuselageLen:210, fuselageH:28, nose:'pointed', engines:2, engineSize:11, tailH:50, wingSweep:24, deckRows:7 },
};

// Airline brand colors for livery accent
const AIRLINE_COLORS = {
  'CA': { primary:'#d42027', secondary:'#ffffff', tail:'#d42027' },
  'CZ': { primary:'#00529e', secondary:'#ffffff', tail:'#00529e' },
  'MU': { primary:'#d42027', secondary:'#ffffff', tail:'#d42027' },
  'HU': { primary:'#e31818', secondary:'#ffd700', tail:'#e31818' },
  '3U': { primary:'#0066b3', secondary:'#ffffff', tail:'#0066b3' },
  'MF': { primary:'#004a99', secondary:'#ffffff', tail:'#004a99' },
  'ZH': { primary:'#c41230', secondary:'#ffffff', tail:'#c41230' },
  'CX': { primary:'#005a43', secondary:'#ffffff', tail:'#005a43' },
  'SQ': { primary:'#1a1a72', secondary:'#f4b223', tail:'#1a1a72' },
  'KE': { primary:'#00a1de', secondary:'#ffffff', tail:'#00a1de' },
  'NH': { primary:'#00539f', secondary:'#ffffff', tail:'#00539f' },
  'JL': { primary:'#d71921', secondary:'#ffffff', tail:'#d71921' },
  'QF': { primary:'#e60000', secondary:'#ffffff', tail:'#e60000' },
  'EK': { primary:'#d71921', secondary:'#ffffff', tail:'#d71921' },
  'QR': { primary:'#731a40', secondary:'#ffffff', tail:'#731a40' },
  'TK': { primary:'#e9302a', secondary:'#ffffff', tail:'#e9302a' },
  'EY': { primary:'#b99855', secondary:'#ffffff', tail:'#b99855' },
  'LH': { primary:'#05164d', secondary:'#ffad00', tail:'#05164d' },
  'AF': { primary:'#002157', secondary:'#ffffff', tail:'#002157' },
};

// ============================================================
//  AIRCRAFT IMAGE DATABASE — Local library by model → airline
//  Directory: static/images/aircraft/{model}/{airline}/
//  _generic = no specific airline (house livery, prototype, etc.)
//  Run: python download_images.py to populate
// ============================================================

const AIRCRAFT_IMAGES = {
  // Auto-generated from static/images/aircraft/ — 303 model×airline combos
  'A20N': {
    '3U': ['A20N.jpg'],
    '5J': ['A20N.jpg'],
    'AD': ['A20N_01.jpg', 'A20N_02.jpg'],
    'AI': ['A20N.jpg'],
    'CA': ['A20N.jpg'],
    'CZ': ['A20N.jpg'],
    'HU': ['A20N.jpg'],
    'LA': ['A20N.jpg'],
    'LH': ['A20N.jpg'],
    'MF': ['A20N.jpg'],
    'MS': ['A20N.jpg'],
    'MU': ['A20N.jpg'],
    'NH': ['A20N.jpg'],
    'NZ': ['A20N.jpg'],
    'OS': ['A20N.jpg'],
    'TR': ['A20N.jpg'],
    'VN': ['A20N.jpg'],
    'ZH': ['A20N.jpg'],
  },
  'A320': {
    '3U': ['A320.jpg'],
    '5J': ['A320.jpg'],
    'AA': ['A320.jpg'],
    'AC': ['A320.jpg'],
    'AD': ['A320.jpg'],
    'AF': ['A320.jpg'],
    'AI': ['A320.jpg'],
    'AT': ['A320.jpg'],
    'BA': ['A320.jpg'],
    'CA': ['A320.jpg'],
    'CZ': ['A320.jpg'],
    'EY': ['A320.jpg'],
    'LA': ['A320.jpg'],
    'LH': ['A320.jpg'],
    'MS': ['A320.jpg'],
    'MU': ['A320.jpg'],
    'NH': ['A320.jpg'],
    'NZ': ['A320.jpg'],
    'OS': ['A320.jpg'],
    'PR': ['A320.jpg'],
    'QR': ['A320.jpg'],
    'SA': ['A320.jpg'],
    'TG': ['A320.jpg'],
    'TK': ['A320.jpg'],
    'TR': ['A320.jpg'],
    'UA': ['A320.jpg'],
    'ZH': ['A320.jpg'],
  },
  'A321': {
    '3U': ['A321.jpg'],
    '5J': ['A321.jpg'],
    'AA': ['A321_01.jpg', 'A321_02.jpg'],
    'AC': ['A321_01.jpg', 'A321_02.jpg'],
    'AD': ['A321.jpg'],
    'AF': ['A321.jpg'],
    'AI': ['A321.jpg'],
    'AT': ['A321.jpg'],
    'BA': ['A321.jpg'],
    'BR': ['A321.jpg'],
    'CA': ['A321.jpg'],
    'CI': ['A321.jpg'],
    'CX': ['A321.jpg'],
    'CZ': ['A321_01.jpg', 'A321_02.jpg'],
    'DL': ['A321_01.jpg', 'A321_02.jpg'],
    'EY': ['A321.jpg'],
    'HU': ['A321.jpg'],
    'KE': ['A321.jpg'],
    'LA': ['A321.jpg'],
    'LH': ['A321.jpg'],
    'MS': ['A321.jpg'],
    'MU': ['A321.jpg'],
    'NH': ['A321.jpg'],
    'NZ': ['A321.jpg'],
    'OS': ['A321.jpg'],
    'OZ': ['A321.jpg'],
    'PR': ['A321.jpg'],
    'QR': ['A321.jpg'],
    'TK': ['A321.jpg'],
    'TR': ['A321.jpg'],
    'UA': ['A321.jpg'],
    'VN': ['A321_01.jpg', 'A321_02.jpg'],
    'ZH': ['A321_01.jpg', 'A321_02.jpg'],
  },
  'A332': {
    '3U': ['A332.jpg'],
    'AF': ['A332.jpg'],
    'CA': ['A332.jpg'],
    'DL': ['A332.jpg'],
    'GA': ['A332.jpg'],
    'KL': ['A332.jpg'],
    'MH': ['A332.jpg'],
    'MU': ['A332.jpg'],
    'QF': ['A332.jpg'],
    'TK': ['A332.jpg'],
  },
  'A333': {
    '3U': ['A333.jpg'],
    '5J': ['A333.jpg'],
    'AC': ['A333.jpg'],
    'AD': ['A333.jpg'],
    'BR': ['A333.jpg'],
    'CA': ['A333.jpg'],
    'CI': ['A333.jpg'],
    'CX': ['A333.jpg'],
    'CZ': ['A333.jpg'],
    'DL': ['A333.jpg'],
    'GA': ['A333.jpg'],
    'HU': ['A333.jpg'],
    'KE': ['A333.jpg'],
    'KL': ['A333.jpg'],
    'LH': ['A333.jpg'],
    'MH': ['A333.jpg'],
    'MS': ['A333.jpg'],
    'MU': ['A333.jpg'],
    'OZ': ['A333.jpg'],
    'PR': ['A333.jpg'],
    'QF': ['A333.jpg'],
    'SA': ['A333.jpg'],
    'TG': ['A333.jpg'],
    'TK': ['A333.jpg'],
    'VS': ['A333.jpg'],
  },
  'A339': {
    'DL': ['A339.jpg'],
    'GA': ['A339.jpg'],
    'MH': ['A339.jpg'],
    'VS': ['A339.jpg'],
  },
  'A359': {
    '3U': ['A359.jpg'],
    'AF': ['A359.jpg'],
    'AI': ['A359.jpg'],
    'CA': ['A359.jpg'],
    'CI': ['A359.jpg'],
    'CX': ['A359.jpg'],
    'CZ': ['A359.jpg'],
    'DL': ['A359.jpg'],
    'EK': ['A359.jpg'],
    'ET': ['A359.jpg'],
    'JL': ['A359.jpg'],
    'KE': ['A359.jpg'],
    'LH': ['A359.jpg'],
    'MH': ['A359.jpg'],
    'MU': ['A359.jpg'],
    'OZ': ['A359.jpg'],
    'PR': ['A359.jpg'],
    'QR': ['A359.jpg'],
    'SQ': ['A359.jpg'],
    'TG': ['A359.jpg'],
    'TK': ['A359.jpg'],
    'VN': ['A359.jpg'],
  },
  'A35K': {
    'BA': ['A35K.jpg'],
    'CX': ['A35K.jpg'],
    'ET': ['A35K.jpg'],
    'EY': ['A35K.jpg'],
    'JL': ['A35K.jpg'],
    'LH': ['A35K.jpg'],
    'PR': ['A35K.jpg'],
    'QR': ['A35K.jpg'],
    'VS': ['A35K.jpg'],
  },
  'A388': {
    'BA': ['A388.jpg'],
    'EK': ['A388.jpg'],
    'EY': ['A388.jpg'],
    'KE': ['A388.jpg'],
    'LH': ['A388.jpg'],
    'NH': ['A388.jpg'],
    'OZ': ['A388.jpg'],
    'QF': ['A388.jpg'],
    'QR': ['A388.jpg'],
    'SQ': ['A388.jpg'],
  },
  'B38M': {
    'AA': ['B38M.jpg'],
    'AC': ['B38M.jpg'],
    'AM': ['B38M.jpg'],
    'AT': ['B38M.jpg'],
    'CA': ['B38M.jpg'],
    'CM': ['B38M.jpg'],
    'CZ': ['B38M.jpg'],
    'ET': ['B38M.jpg'],
    'HU': ['B38M.jpg'],
    'LO': ['B38M.jpg'],
    'MF': ['B38M.jpg'],
    'MH': ['B38M.jpg'],
    'MU': ['B38M.jpg'],
    'QR': ['B38M.jpg'],
    'SQ': ['B38M.jpg'],
    'TK': ['B38M.jpg'],
    'UA': ['B38M.jpg'],
    'ZH': ['B38M.jpg'],
  },
  'B738': {
    'AA': ['B738.jpg'],
    'AC': ['B738.jpg'],
    'AI': ['B738.jpg'],
    'AM': ['B738.jpg'],
    'AT': ['B738.jpg'],
    'CA': ['B738.jpg'],
    'CI': ['B738.jpg'],
    'CM': ['B738.jpg'],
    'CZ': ['B738.jpg'],
    'DL': ['B738.jpg'],
    'ET': ['B738.jpg'],
    'GA': ['B738.jpg'],
    'HU': ['B738.jpg'],
    'JL': ['B738.jpg'],
    'KE': ['B738.jpg'],
    'KL': ['B738.jpg'],
    'KQ': ['B738.jpg'],
    'LO': ['B738.jpg'],
    'MF': ['B738.jpg'],
    'MH': ['B738.jpg'],
    'MS': ['B738.jpg'],
    'MU': ['B738.jpg'],
    'NH': ['B738.jpg'],
    'QF': ['B738.jpg'],
    'SA': ['B738.jpg'],
    'SQ': ['B738.jpg'],
    'TK': ['B738.jpg'],
    'UA': ['B738.jpg'],
    'ZH': ['B738.jpg'],
  },
  'B739': {
    'CM': ['B739.jpg'],
    'DL': ['B739.jpg'],
    'KE': ['B739.jpg'],
    'KL': ['B739.jpg'],
    'UA': ['B739.jpg'],
  },
  'B748': {
    'CA': ['B748.jpg'],
    'KE': ['B748.jpg'],
    'LH': ['B748.jpg'],
  },
  'B763': {
    'OS': ['B763.jpg'],
    'UA': ['B763.jpg'],
  },
  'B77W': {
    'AA': ['B77W.jpg'],
    'AC': ['B77W.jpg'],
    'AF': ['B77W.jpg'],
    'AI': ['B77W.jpg'],
    'BA': ['B77W.jpg'],
    'BR': ['B77W.jpg'],
    'CA': ['B77W.jpg'],
    'CI': ['B77W.jpg'],
    'CX': ['B77W.jpg'],
    'CZ': ['B77W.jpg'],
    'EK': ['B77W.jpg'],
    'ET': ['B77W.jpg'],
    'EY': ['B77W.jpg'],
    'GA': ['B77W.jpg'],
    'JL': ['B77W.jpg'],
    'KE': ['B77W.jpg'],
    'KL': ['B77W.jpg'],
    'MU': ['B77W.jpg'],
    'NH': ['B77W.jpg'],
    'NZ': ['B77W.jpg'],
    'OZ': ['B77W.jpg'],
    'PR': ['B77W.jpg'],
    'QR': ['B77W.jpg'],
    'SQ': ['B77W.jpg'],
    'TG': ['B77W.jpg'],
    'TK': ['B77W.jpg'],
    'UA': ['B77W.jpg'],
  },
  'B788': {
    'AA': ['B788.jpg'],
    'AC': ['B788.jpg'],
    'AI': ['B788.jpg'],
    'AM': ['B788.jpg'],
    'AT': ['B788.jpg'],
    'BA': ['B788.jpg'],
    'CZ': ['B788.jpg'],
    'ET': ['B788.jpg'],
    'HU': ['B788.jpg'],
    'JL': ['B788.jpg'],
    'KQ': ['B788.jpg'],
    'LA': ['B788.jpg'],
    'LO': ['B788.jpg'],
    'MF': ['B788.jpg'],
    'NH': ['B788.jpg'],
    'QR': ['B788.jpg'],
    'TG': ['B788.jpg'],
    'TR': ['B788.jpg'],
    'UA': ['B788.jpg'],
  },
  'B789': {
    'AA': ['B789.jpg'],
    'AC': ['B789.jpg'],
    'AF': ['B789.jpg'],
    'AI': ['B789.jpg'],
    'AM': ['B789.jpg'],
    'AT': ['B789.jpg'],
    'BA': ['B789.jpg'],
    'BR': ['B789.jpg'],
    'CA': ['B789.jpg'],
    'CZ': ['B789.jpg'],
    'ET': ['B789.jpg'],
    'EY': ['B789.jpg'],
    'HU': ['B789.jpg'],
    'JL': ['B789.jpg'],
    'KE': ['B789.jpg'],
    'KL': ['B789.jpg'],
    'LA': ['B789.jpg'],
    'LH': ['B789.jpg'],
    'LO': ['B789.jpg'],
    'MF': ['B789.jpg'],
    'MS': ['B789.jpg'],
    'MU': ['B789.jpg'],
    'NH': ['B789.jpg'],
    'NZ': ['B789.jpg'],
    'OS': ['B789.jpg'],
    'QF': ['B789.jpg'],
    'QR': ['B789.jpg'],
    'TG': ['B789.jpg'],
    'TK': ['B789.jpg'],
    'TN': ['B789.jpg'],
    'TR': ['B789.jpg'],
    'UA': ['B789.jpg'],
    'VN': ['B789.jpg'],
    'VS': ['B789.jpg'],
  },
  'B78X': {
    'BA': ['B78X.jpg'],
    'BR': ['B78X.jpg'],
    'EY': ['B78X.jpg'],
    'KL': ['B78X.jpg'],
    'NH': ['B78X.jpg'],
    'SQ': ['B78X.jpg'],
    'UA': ['B78X.jpg'],
    'VN': ['B78X.jpg'],
  },
};;;
;
;
;
;
;
;

function _localImageUrl(model, airline, filename) {
  return `/static/images/aircraft/${encodeURIComponent(model)}/${encodeURIComponent(airline)}/${encodeURIComponent(filename)}`;
}

// Wikimedia Commons search URL for manual lookup
function _aircraftSearchUrl(acCode) {
  const model = (AIRCRAFT_VISUAL[acCode] && AIRCRAFT_VISUAL[acCode].family) ? AIRCRAFT_VISUAL[acCode].family.toUpperCase() : acCode;
  return `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(model + ' aircraft')}&title=Special:MediaSearch`;
}

function _getAircraftImageUrls(acCode, airlineCode) {
  const modelData = AIRCRAFT_IMAGES[acCode];
  if (!modelData) return null;

  // Priority 1: exact airline match
  if (airlineCode && modelData[airlineCode]) {
    const list = modelData[airlineCode];
    const fname = list[Math.floor(Math.random() * list.length)];
    return { local: _localImageUrl(acCode, airlineCode, fname), source: 'airline' };
  }

  return null;
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
      const colLetters = cabin.refColumns.filter(ref => ref !== 'AISLE');
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
  const segs = flight.segments || [];
  const hasMultiSeg = segs.length > 1;

  // Per-segment aircraft codes for segment tabs
  const segAcCodes = hasMultiSeg ? segs.map(s => s.aircraft || acCode) : [acCode];

  // Segment sub-tab bar + panels (only for multi-segment)
  let segTabBar = '';
  let segIdPanels = '';
  if (hasMultiSeg) {
    segTabBar = `
      <div class="fp-seg-tab-bar" id="fpSegTabBar">
        ${segAcCodes.map((code, i) => `
          <button class="fp-seg-tab-btn ${i === 0 ? 'active' : ''}" data-seg="${i}">
            第${i + 1}程 · ${escapeHtml(code)}
          </button>
        `).join('')}
      </div>`;
    segIdPanels = segAcCodes.map((code, i) => `
      <div class="fp-seg-id-panel ${i === 0 ? 'active' : ''}" data-seg-panel="${i}">
        ${_buildAircraftIdBlock(flight, i)}
      </div>
    `).join('');
  }

  const aircraftIdSection = hasMultiSeg
    ? `<div class="fp-section">
        <div class="fp-section-title">
          <span class="fp-section-icon">P</span> 航空器识别
          <span class="fp-section-hint">— 分段实拍影像</span>
        </div>
        ${segTabBar}
        <div class="fp-seg-id-area">
          ${segIdPanels}
        </div>
      </div>`
    : `<div class="fp-section">
        <div class="fp-section-title">
          <span class="fp-section-icon">P</span> 航空器识别
        </div>
        ${_buildAircraftIdBlock(flight)}
      </div>`;

  return `
    <div class="fp-overlay" id="fpOverlay">
      <div class="fp-panel" id="fpPanel">
        <button class="fp-close" id="fpClose">&times;</button>

        <!-- Fixed header area (shared across tabs) -->
        <div class="fp-top-area">
          ${_buildHeader(flight, g, acCode)}
          ${_buildSpecsRow(g)}
        </div>

        <!-- Tab bar -->
        <div class="fp-tab-bar" id="fpTabBar">
          <button class="fp-tab-btn active" data-tab="0">飞行数据</button>
          <button class="fp-tab-btn" data-tab="1">座舱图</button>
          <button class="fp-tab-btn" data-tab="2">航线轨迹</button>
        </div>

        <!-- Tab content -->
        <div class="fp-tab-content" id="fpTabContent">
          <div class="fp-tab-panel active" data-tab-panel="0">
            ${aircraftIdSection}
            ${_buildDistanceSection(flight, acCode)}
            ${_buildTelemetry(g.telemetry)}
            ${_buildLogs(g.recentLogs)}
          </div>
          <div class="fp-tab-panel" data-tab-panel="1">
            ${_buildSeatExplorer(seatMap)}
          </div>
          <div class="fp-tab-panel" data-tab-panel="2" id="fpGlobePanel">
            ${_buildGlobe(flight)}
          </div>
        </div>

        <div class="fp-footer">航空爱好者社区与公开飞行数据 | 仅供极客探索，不提供购票/值机服务</div>
      </div>
    </div>`;
}

function _buildHeader(flight, g, acCode) {
  const segs = flight.segments || [];
  return `
    <div class="fp-header">
      <div class="fp-airline-badge">
        <span class="fp-airline-name">${escapeHtml(flight.airline_name || flight.airline)}</span>
        <span class="fp-airline-code">${escapeHtml(flight.airline)}</span>
        ${_allianceBadge(flight.airline)}
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

// ——— Aircraft identification block (v5.7: 3-row layout) ———
// Row 1: "第X程 航班号"  |  Row 2: photo (centered, rounded)  |  Row 3: model + registration
function _buildAircraftIdBlock(flight, segIdx) {
  const g = flight.geek || {};
  const segs = flight.segments || [];
  const isMultiSeg = segs.length > 1;

  const seg = (segIdx !== undefined && segs[segIdx]) ? segs[segIdx] : (segs[0] || {});
  const acCode = seg.aircraft || flight.aircraft_code || 'B789';
  const flightNo = seg.flight_no || '--';
  const fullModel = AIRCRAFT_VISUAL[acCode]?.family?.toUpperCase() || g.exactModel || acCode;
  const airlineCode = flight.airline || '';
  const urls = _getAircraftImageUrls(acCode, airlineCode);

  // Build display flight number with airline prefix when missing
  const fnDisplay = flightNo.startsWith(airlineCode) ? flightNo : (airlineCode + flightNo);

  // Row 1: segment label + flight number
  let flightNoLabel;
  if (isMultiSeg) {
    flightNoLabel = `第${segIdx + 1}程 ${escapeHtml(fnDisplay)}`;
  } else {
    flightNoLabel = escapeHtml(fnDisplay);
  }

  // Row 3: model name + registration
  const registration = g.registration || 'B-0000';
  const modelAndReg = `${escapeHtml(fullModel)} · ${escapeHtml(registration)}`;

  const panelId = segIdx !== undefined ? segIdx : '';

  return `
    <div class="fp-ac-id-block">
      <div class="fp-ac-id-flightno">${flightNoLabel}</div>
      <div class="fp-ac-id-photo" id="fpAircraftPhoto${panelId}">
        ${urls ? `
          <img class="fp-aircraft-img" id="fpAircraftImg${panelId}"
               src="${escapeHtml(urls.local)}"
               alt="${escapeHtml(fullModel)}"
               loading="lazy">
          <div class="fp-aircraft-fallback" style="display:none;">
            <div class="fp-fallback-icon">&#9992;</div>
            <span>图片加载失败<br><small>请检查本地素材库</small></span>
          </div>` : `
          <div class="fp-aircraft-fallback" style="display:flex;">
            <div class="fp-fallback-icon">&#9992;</div>
            <span>暂无实拍影像<br><small>${escapeHtml(airlineCode)} · ${escapeHtml(fullModel)}</small></span>
          </div>`}
      </div>
      <div class="fp-ac-id-details">${modelAndReg}</div>
    </div>`;
}

function _buildDistanceSection(flight, acCode) {
  const segs = flight.segments || [];
  if (segs.length === 0) return '';

  let totalDist = 0;
  const rows = segs.map((s, i) => {
    const dist = s.distance_km || 0;
    totalDist += dist;
    const distStr = dist > 0 ? `${dist.toLocaleString()} km` : '—';
    const originName = s.origin || '?';
    const destName = s.destination || '?';
    const ac = s.aircraft || '?';
    const rangePct = s.range_pct;
    let rangeBar = '';
    if (rangePct !== undefined && rangePct > 0) {
      const color = rangePct > 80 ? 'var(--red)' : rangePct > 60 ? 'var(--orange)' : 'var(--aero-accent)';
      rangeBar = `<div class="fp-range-bar-wrap"><div class="fp-range-bar" style="width:${Math.min(rangePct, 100)}%;background:${color};"></div></div>`;
    }
    const segLabel = segs.length > 1 ? `第${i + 1}程` : '直飞航段';
    return `
      <div class="fp-dist-seg">
        <div class="fp-dist-seg-header">
          <span class="fp-dist-label">${segLabel}</span>
          <span class="fp-dist-route">${escapeHtml(originName)} → ${escapeHtml(destName)}</span>
        </div>
        <div class="fp-dist-detail">
          <span class="fp-dist-value">${distStr}</span>
          <span class="fp-dist-ac">机型 ${escapeHtml(ac)}</span>
          ${rangePct !== undefined ? `<span class="fp-dist-range-pct">航程利用率 ${rangePct}%</span>` : ''}
        </div>
        ${rangeBar}
      </div>`;
  }).join('');

  const totalStr = totalDist > 0 ? `${totalDist.toLocaleString()} km` : '—';
  const totalMi = totalDist > 0 ? ` (${Math.round(totalDist * 0.6214).toLocaleString()} mi)` : '';

  return `
    <div class="fp-section">
      <div class="fp-section-title">
        <span class="fp-section-icon">D</span> 飞行里程
        <span class="fp-section-hint">— Great-circle distance</span>
      </div>
      <div class="fp-dist-list">
        ${rows}
      </div>
      <div class="fp-dist-total">
        <span class="fp-dist-total-label">总飞行距离</span>
        <span class="fp-dist-total-value">${totalStr}</span>
        <span class="fp-dist-total-mi">${totalMi}</span>
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
      if (si === 0) {
        html += `<div class="fp-cabin-divider fp-cabin-divider-first">
          <span class="fp-cabin-badge ${sec.cls}">${sec.name} (Row ${sec.rowStart}-${sec.rowEnd})</span>
          <span class="fp-cabin-line"></span>
        </div>`;
      } else {
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
      <!-- Seat Inspector Modal — avgeek hardware deep-dive -->
      <div class="fp-seat-inspector" id="fpSeatInspector">
        <div class="fp-inspector-card">
          <div class="fp-inspector-header">
            <span class="fp-inspector-seat" id="fpDetailSeat"></span>
            <span class="fp-inspector-quality" id="fpDetailQuality"></span>
          </div>
          <div class="fp-avgeek-commentary" id="fpAvgeekCommentary"></div>
          <div class="fp-hardware-section" id="fpHardwareSection">
            <div class="fp-hardware-name" id="fpHardwareName"></div>
            <div class="fp-hardware-specs">
              <span class="fp-hardware-spec" id="fpHardwarePitch"></span>
              <span class="fp-hardware-spec" id="fpHardwareWidth"></span>
              <span class="fp-hardware-spec" id="fpHardwareRecline"></span>
            </div>
            <div class="fp-seat-profile" id="fpSeatProfile"></div>
          </div>
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
          data-quality="${s.quality}" data-cabin-class="${s.cabinClass}"
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
  let routeLabel;
  if (flight.segments && flight.segments.length > 1) {
    const chain = flight.segments.map(s => s.origin).join(' → ') + ' → ' + flight.segments[flight.segments.length - 1].destination;
    routeLabel = escapeHtml(chain);
  } else {
    routeLabel = `${escapeHtml(flight.origin || 'PEK')} → ${escapeHtml(flight.dest || 'SYD')}`;
  }
  const stopsBadge = (flight.stops && flight.stops > 0) ? ` <span style="font-size:0.58rem;background:#f59e0b;color:#000;padding:2px 6px;border-radius:6px;margin-left:6px;">中转 ${flight.stops} 站</span>` : '';

  return `
    <div class="fp-section">
      <div class="fp-section-title"><span class="fp-section-icon">G</span> 3D 互动地球 — 大圆航线轨迹${stopsBadge}</div>
      <div class="fp-globe-wrap">
        <div id="fpGlobe3D" class="fp-globe-3d">${_globeSkeletonHTML()}</div>
        <div class="fp-globe-overlay">
          <span class="fp-globe-label">${routeLabel}</span>
          <span class="fp-globe-label">ETOPS 180min 安全圈</span>
        </div>
      </div>
    </div>`;
}

function _midLng(lng1, lng2) {
  let delta = lng2 - lng1;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  let mid = lng1 + delta / 2;
  if (mid > 180) mid -= 360;
  if (mid < -180) mid += 360;
  return mid;
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
    el.innerHTML = '';  // clear skeleton before Globe appends canvas
    const globe = Globe()
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('rgba(56,189,248,0.25)')
      .atmosphereAltitude(0.25)
      (el);

    _activeGlobeInstance = globe;

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

    // POV: midpoint with date-line correction
    const midLat = (originLat + destLat) / 2;
    const midLng = _midLng(originLng, destLng);
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

function _showGlobeFallback(el, msg, flight) {
  el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;color:#94a3b8;font-size:0.85rem;text-align:center;padding:40px;gap:12px;">
    <span>${msg}</span>
    <button class="btn" id="retryGlobeBtn" style="font-size:0.8rem;padding:6px 16px;">重试加载</button>
  </div>`;
  if (flight) {
    el.querySelector('#retryGlobeBtn')?.addEventListener('click', () => {
      el.innerHTML = _globeSkeletonHTML();
      _initGlobeAsync(activePanel, flight);
    });
  }
}

function _globeSkeletonHTML() {
  return '<div class="globe-skeleton"><div class="globe-skeleton-ring"></div><div class="globe-skeleton-shimmer"></div><span class="globe-skeleton-text">加载 3D 地球…</span></div>';
}

// —— Multi-segment globe for connecting flights ——
function _initMultiSegmentGlobe3D(el, flight, allCoords) {
  if (!window.Globe) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const segments = flight.segments || [];
  const arcData = [];
  const labelSet = new Map(); // iata → { lat, lng }
  const ringData = [];

  for (const seg of segments) {
    const oCoords = allCoords.get(seg.origin) || [0, 0];
    const dCoords = allCoords.get(seg.destination) || [0, 0];
    arcData.push({
      startLat: oCoords[0], startLng: oCoords[1],
      endLat: dCoords[0], endLng: dCoords[1],
      color: '#10b981',
    });
    labelSet.set(seg.origin, { lat: oCoords[0], lng: oCoords[1] });
    labelSet.set(seg.destination, { lat: dCoords[0], lng: dCoords[1] });
  }

  const allIATAs = [...labelSet.keys()];
  const firstIATA = allIATAs[0];
  const lastIATA = allIATAs[allIATAs.length - 1];

  const labelData = [];
  for (const [iata, coords] of labelSet) {
    const isEndpoint = iata === firstIATA || iata === lastIATA;
    labelData.push({
      lat: coords.lat, lng: coords.lng,
      text: iata,
      color: isEndpoint ? '#10b981' : '#f59e0b',
      size: isEndpoint ? 2.2 : 1.7,
    });
    ringData.push({
      lat: coords.lat, lng: coords.lng,
      color: isEndpoint ? '#10b981' : '#f59e0b',
      radius: isEndpoint ? 2.8 : 2.0,
    });
  }

  try {
    el.innerHTML = '';  // clear skeleton before Globe appends canvas
    const globe = Globe()
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('rgba(56,189,248,0.25)')
      .atmosphereAltitude(0.25)
      (el);

    _activeGlobeInstance = globe;

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.5;

    globe.arcsData(arcData)
      .arcColor('color')
      .arcAltitude(0.38)
      .arcStroke(1.2)
      .arcDashLength(0.22)
      .arcDashGap(0.9)
      .arcDashAnimateTime(2200)
      .arcDashInitialGap(() => 1)
      .arcsTransitionDuration(0);

    globe.labelsData(labelData)
      .labelColor('color')
      .labelSize('size')
      .labelDotRadius(0.45)
      .labelDotOrientation(() => 'bottom')
      .labelsTransitionDuration(0);

    globe.ringsData(ringData)
      .ringColor('color')
      .ringMaxRadius('radius')
      .ringPropagationSpeed(2.5)
      .ringRepeatPeriod(1600);

    // POV: bounding-box center of all coords, date-line aware
    const lats = labelData.map(d => d.lat);
    const lngs = labelData.map(d => d.lng);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = _midLng(Math.min(...lngs), Math.max(...lngs));
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.abs(Math.max(...lngs) - Math.min(...lngs));
    const alt = Math.max(1.5, Math.min(4.0, Math.max(latSpan, lngSpan > 180 ? 360 - lngSpan : lngSpan) * 0.022));
    globe.pointOfView({ lat: midLat, lng: midLng, altitude: alt }, 1200);

    console.log('[FlightProfile] Multi-segment Globe initialized —', allIATAs.join(' → '));
    return globe;
  } catch (err) {
    console.error('[FlightProfile] Multi-segment Globe init failed:', err);
    _showGlobeFallback(el, '3D 地球渲染失败');
    return null;
  }
}



// —— Async globe bootstrap: resolve coords (CDN fallback) then init ——
async function _initGlobeAsync(container, flight) {
  const el = container.querySelector('#fpGlobe3D');
  if (!el) return;

  try {
    const allCoords = await _resolveAllCoordsAsync(flight);
    // Defend: element may have been removed while fetching CDN
    if (!el.isConnected) return;

    // Wait for container dimensions
    const ready = await _waitForDim(el, 20);
    if (!ready) {
      _showGlobeFallback(el, '3D 地球容器未就绪，请关闭面板重试', flight);
      return;
    }

    if (!window.Globe) {
      _showGlobeFallback(el, 'Globe.gl 库加载超时，请重试', flight);
      return;
    }

    if (flight.segments && flight.segments.length > 1 && allCoords.size > 2) {
      _initMultiSegmentGlobe3D(el, flight, allCoords);
    } else {
      const originIATA = flight.origin || 'PEK';
      const destIATA = flight.dest || 'SYD';
      const [originLat, originLng] = allCoords.get(originIATA) || [0, 0];
      const [destLat, destLng] = allCoords.get(destIATA) || [0, 0];
      _initGlobe3D(el, originIATA, originLat, originLng, destIATA, destLat, destLng);
    }
  } catch (err) {
    console.error('[FlightProfile] Async globe init failed:', err);
    if (el.isConnected) _showGlobeFallback(el, '3D 地球加载失败，请重试', flight);
  }
}

function _waitForDim(el, maxAttempts = 20) {
  return new Promise(resolve => {
    let attempts = 0;
    const poll = () => {
      if (!el.isConnected) { resolve(false); return; }
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) { resolve(true); return; }
      if (attempts >= maxAttempts) { resolve(false); return; }
      attempts++;
      setTimeout(poll, 50);
    };
    setTimeout(poll, 100);
  });
}

// ============================================================
//  SEAT HARDWARE MUSEUM — Cabin class specs + avgeek commentary
// ============================================================

const HARDWARE_SPECS = {
  first: {
    key: 'first', name: 'The Suite 豪华全封闭套房',
    pitch: '82" (208cm) 间距', width: '22.5" 宽度', recline: '180° 全平躺睡床',
    highlight: '自带独立隐私拉门，飞友终极奢华梦想。',
    profile: 'suite',
  },
  business_wide: {
    key: 'business_wide', name: 'Reverse Herringbone 1-2-1 反鱼骨大沙发',
    pitch: '45" (114cm) 间距', width: '21" 宽度', recline: '180° 全平躺睡床',
    highlight: '全独立过道接入，包裹感与隐私度极佳。',
    profile: 'herringbone',
  },
  business_narrow: {
    key: 'business_narrow', name: 'Regional Recliner 2-2 经典豪华大板凳',
    pitch: '38" (96cm) 间距', width: '20" 宽度', recline: '125° 舒适后仰',
    highlight: '窄体机商务舱标配，前排无敌安静。',
    profile: 'recliner',
  },
  premium: {
    key: 'premium', name: 'Premium Comfort 舒适超经座椅',
    pitch: '38" (96cm) 间距', width: '19" 宽度', recline: '120° 后仰',
    highlight: '加宽座椅、更大后仰角度，长途性价比之王。',
    profile: 'premium',
  },
  economy: {
    key: 'economy', name: 'Standard Slimline 标配轻薄独立座椅',
    pitch: '31-32" (79cm) 间距', width: '17.5" 宽度', recline: '110° 后仰',
    highlight: '中规中矩，选对位置依然舒适。',
    profile: 'economy',
  },
};

function _getHardwareKey(cabinClass, acCode) {
  if (cabinClass === 'first') return 'first';
  if (cabinClass === 'premium') return 'premium';
  if (cabinClass === 'business') {
    const widebodies = ['A359','A35K','A333','B789','B788','B77W','A388','B748'];
    return widebodies.includes(acCode) ? 'business_wide' : 'business_narrow';
  }
  return 'economy';
}

function _getAvgeekCommentary(quality, cabinClass) {
  const prefix = cabinClass === 'first' ? '[头等套房] ' : cabinClass === 'business' ? '[公务舱] ' : cabinClass === 'premium' ? '[超级经济舱] ' : '[经济舱] ';
  const map = {
    good: `${prefix}32寸无敌间距，窗口与视线完美齐平，拍照绝佳，飞友力荐！`,
    bad: `${prefix}⚠️ 千万别选！这一排侧面是全封闭死墙，完全没有窗户，压抑得像在坐潜水艇！`,
    warning: `${prefix}虽然空间大，但紧邻后方洗手间，冲水声音明显，且经常有人排队晃荡，睡眠不佳者慎选。`,
    standard: `${prefix}中规中矩的标准客舱座位，没有惊喜也没有大坑。`,
  };
  return map[quality] || map.standard;
}

function _populateHardwareSection(cabinClass, acCode) {
  const key = _getHardwareKey(cabinClass, acCode);
  const spec = HARDWARE_SPECS[key] || HARDWARE_SPECS.economy;

  document.getElementById('fpHardwareName').textContent = spec.name;
  document.getElementById('fpHardwarePitch').textContent = spec.pitch;
  document.getElementById('fpHardwareWidth').textContent = spec.width;
  document.getElementById('fpHardwareRecline').textContent = spec.recline;

  const profileEl = document.getElementById('fpSeatProfile');
  profileEl.innerHTML = _buildSeatProfileHTML(spec.profile);
  profileEl.className = 'fp-seat-profile fp-seat-profile--' + spec.profile;

  const section = document.getElementById('fpHardwareSection');
  section.querySelector('.fp-hardware-highlight')?.remove();
  const highlight = document.createElement('p');
  highlight.className = 'fp-hardware-highlight';
  highlight.textContent = spec.highlight;
  section.appendChild(highlight);
}

function _buildSeatProfileHTML(profile) {
  const isEnclosed = profile === 'suite' || profile === 'herringbone';
  const isRecliner = profile === 'recliner';
  const backH = profile === 'suite' ? '46' : profile === 'economy' ? '32' : '38';
  const seatH = profile === 'suite' ? '14' : profile === 'economy' ? '8' : '12';
  const armW = isRecliner ? '6' : '4';
  return `
    <div class="fp-silhouette ${profile}">
      <div class="fp-sil-left-arm" style="width:${armW}px;height:14px;border-radius:${armW/2}px;background:#94a3b8;align-self:center;"></div>
      <div class="fp-sil-back" style="width:10px;height:${backH}px;border-radius:5px 5px 0 0;background:#64748b;"></div>
      <div class="fp-sil-pan" style="width:24px;height:${seatH}px;border-radius:0 0 5px 5px;background:#475569;"></div>
      <div class="fp-sil-right-arm" style="width:${armW}px;height:14px;border-radius:${armW/2}px;background:#94a3b8;align-self:center;"></div>
      ${isEnclosed ? '<div class="fp-sil-door" style="width:3px;height:26px;border-radius:2px;background:#cbd5e1;align-self:flex-start;margin-top:4px;"></div>' : ''}
    </div>`;
}

// ============================================================
//  PANEL LIFECYCLE
// ============================================================

let activePanel = null;

// H5: Focus trap — keep Tab within the profile panel
function _trapFocus(e) {
  if (e.key !== 'Tab' || !activePanel) return;
  const focusable = activePanel.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

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

  document.addEventListener('keydown', _trapFocus);
}

function openFlightProfile(flight) {
  if (!flight || !flight.aircraft_code) return;
  Analytics.trackProfileOpen(flight.airline, flight.aircraft_code);
  closeFlightProfile();

  const container = document.createElement('div');
  container.id = 'fpContainer';
  container.innerHTML = buildProfileHTML(flight);
  document.body.appendChild(container);
  document.body.style.overflow = 'hidden';

  // Attach image error fallback (replaces unsafe inline onerror)
  container.querySelectorAll('.fp-aircraft-img').forEach(img => {
    img.addEventListener('error', function() {
      this.style.display = 'none';
      const fallback = this.parentElement.querySelector('.fp-aircraft-fallback');
      if (fallback) fallback.style.display = 'flex';
    });
  });

  const closeBtn = document.getElementById('fpClose');
  if (closeBtn) closeBtn.addEventListener('click', closeFlightProfile);

  // Bind deck tab clicks
  container.querySelectorAll('.fp-deck-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.dataset.deckIndex);
      container.querySelectorAll('.fp-deck-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
      container.querySelectorAll('.fp-deck-section').forEach((s, i) => s.classList.toggle('active', i === idx));
    });
  });

  // Bind seat clicks — Seat Inspector Modal
  const inspectorEl = document.getElementById('fpSeatInspector');
  if (inspectorEl) {
    const acCode = flight.aircraft_code || 'B789';
    container.querySelectorAll('.fp-seat').forEach(seatBtn => {
      seatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = seatBtn.dataset.row;
        const col = seatBtn.dataset.col;
        const quality = seatBtn.dataset.quality;
        const cabinClass = seatBtn.dataset.cabinClass;
        container.querySelectorAll('.fp-seat.selected').forEach(s => s.classList.remove('selected'));
        seatBtn.classList.add('selected');

        const seatEl = document.getElementById('fpDetailSeat');
        if (seatEl) seatEl.textContent = `${row}${col}`;
        const qualEl = document.getElementById('fpDetailQuality');
        if (qualEl) qualEl.textContent = seatBtn.dataset.label;

        const commentaryEl = document.getElementById('fpAvgeekCommentary');
        if (commentaryEl) commentaryEl.innerHTML = _getAvgeekCommentary(quality, cabinClass);

        _populateHardwareSection(cabinClass, acCode);

        const db = parseInt(seatBtn.dataset.noiseDb) || 70;
        const bar = document.getElementById('fpNoiseBar');
        if (bar) {
          bar.style.width = Math.min(100, ((db - 50) / 40) * 100) + '%';
          bar.style.background = _noiseColor(db);
        }
        const noiseDbEl = document.getElementById('fpNoiseDb');
        if (noiseDbEl) noiseDbEl.textContent = `${db}dB`;
        const noiseDescEl = document.getElementById('fpNoiseDesc');
        if (noiseDescEl) noiseDescEl.textContent = seatBtn.dataset.noiseDesc;
        const noiseRecEl = document.getElementById('fpNoiseRec');
        if (noiseRecEl) noiseRecEl.textContent = seatBtn.dataset.noiseRec;

        inspectorEl.classList.add('active');
      });
    });

    container.querySelectorAll('.fp-seat-grid').forEach(grid => {
      grid.addEventListener('click', (e) => {
        if (!e.target.closest('.fp-seat')) inspectorEl.classList.remove('active');
      });
    });
  }

  // ——— Tab switching ———
  let _globeInitialized = false;
  container.querySelectorAll('.fp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.tab;
      // Toggle tab button active states
      container.querySelectorAll('.fp-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      // Toggle panel visibility
      container.querySelectorAll('.fp-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tabPanel === idx));
      // Lazy-init globe when switching to routes tab
      if (idx === '2' && !_globeInitialized) {
        _globeInitialized = true;
        _initGlobeAsync(container, flight);
      }
    });
  });

  // ——— Segment sub-tab switching (multi-segment flights) ———
  container.querySelectorAll('.fp-seg-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const segIdx = btn.dataset.seg;
      container.querySelectorAll('.fp-seg-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      container.querySelectorAll('.fp-seg-id-panel').forEach(p => p.classList.toggle('active', p.dataset.segPanel === segIdx));
    });
  });

  requestAnimationFrame(() => {
    const overlay = document.getElementById('fpOverlay');
    const panel = document.getElementById('fpPanel');
    if (overlay) overlay.classList.add('active');
    if (panel) panel.classList.add('active');
    const closeBtn = document.getElementById('fpClose');
    if (closeBtn) closeBtn.focus();
    _bindSwipeToClose(panel);
  });
  activePanel = container;
}

// L2: Swipe-right-to-close gesture on mobile panels
function _bindSwipeToClose(panel) {
  if (!panel) return;
  let startX = 0;
  panel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });
  panel.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;
    if (dx > 80 && Math.abs(e.changedTouches[0].clientY - (e.changedTouches[0].clientY || startX)) < dx) {
      closeFlightProfile();
    }
  });
}

function closeFlightProfile() {
  // Dispose active Globe/WebGL context before removing DOM
  if (_activeGlobeInstance) {
    try {
      if (_activeGlobeInstance._renderer) {
        _activeGlobeInstance._renderer.dispose();
        _activeGlobeInstance._renderer.forceContextLoss();
      }
    } catch (_) { /* ignore disposal errors */ }
    _activeGlobeInstance = null;
  }
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
