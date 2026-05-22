// ============================================================
// flightService — unified data layer with feature toggle
// ============================================================
// ENABLE_REAL_API = false  → high-fidelity mock data (FlightAPI.io format)
// ENABLE_REAL_API = true   → real FlightAPI.io API calls
// ============================================================

import { getAirport } from './state.js';

// ——————————————————————————————————————————
// Feature Toggle
// ——————————————————————————————————————————
const ENABLE_REAL_API = false;

// Set your key when ready to switch to real API
const FLIGHT_API_KEY = 'PLACEHOLDER';
const FLIGHT_API_BASE = 'https://api.flightapi.io/onewaytrip';

// ——————————————————————————————————————————
// Airline / Airport pools for mock data
// ——————————————————————————————————————————
const MOCK_CARRIERS = [
  // International full-service
  { code: 'CX', name: '国泰航空', id: -32317 }, { code: 'SQ', name: '新加坡航空', id: -32318 },
  { code: 'KE', name: '大韩航空', id: -32319 }, { code: 'NH', name: '全日空', id: -32320 },
  { code: 'QF', name: '澳洲航空', id: -32321 }, { code: 'JL', name: '日本航空', id: -32322 },
  { code: 'EK', name: '阿联酋航空', id: -32323 }, { code: 'QR', name: '卡塔尔航空', id: -32324 },
  { code: 'TK', name: '土耳其航空', id: -32325 }, { code: 'EY', name: '阿提哈德航空', id: -32326 },
  { code: 'LH', name: '汉莎航空', id: -32327 }, { code: 'AF', name: '法国航空', id: -32328 },
  // Chinese carriers
  { code: 'CA', name: '中国国航', id: -32329 }, { code: 'CZ', name: '南方航空', id: -32330 },
  { code: 'MU', name: '东方航空', id: -32331 }, { code: 'HU', name: '海南航空', id: -32332 },
  { code: '3U', name: '四川航空', id: -32333 }, { code: 'MF', name: '厦门航空', id: -32334 },
  { code: 'ZH', name: '深圳航空', id: -32335 },
];

const WIDE_BODY = ['B789', 'B788', 'A359', 'A333', 'B77W', 'A388', 'A35K', 'B748'];
const NARROW_BODY = ['A320', 'A321', 'B738', 'B739', 'A20N', 'B38M'];

// ============================================================
//  AVIATION GEEK DATA — Aircraft Registry, Engines, Livery
// ============================================================

const AIRCRAFT_DB = {
  // Wide-body
  'A359': { manufacturer: '空客', model: 'A350-941', fullName: '空客 A350-900', seats: 300, layout: [3,3,3], rows: 34, cruiseAlt: 41000, cruiseMach: 0.85 },
  'A35K': { manufacturer: '空客', model: 'A350-1041', fullName: '空客 A350-1000', seats: 334, layout: [3,3,3], rows: 38, cruiseAlt: 41000, cruiseMach: 0.85 },
  'A333': { manufacturer: '空客', model: 'A330-343', fullName: '空客 A330-300', seats: 277, layout: [2,4,2], rows: 36, cruiseAlt: 39000, cruiseMach: 0.82 },
  'A388': { manufacturer: '空客', model: 'A380-841', fullName: '空客 A380-800', seats: 525, layout: [3,4,3], rows: 44, cruiseAlt: 43000, cruiseMach: 0.85 },
  'B789': { manufacturer: '波音', model: '787-9', fullName: '波音 787-9', seats: 290, layout: [3,3,3], rows: 33, cruiseAlt: 41000, cruiseMach: 0.85 },
  'B788': { manufacturer: '波音', model: '787-8', fullName: '波音 787-8', seats: 242, layout: [3,3,3], rows: 28, cruiseAlt: 41000, cruiseMach: 0.85 },
  'B77W': { manufacturer: '波音', model: '777-300ER', fullName: '波音 777-300ER', seats: 396, layout: [3,4,3], rows: 40, cruiseAlt: 39000, cruiseMach: 0.84 },
  'B748': { manufacturer: '波音', model: '747-8', fullName: '波音 747-8', seats: 467, layout: [3,4,3], rows: 40, cruiseAlt: 41000, cruiseMach: 0.855 },
  // Narrow-body
  'A320': { manufacturer: '空客', model: 'A320-214', fullName: '空客 A320-200', seats: 168, layout: [3,3], rows: 29, cruiseAlt: 36000, cruiseMach: 0.78 },
  'A321': { manufacturer: '空客', model: 'A321-231', fullName: '空客 A321-200', seats: 195, layout: [3,3], rows: 34, cruiseAlt: 36000, cruiseMach: 0.78 },
  'A20N': { manufacturer: '空客', model: 'A320-271N', fullName: '空客 A320neo', seats: 174, layout: [3,3], rows: 30, cruiseAlt: 38000, cruiseMach: 0.78 },
  'B738': { manufacturer: '波音', model: '737-800', fullName: '波音 737-800', seats: 172, layout: [3,3], rows: 30, cruiseAlt: 37000, cruiseMach: 0.785 },
  'B739': { manufacturer: '波音', model: '737-900ER', fullName: '波音 737-900ER', seats: 189, layout: [3,3], rows: 33, cruiseAlt: 37000, cruiseMach: 0.785 },
  'B38M': { manufacturer: '波音', model: '737 MAX 8', fullName: '波音 737 MAX 8', seats: 178, layout: [3,3], rows: 31, cruiseAlt: 38000, cruiseMach: 0.79 },
};

const ENGINE_DB = {
  'A359': '2x Rolls-Royce Trent XWB-84',
  'A35K': '2x Rolls-Royce Trent XWB-97',
  'A333': '2x Rolls-Royce Trent 772B-60',
  'A388': '4x Engine Alliance GP7270',
  'B789': '2x GE GEnx-1B74',
  'B788': '2x GE GEnx-1B70',
  'B77W': '2x GE90-115B',
  'B748': '4x GE GEnx-2B67',
  'A320': '2x CFM56-5B4',
  'A321': '2x CFM56-5B3',
  'A20N': '2x Pratt & Whitney PW1127G',
  'B738': '2x CFM56-7B27',
  'B739': '2x CFM56-7B27',
  'B38M': '2x CFM LEAP-1B28',
};

// Livery pool: 80% standard, 20% special
const LIVERY_POOL = {
  'CA': [
    { type: 'standard', name: '"墨镜侠"标准涂装', weight: 80 },
    { type: 'special', name: '🇨🇳 "中法建交"主题彩绘', weight: 10 },
    { type: 'special', name: '🐼 "天府四川"熊猫彩绘机', weight: 5 },
    { type: 'special', name: '🌸 "牡丹"国花彩绘', weight: 5 },
  ],
  'MU': [
    { type: 'standard', name: '"银燕"标准涂装', weight: 80 },
    { type: 'special', name: '🐱 "Hello Kitty"联名彩绘机', weight: 10 },
    { type: 'special', name: '🎨 "进博号"主题彩绘', weight: 10 },
  ],
  'CZ': [
    { type: 'standard', name: '"木棉"标准涂装', weight: 80 },
    { type: 'special', name: '🎨 "世园号"花卉彩绘', weight: 10 },
    { type: 'special', name: '✈️ "梦想之翼"787主题涂装', weight: 10 },
  ],
  'HU': [
    { type: 'standard', name: '"大鹏金翅"标准涂装', weight: 80 },
    { type: 'special', name: '🎬 "功夫熊猫"主题彩绘', weight: 15 },
    { type: 'special', name: '🏖️ "海南自贸港"主题彩绘', weight: 5 },
  ],
  'CX': [
    { type: 'standard', name: '"翘首振翅"标准涂装', weight: 80 },
    { type: 'special', name: '✈️ "寰宇一家"联盟特殊涂装', weight: 20 },
  ],
  'SQ': [
    { type: 'standard', name: '"金凤"标准涂装', weight: 85 },
    { type: 'special', name: '✈️ "星空联盟"联盟涂装', weight: 10 },
    { type: 'special', name: '🇸🇬 "SG50"国庆特别涂装', weight: 5 },
  ],
  'JL': [
    { type: 'standard', name: '"鹤丸"标准涂装', weight: 80 },
    { type: 'special', name: '✈️ "寰宇一家"联盟涂装', weight: 10 },
    { type: 'special', name: '🎮 "Pokémon"皮卡丘彩绘机', weight: 10 },
  ],
  'NH': [
    { type: 'standard', name: '"蓝色脉冲"标准涂装', weight: 75 },
    { type: 'special', name: '🤖 "Star Wars" R2-D2 彩绘机', weight: 10 },
    { type: 'special', name: '🐢 "ANA Green Jet"环保彩绘', weight: 10 },
    { type: 'special', name: '✈️ "星空联盟"联盟涂装', weight: 5 },
  ],
  'QF': [
    { type: 'standard', name: '"飞行袋鼠"标准涂装', weight: 80 },
    { type: 'special', name: '🦘 "Yam Dreaming"原住民艺术彩绘', weight: 15 },
    { type: 'special', name: '✈️ "寰宇一家"联盟涂装', weight: 5 },
  ],
  'EK': [
    { type: 'standard', name: '"土豪金"标准涂装', weight: 75 },
    { type: 'special', name: '🐪 "Expo 2020"世博主题彩绘', weight: 10 },
    { type: 'special', name: '⚽ "Real Madrid"皇马联名彩绘', weight: 10 },
    { type: 'special', name: '🌍 "United for Wildlife"保护动物彩绘', weight: 5 },
  ],
  'QR': [
    { type: 'standard', name: '"羚羊"标准涂装', weight: 80 },
    { type: 'special', name: '✈️ "寰宇一家"联盟涂装', weight: 10 },
    { type: 'special', name: '🏆 "FIFA World Cup"世界杯彩绘', weight: 10 },
  ],
};

// Default livery for airlines not in the pool
const DEFAULT_LIVERY = [
  { type: 'standard', name: '标准航空公司涂装', weight: 85 },
  { type: 'special', name: '✈️ 联盟特殊涂装', weight: 10 },
  { type: 'special', name: '🎨 城市主题彩绘', weight: 5 },
];

// Registration number generators by airline
function _generateRegistration(airlineCode, acCode) {
  const isWide = WIDE_BODY.includes(acCode);
  const patterns = {
    'CA': () => 'B-' + _pickRandom(['1083','2067','3015','5947','6073','7865','8491']) + (isWide ? '' : _pickRandom(['A','B','C'])),
    'MU': () => 'B-' + _pickRandom(['7365','8231','5943','3031','2008','6530','8972']),
    'CZ': () => 'B-' + _pickRandom(['6135','3085','5203','8361','1123','7280','3427']),
    'HU': () => 'B-' + _pickRandom(['5371','6512','2087','1738','5402','8013']),
    '3U': () => 'B-' + _pickRandom(['8601','3028','6325','1819','8959']),
    'MF': () => 'B-' + _pickRandom(['5301','2763','7815','1568','6483']),
    'ZH': () => 'B-' + _pickRandom(['6291','8402','1973','3185','5609']),
    'CX': () => _pickRandom(['B-H','B-L']) + _pickRandom(['QA','RA','XB','NF','MG','PH','RK','SL','TN']),
    'JL': () => 'JA' + _pickRandom(['801','812','827','835','843','859','867','874','889','893']) + 'J',
    'NH': () => 'JA' + _pickRandom(['801','815','830','845','858','863','877','884','896']) + 'A',
    'KE': () => 'HL' + _pickRandom(['8201','7633','7538','8003','8345','7582']),
    'SQ': () => '9V-S' + _pickRandom(['KA','LH','MJ','NB','PG','RJ','WL','YM','ZN']),
    'EK': () => 'A6-E' + _pickRandom(['OB','PB','QC','RD','SE','TF','UG','VH','WI']),
    'QR': () => 'A7-B' + _pickRandom(['AA','BC','CE','DG','EH','FI','GJ','HK','IL']),
    'QF': () => 'VH-Q' + _pickRandom(['PA','PB','PC','PD','PE','PF','PG']),
    'LH': () => 'D-AI' + _pickRandom(['MA','NB','OC','PD','QE','RF','SG']),
    'AF': () => 'F-HP' + _pickRandom(['AA','BB','CC','DD','EE','FF','GG']),
    'TK': () => 'TC-J' + _pickRandom(['NA','OB','PC','RD','SE','TF']),
    'EY': () => 'A6-E' + _pickRandom(['BA','CB','DC','ED','FE','GF']),
    'default': () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const prefix = _pickRandom(['N','G','F','HS','VT','PK','9M','B-','D-','EC','LV']);
      return prefix + _pickRandom(chars) + _pickRandom(chars) + _pickRandom(chars);
    },
  };
  const fn = patterns[airlineCode] || patterns['default'];
  return fn();
}

function _generateAircraftAge(acCode) {
  const r = Math.random();
  if (acCode.startsWith('A35') || acCode.startsWith('A20N') || acCode.startsWith('B38M')) {
    // New-gen aircraft: 0.3 - 5 years
    return (0.3 + Math.random() * 4.7).toFixed(1);
  } else if (acCode.startsWith('B78') || acCode.startsWith('A359')) {
    // Modern: 1 - 10 years
    return (1 + Math.random() * 9).toFixed(1);
  } else if (acCode.startsWith('A33') || acCode.startsWith('A32') || acCode.startsWith('B73') || acCode.startsWith('B77')) {
    // Older types: 3 - 18 years
    return (3 + Math.random() * 15).toFixed(1);
  }
  return (2 + Math.random() * 12).toFixed(1);
}

function _ageLabel(age) {
  const a = parseFloat(age);
  if (a < 1) return '全新机';
  if (a < 3) return '次新机';
  if (a < 8) return '青壮年机';
  if (a < 15) return '老当益壮';
  return '功勋老将';
}

function _generateLivery(airlineCode) {
  const pool = LIVERY_POOL[airlineCode] || DEFAULT_LIVERY;
  const total = pool.reduce((s, l) => s + l.weight, 0);
  let r = Math.random() * total;
  for (const livery of pool) {
    r -= livery.weight;
    if (r <= 0) return livery;
  }
  return pool[0];
}

function _generateTelemetry(acCode, routeDistance) {
  const ac = AIRCRAFT_DB[acCode] || { cruiseAlt: 37000, cruiseMach: 0.80 };
  const altVariation = Math.round((Math.random() - 0.5) * 4000);
  const altitude = ac.cruiseAlt + altVariation;
  const mach = (ac.cruiseMach + (Math.random() - 0.5) * 0.04).toFixed(2);
  const headwind = Math.round(Math.random() * 80 - 20);
  const flightHours = (routeDistance / (parseFloat(mach) * 1065)).toFixed(1);
  return {
    altitude: `${altitude.toLocaleString()} ft`,
    mach: `Mach ${mach}`,
    groundSpeed: `${Math.round(parseFloat(mach) * 661)} kts`,
    headwind: headwind > 0 ? `逆风 ${headwind} kts` : `顺风 ${Math.abs(headwind)} kts`,
    estFlightTime: `${flightHours}h`,
  };
}

function _generateRecentLogs(origin, dest, dateStr) {
  const routes = [
    { from: 'CDG', to: 'PEK', fromName: '巴黎戴高乐', toName: '北京首都' },
    { from: 'LHR', to: 'PVG', fromName: '伦敦希思罗', toName: '上海浦东' },
    { from: 'NRT', to: 'CAN', fromName: '东京成田', toName: '广州白云' },
    { from: 'HKG', to: 'SIN', fromName: '香港国际', toName: '新加坡樟宜' },
    { from: 'DXB', to: 'ICN', fromName: '迪拜国际', toName: '首尔仁川' },
    { from: 'LAX', to: 'HND', fromName: '洛杉矶国际', toName: '东京羽田' },
    { from: 'FRA', to: 'BKK', fromName: '法兰克福', toName: '曼谷素万那普' },
    { from: 'SFO', to: 'SYD', fromName: '旧金山国际', toName: '悉尼金斯福德' },
  ];
  const targetDate = new Date(dateStr + 'T00:00:00');
  const recent = [];
  const usedRoutes = new Set();

  for (let i = 0; i < 3; i++) {
    const route = _pickRandom(routes.filter(r => !usedRoutes.has(r.from + r.to)));
    usedRoutes.add(route.from + route.to);
    const logDate = new Date(targetDate);
    logDate.setDate(logDate.getDate() - (i + 1) * Math.round(1 + Math.random() * 3));
    recent.push({
      date: _fmtDate(logDate),
      from: route.from,
      fromName: route.fromName,
      to: route.to,
      toName: route.toName,
      flightNo: _pickRandom(['CA', 'MU', 'CZ', 'CX', 'JL', 'NH', 'SQ']) + (100 + Math.floor(Math.random() * 900)),
      duration: `${Math.round(6 + Math.random() * 12)}h${String(Math.floor(Math.random() * 60)).padStart(2,'0')}m`,
    });
  }
  return recent;
}

// Hub airports used for layovers when generating connecting flights
const HUB_AIRPORTS = ['HKG', 'ICN', 'NRT', 'SIN', 'PVG', 'CAN', 'BKK', 'DXB', 'DOH', 'HND'];

function _pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ——————————————————————————————————————————
// Price simulation: days-ahead + weekend multiplier
// ——————————————————————————————————————————
function _simulateBasePrice(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const daysAhead = Math.max(1, Math.round((target - now) / 86400000));

  let urgency = 1.0;
  if (daysAhead < 3) urgency = 2.5;
  else if (daysAhead < 7) urgency = 1.8;
  else if (daysAhead < 14) urgency = 1.4;
  else if (daysAhead < 30) urgency = 1.15;
  else if (daysAhead < 60) urgency = 0.85;
  else if (daysAhead < 90) urgency = 0.95;
  else urgency = 1.1;

  const weekend = (target.getDay() === 5 || target.getDay() === 6) ? 1.25 : 1.0;
  return { base: 2800 + Math.random() * 1500, urgency, weekend };
}

// ——————————————————————————————————————————
// Core: generate mock FlightAPI.io-format response
// ——————————————————————————————————————————
function generateMockFlightAPIResponse(origin, dest, dateStr) {
  const priceFactors = _simulateBasePrice(dateStr);
  const routeDistance = _estimateDistance(origin, dest);

  // Determine how many airlines to use (8-12)
  const shuffled = _shuffle(MOCK_CARRIERS);
  const usedCarriers = shuffled.slice(0, 8 + Math.floor(Math.random() * 5));

  // Build places, carriers, agents maps
  const placesMap = new Map();
  const carriersMap = new Map();
  const agentsMap = new Map();

  // Add origin & dest places
  const originAirport = getAirport(origin);
  const destAirport = getAirport(dest);
  const _addPlace = (code, name) => {
    const id = Math.abs(_hashCode(code)) % 90000 + 10000;
    if (!placesMap.has(code)) placesMap.set(code, { id, code, name: name || code, type: 'Airport' });
    return placesMap.get(code);
  };
  _addPlace(origin, originAirport?.name || origin);
  _addPlace(dest, destAirport?.name || dest);

  // Add hub places
  HUB_AIRPORTS.forEach(h => _addPlace(h, h));

  // Add carriers
  usedCarriers.forEach(c => carriersMap.set(c.code, { id: c.id, code: c.code, name: c.name }));

  // Add a dummy agent
  agentsMap.set('kiwi', { id: 'kiwi', name: 'Kiwi.com', url: 'https://www.kiwi.com' });

  // Generate itineraries
  const itineraries = [];
  const legs = [];
  const segments = [];
  let itineraryIdx = 0;

  for (const carrier of usedCarriers) {
    const mult = priceFactors.urgency * priceFactors.weekend * (0.78 + Math.random() * 0.44);
    const price = Math.round((priceFactors.base * mult) / 10) * 10; // round to 10

    // 40% chance direct, 60% one stop
    const stops = Math.random() < 0.4 ? 0 : 1;

    // Pick layover if has stop
    let layoverCode = null;
    if (stops > 0) {
      const candidateHubs = _shuffle(HUB_AIRPORTS).filter(h => h !== origin && h !== dest);
      layoverCode = candidateHubs[0] || 'HKG';
      _addPlace(layoverCode, layoverCode);
    }

    // Assign aircraft code
    const acCode = _guessAircraft(carrier.code, stops);

    // Generate departure/arrival times
    const baseDepHour = stops === 0
      ? _pickRandom([0, 1, 7, 8, 15, 16, 22, 23])
      : _pickRandom([7, 8, 9, 10, 14, 15, 20, 21]);
    const depMinute = _pickRandom([0, 15, 30, 45]);

    // Total flight duration depends on distance and stops
    const directMinutes = Math.round(routeDistance / 800 * 60) + 30;
    const layoverMinutes = stops > 0 ? 60 + Math.floor(Math.random() * 180) : 0;
    const totalMinutes = directMinutes + (stops > 0 ? directMinutes * 0.5 : 0) + layoverMinutes;

    const depDateTime = new Date(dateStr + 'T00:00:00');
    depDateTime.setHours(baseDepHour, depMinute, 0, 0);
    const arrDateTime = new Date(depDateTime.getTime() + totalMinutes * 60000);

    // Build segment(s)
    const legSegmentIds = [];

    if (stops === 0) {
      // Direct flight: 1 segment = 1 leg
      const segId = _makeSegId(origin, dest, depDateTime, arrDateTime, carrier.id);
      segments.push({
        id: segId,
        origin_place_id: placesMap.get(origin).id,
        destination_place_id: placesMap.get(dest).id,
        departure: _iso(depDateTime),
        arrival: _iso(arrDateTime),
        duration: totalMinutes,
        marketing_flight_number: String(100 + Math.floor(Math.random() * 900)),
        marketing_carrier_id: carrier.id,
        operating_carrier_id: carrier.id,
        mode: 'flight',
        _aircraft_code: acCode,
      });
      legSegmentIds.push(segId);

      legs.push({
        id: _makeLegId(origin, dest, depDateTime, arrDateTime, carrier.id, 0),
        origin_place_id: placesMap.get(origin).id,
        destination_place_id: placesMap.get(dest).id,
        departure: _iso(depDateTime),
        arrival: _iso(arrDateTime),
        segment_ids: legSegmentIds,
        duration: totalMinutes,
        stop_count: 0,
        marketing_carrier_ids: [carrier.id],
        operating_carrier_ids: [carrier.id],
        stop_ids: [],
        _aircraft_code: acCode,
      });
    } else {
      // One stop: 2 segments, 1 leg
      const seg1Minutes = Math.round(directMinutes * 0.55);
      const seg2Minutes = totalMinutes - layoverMinutes - seg1Minutes;

      const seg1Arr = new Date(depDateTime.getTime() + seg1Minutes * 60000);
      const seg2Dep = new Date(seg1Arr.getTime() + layoverMinutes * 60000);
      const seg2Arr = new Date(seg2Dep.getTime() + seg2Minutes * 60000);

      // Segment 1
      const seg1Id = _makeSegId(origin, layoverCode, depDateTime, seg1Arr, carrier.id);
      segments.push({
        id: seg1Id,
        origin_place_id: placesMap.get(origin).id,
        destination_place_id: placesMap.get(layoverCode).id,
        departure: _iso(depDateTime),
        arrival: _iso(seg1Arr),
        duration: seg1Minutes,
        marketing_flight_number: String(100 + Math.floor(Math.random() * 900)),
        marketing_carrier_id: carrier.id,
        operating_carrier_id: carrier.id,
        mode: 'flight',
        _aircraft_code: acCode,
      });
      legSegmentIds.push(seg1Id);

      // Segment 2
      const seg2Id = _makeSegId(layoverCode, dest, seg2Dep, seg2Arr, carrier.id);
      segments.push({
        id: seg2Id,
        origin_place_id: placesMap.get(layoverCode).id,
        destination_place_id: placesMap.get(dest).id,
        departure: _iso(seg2Dep),
        arrival: _iso(seg2Arr),
        duration: seg2Minutes,
        marketing_flight_number: String(100 + Math.floor(Math.random() * 900)),
        marketing_carrier_id: carrier.id,
        operating_carrier_id: carrier.id,
        mode: 'flight',
        _aircraft_code: acCode,
      });
      legSegmentIds.push(seg2Id);

      legs.push({
        id: _makeLegId(origin, dest, depDateTime, seg2Arr, carrier.id, 1),
        origin_place_id: placesMap.get(origin).id,
        destination_place_id: placesMap.get(dest).id,
        departure: _iso(depDateTime),
        arrival: _iso(seg2Arr),
        segment_ids: legSegmentIds,
        duration: totalMinutes,
        stop_count: 1,
        marketing_carrier_ids: [carrier.id],
        operating_carrier_ids: [carrier.id],
        stop_ids: [[placesMap.get(layoverCode).id]],
        _aircraft_code: acCode,
      });
    }

    // Build itinerary
    const legId = legs[legs.length - 1].id;
    const pricingId = _shortId();
    const segIds = [...legSegmentIds];

    itineraries.push({
      id: `${itineraryIdx}-${dateStr.replace(/-/g, '')}-${origin}-${dest}-${carrier.id}`,
      leg_ids: [legId],
      _aircraft_code: acCode,
      pricing_options: [{
        id: pricingId,
        agent_ids: ['kiwi'],
        price: {
          amount: price,
          update_status: 'current',
          last_updated: new Date().toISOString(),
          quote_age: 120 + Math.floor(Math.random() * 600),
        },
        unpriced_type: '',
        items: [{
          agent_id: 'kiwi',
          url: `https://www.kiwi.com/deep?from=${origin}&to=${dest}&date=${dateStr}`,
          segment_ids: segIds,
          price: {
            amount: price,
            update_status: 'current',
            last_updated: new Date().toISOString(),
            quote_age: 120 + Math.floor(Math.random() * 600),
          },
          booking_proposition: 'PBOOK',
          transfer_protection: '',
          max_redirect_age: 10,
          fares: segIds.map(sid => ({
            segment_id: sid,
            fare_basis_code: _randomFareBasis(),
            booking_code: _pickRandom(['Y', 'B', 'M', 'H', 'Q', 'K', 'L', 'Z']),
            fare_family: 'ECONOMY',
          })),
          opaque_id: String(-1000000000 - Math.floor(Math.random() * 999999999)),
          booking_metadata: { metadata_set: '', signature: '' },
          ticket_attributes: [],
          flight_attributes: [],
        }],
        transfer_type: 'MANAGED',
        score: Math.round((100 - price / 100) * 10) / 10,
        pricing_option_fare: {
          attribute_labels: [],
          leg_details: {},
          brand_names: [],
        },
      }],
    });

    itineraryIdx++;
  }

  // Sort itineraries by price (lowest first)
  itineraries.sort((a, b) =>
    a.pricing_options[0].price.amount - b.pricing_options[0].price.amount
  );

  return {
    status: 0,
    msg: 'success',
    searchNo: _shortId() + _shortId(),
    itineraries,
    legs,
    segments,
    places: Array.from(placesMap.values()),
    carriers: Array.from(carriersMap.values()),
    agents: Array.from(agentsMap.values()),
    // Extra metadata
    all_airlines: usedCarriers.map(c => c.code),
    flights_checked: itineraries.length,
    _results: itineraries.length,
    _distance: routeDistance,
  };
}

// ——————————————————————————————————————————
// Real FlightAPI.io API call (when toggle ON)
// ——————————————————————————————————————————
async function fetchRealFlightAPI(origin, dest, dateStr) {
  const url = `${FLIGHT_API_BASE}/${FLIGHT_API_KEY}/${origin}/${dest}/${dateStr}/1/0/0/Economy/CNY`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`FlightAPI.io HTTP ${resp.status}: ${resp.statusText}`);
  }
  return resp.json();
}

// ——————————————————————————————————————————
// Data Adapter: FlightAPI.io format → our app format
// ——————————————————————————————————————————
function adaptFlightAPIResponse(apiData, origin, dest, dateStr) {
  const { itineraries = [], legs = [], segments = [], places = [], carriers = [], agents = [] } = apiData;
  const routeDistance = apiData._distance || _estimateDistance(origin, dest);

  // Build lookup maps
  const placeById = new Map(places.map(p => [p.id, p]));
  const carrierById = new Map(carriers.map(c => [c.id, c]));
  const segmentById = new Map(segments.map(s => [s.id, s]));
  const legById = new Map(legs.map(l => [l.id, l]));

  const prices = [];

  for (const itin of itineraries) {
    const firstPricing = itin.pricing_options?.[0];
    if (!firstPricing) continue;

    const firstItem = firstPricing.items?.[0];
    const primaryLeg = legById.get(itin.leg_ids?.[0]);

    if (!primaryLeg) continue;

    const legSegments = (primaryLeg.segment_ids || [])
      .map(sid => segmentById.get(sid))
      .filter(Boolean);

    const mainCarrierId = primaryLeg.marketing_carrier_ids?.[0];
    const mainCarrier = carrierById.get(mainCarrierId);

    // Build segment objects in our internal format
    const segObjs = legSegments.map(seg => {
      const segOrigin = placeById.get(seg.origin_place_id);
      const segDest = placeById.get(seg.destination_place_id);
      const segCarrier = carrierById.get(seg.marketing_carrier_id);
      return {
        aircraft: seg._aircraft_code || _guessAircraft(segCarrier?.code || '', primaryLeg.stop_count),
        flight_no: seg.marketing_flight_number || '',
        airline: segCarrier?.code || '',
        departure: _fmtTimeOnly(seg.departure),
        arrival: _fmtTimeOnly(seg.arrival),
        origin: segOrigin?.code || '',
        destination: segDest?.code || '',
      };
    });

    // Layover info
    let layoverAirport = '';
    let layoverDuration = '';
    if (primaryLeg.stop_count > 0 && legSegments.length >= 2) {
      const firstArr = legSegments[0]?.arrival;
      const secondDep = legSegments[1]?.departure;
      layoverAirport = placeById.get(legSegments[0]?.destination_place_id)?.code || '';

      if (firstArr && secondDep) {
        const gapMin = (_parseISO(secondDep) - _parseISO(firstArr)) / 60000;
        const h = Math.floor(gapMin / 60);
        const m = Math.floor(gapMin % 60);
        layoverDuration = `${h}h${String(m).padStart(2, '0')}m`;
      }
    }

    // Departure / Arrival times
    const firstSeg = legSegments[0];
    const lastSeg = legSegments[legSegments.length - 1];

    // Duration
    const durMin = primaryLeg.duration || 0;
    const durH = Math.floor(durMin / 60);
    const durM = Math.floor(durMin % 60);

    // Aircraft — use the code attached to the itinerary/leg/segment
    const acCode = itin._aircraft_code || primaryLeg._aircraft_code || legSegments[0]?._aircraft_code || _guessAircraft(mainCarrier?.code || '', primaryLeg.stop_count);
    const acType = _classifyAircraftType(acCode);

    // ============ AVIATION GEEK DATA INJECTION ============
    const acInfo = AIRCRAFT_DB[acCode] || { manufacturer: '制造商', model: acCode, fullName: acCode, seats: 200, layout: [3,3], rows: 25, cruiseAlt: 37000, cruiseMach: 0.80 };
    const registration = _generateRegistration(mainCarrier?.code || 'CA', acCode);
    const aircraftAge = _generateAircraftAge(acCode);
    const livery = _generateLivery(mainCarrier?.code || 'CA');
    const engines = ENGINE_DB[acCode] || '2x 涡扇发动机';
    const telemetry = _generateTelemetry(acCode, routeDistance);
    const recentLogs = _generateRecentLogs(origin, dest, dateStr);

    prices.push({
      price: firstPricing.price?.amount ?? firstItem?.price?.amount ?? 0,
      currency: 'CNY',
      stops: primaryLeg.stop_count || 0,
      airline: mainCarrier?.code || '',
      airline_name: mainCarrier?.name || '',
      departure: _fmtTimeOnly(firstSeg?.departure),
      arrival: _fmtTimeOnly(lastSeg?.arrival),
      duration: `${durH}h${String(durM).padStart(2, '0')}m`,
      layover_airport: layoverAirport,
      layover_duration: layoverDuration,
      aircraft_code: acCode,
      aircraft_type: acType,
      origin,
      dest,
      segments: segObjs,
      source: 'FlightAPI.io',
      deep_link: firstItem?.url || '',
      booking_token: itin.id || '',
      // —— Geek data fields ——
      geek: {
        registration,
        exactModel: acInfo.fullName,
        modelCode: acInfo.model,
        manufacturer: acInfo.manufacturer,
        aircraftAge: `${aircraftAge}年`,
        ageLabel: _ageLabel(aircraftAge),
        liveryName: livery.name,
        liveryType: livery.type,
        engines,
        seatCount: acInfo.seats,
        seatLayout: acInfo.layout,
        seatRows: acInfo.rows,
        telemetry,
        recentLogs,
      },
    });
  }

  prices.sort((a, b) => a.price - b.price);

  return {
    prices,
    date: dateStr,
    origin,
    dest,
    mode: ENABLE_REAL_API ? 'live' : 'mock',
    source: ENABLE_REAL_API ? 'FlightAPI.io' : 'Mock (FlightAPI.io format)',
  };
}

// ——————————————————————————————————————————
// Date Range Adapter: aggregate daily responses
// ——————————————————————————————————————————
function adaptDateRangeResults(dailyResults, origin, dest) {
  const results = [];

  for (const day of dailyResults) {
    const adapted = adaptFlightAPIResponse(day.apiData, origin, dest, day.date);
    const prices = adapted.prices || [];

    if (prices.length > 0) {
      const best = prices[0]; // already sorted low→high
      results.push({
        date: day.date,
        lowest: best.price,
        offers: prices.length,
        best: {
          airline: best.airline,
          airline_name: best.airline_name,
          price: best.price,
          stops: best.stops,
          departure: best.departure,
          arrival: best.arrival,
          duration: best.duration,
          layover_airport: best.layover_airport,
          layover_duration: best.layover_duration,
          aircraft_code: best.aircraft_code,
          aircraft_type: best.aircraft_type,
          segments: best.segments,
          geek: best.geek,
        },
      });
    } else {
      results.push({
        date: day.date,
        lowest: null,
        offers: 0,
        best: null,
      });
    }
  }

  return {
    results,
    origin,
    dest,
    mode: ENABLE_REAL_API ? 'live' : 'mock',
  };
}

// ——————————————————————————————————————————
// PUBLIC API — returns app-format data directly
// ——————————————————————————————————————————

/**
 * Get flights for a single date.
 * Returns: { prices: [...], date, origin, dest, mode, source }
 */
export async function getFlights(origin, dest, date) {
  let apiData;
  if (ENABLE_REAL_API) {
    apiData = await fetchRealFlightAPI(origin, dest, date);
  } else {
    apiData = generateMockFlightAPIResponse(origin, dest, date);
  }
  return adaptFlightAPIResponse(apiData, origin, dest, date);
}

/**
 * Get price trend for a date range.
 * Returns: { results: [{date, lowest, offers, best}], origin, dest, mode }
 */
export async function getDateRange(origin, dest, startDate, days) {
  const start = new Date(startDate + 'T00:00:00');
  const dailyResults = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = _fmtDate(d);

    let apiData;
    if (ENABLE_REAL_API) {
      apiData = await fetchRealFlightAPI(origin, dest, dateStr);
    } else {
      apiData = generateMockFlightAPIResponse(origin, dest, dateStr);
    }
    dailyResults.push({ date: dateStr, apiData });
  }

  return adaptDateRangeResults(dailyResults, origin, dest);
}

/**
 * Expose toggle state so the UI can display source info.
 */
export function isRealAPIEnabled() {
  return ENABLE_REAL_API;
}

// ——————————————————————————————————————————
// Internal helpers
// ——————————————————————————————————————————

function _hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function _iso(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function _fmtDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function _fmtTimeOnly(isoStr) {
  if (!isoStr) return '';
  const t = isoStr.split('T')[1] || '';
  return t.slice(0, 5); // HH:MM
}

function _parseISO(isoStr) {
  if (!isoStr) return 0;
  return new Date(isoStr).getTime();
}

function _makeSegId(from, to, dep, arr, carrierId) {
  return `${from}-${to}-${_fmtCompact(dep)}-${_fmtCompact(arr)}--${carrierId}`;
}

function _makeLegId(from, to, dep, arr, carrierId, stops) {
  return `${from}-${to}-${_fmtCompact(dep)}-${stops}-${_fmtCompact(arr)}--${carrierId}`;
}

function _fmtCompact(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function _shortId() {
  return Math.random().toString(36).slice(2, 12);
}

function _randomFareBasis() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const first = _pickRandom(letters);
  const rest = Array.from({ length: 6 }, () => _pickRandom(letters + '0123456789')).join('');
  return first + rest;
}

function _estimateDistance(from, to) {
  // Coarse distance estimates for major city pairs (km)
  const key = [from, to].sort().join('-');
  const estimates = {
    'PEK-SYD': 8950, 'PVG-SYD': 7850, 'CAN-SYD': 7500,
    'PEK-HND': 2100, 'PEK-NRT': 2100, 'PVG-HND': 1800,
    'PEK-HKG': 2000, 'PVG-HKG': 1250, 'PEK-SIN': 4500,
    'PEK-LHR': 8150, 'PEK-LAX': 10000, 'PEK-JFK': 11000,
    'PEK-BKK': 3300, 'PVG-BKK': 2900, 'PEK-DXB': 5900,
    'PEK-ICN': 950, 'PVG-ICN': 850,
  };
  return estimates[key] || 5000 + Math.abs(_hashCode(from + to)) % 5000;
}

function _guessAircraft(carrierCode, stops) {
  // Wide-body for long-haul, narrow-body for short-haul with stop
  if (stops > 0) return _pickRandom([...WIDE_BODY, ...NARROW_BODY]);
  return _pickRandom(WIDE_BODY);
}

function _classifyAircraftType(code) {
  if (!code) return '未知';
  const widePrefixes = ['A33', 'A34', 'A35', 'A38', 'B74', 'B76', 'B77', 'B78',
    '330', '340', '350', '380', '747', '767', '777', '787'];
  for (const p of widePrefixes) {
    if (code.startsWith(p)) return '大型机';
  }
  return '中型机';
}
