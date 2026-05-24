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

// —— Per-carrier fleet maps (source: planespotters.net 2025–2026) ——
const AIRLINE_WIDEBODY = {
  'CA': ['A359','A333','A332','B789','B77W','B748'], 'CZ': ['A359','A333','B789','B788','B77W'],
  'MU': ['A359','A332','A333','B789','B77W'],          'HU': ['A359','A333','B789','B788'],
  '3U': ['A359','A332'],                                'MF': ['B789','B788'],
  'ZH': [],  'EK': ['A388','B77W','A359'],              'QR': ['A359','A35K','A388','B77W','B789','B788'],
  'EY': ['A35K','A388','B77W','B789','A333'],           'SQ': ['A359','A35K','A388','B77W'],
  'CX': ['A359','A35K','A333','B77W'],                  'QF': ['A388','B789','A333'],
  'JL': ['A359','A35K','B789','B788','B77W'],           'NH': ['A388','B789','B788','B77W'],
  'KE': ['A359','A388','A333','B789','B77W','B748'],    'OZ': ['A359','A388','A333','B77W'],
  'LH': ['A359','A35K','A388','A333','B748','B789'],    'AF': ['A359','B77W','B789'],
  'BA': ['A35K','A388','B788','B789','B77W'],           'TK': ['A359','A35K','A333','B789','B77W'],
  'TR': ['B788','B789'], 'PR': ['A359','A333','B77W'],  'MH': ['A359','A333'],
  '5J': ['A333'],        'TN': ['B789'],                'NZ': ['B789','B77W'],
  'VN': ['A359','B789'], 'TG': ['A359','A333','B789','B788','B77W'],
  'BR': ['B789','B788','B77W','A333'],  'CI': ['A359','A333','B77W'],
  'GA': ['A333','B77W'],                'ET': ['A359','A35K','B789','B788','B77W'],
  'SA': ['A333'], 'KQ': ['B788'],       'MS': ['A333','B789'],
  'AT': ['B788','B789'],                'DL': ['A359','A333'],
  'UA': ['B789','B788','B77W'],         'AA': ['B789','B788','B77W'],
  'AC': ['B789','B788','B77W','A333'],  'LA': ['B789','B788'],
  'AD': ['A333'], 'CM': [],             'AM': ['B789','B788'],
  'AK': [], 'D7': ['A333'],             'FJ': ['A333'],
  'HA': ['A333','B789'],                'KL': ['B77W','B789','B78X','A333'],
  'VA': [], 'JQ': ['B788'],             'FM': [],
};
const AIRLINE_NARROWBODY = {
  'CA': ['A320','A321','A20N','B738','B38M'], 'CZ': ['A320','A321','A20N','B738','B38M'],
  'MU': ['A320','A321','A20N','B738','B38M'], 'HU': ['A20N','A321','B738','B38M'],
  '3U': ['A320','A321','A20N'],               'MF': ['B738','B38M','A20N'],
  'ZH': ['A320','A321','A20N','B738','B38M'], 'EK': [], 'QR': ['A320','A321','B38M'],
  'EY': ['A320','A321'], 'SQ': ['B38M','B738'], 'CX': ['A321'], 'QF': ['B738'],
  'JL': ['B738','B38M'], 'NH': ['A320','A321','A20N','B738'],
  'KE': ['A321','B738','B739'], 'OZ': ['A321'], 'LH': ['A320','A321','A20N'],
  'AF': ['A320','A321'],     'BA': ['A320','A321'],  'TK': ['A320','A321','B738','B38M'],
  'TR': ['A320','A20N'], 'PR': ['A320','A321'], 'MH': ['B738'], '5J': ['A320','A20N'],
  'TN': [], 'NZ': ['A320','A321'], 'VN': ['A320','A321','A20N'],
  'TG': ['A320'], 'BR': ['A321','A333'], 'CI': ['A321','B738'],
  'GA': ['B738'], 'ET': ['B738','B38M'], 'SA': ['A320'], 'KQ': ['B738'],
  'MS': ['B738','A320'], 'AT': ['B738'], 'DL': ['A320','A321','B738','B739'],
  'UA': ['A320','A321','B738','B739','B38M'], 'AA': ['A320','A321','B738','B38M'],
  'AC': ['A320','A321','B738','B38M'], 'LA': ['A320','A321'], 'AD': ['A320','A20N'],
  'CM': ['B738','B38M'], 'AM': ['B738','B38M'], 'AK': ['A320','A20N'],
  'D7': ['A333'], 'FJ': ['B738','B38M'], 'HA': ['A321','A20N'],
  'KL': ['B738','B739'], 'VA': ['B738','B38M'], 'JQ': ['A320','A321','A20N'],
  'FM': ['B738','B38M'],
};
// Legacy global pools (kept for backward compatibility with carrier-agnostic code)
const WIDE_BODY = ['B789','B788','A359','A333','B77W','A388','A35K','B748'];
const NARROW_BODY = ['A320','A321','B738','B739','A20N','B38M'];

// ============================================================
//  AVIATION GEEK DATA — Aircraft Registry, Engines, Livery
// ============================================================

const AIRCRAFT_DB = {
  // Wide-body
  'A359': { manufacturer: '空客', model: 'A350-941', fullName: '空客 A350-900', seats: 300, layout: [3,3,3], rows: 34, cruiseAlt: 41000, cruiseMach: 0.85, rangeKm: 15000 },
  'A35K': { manufacturer: '空客', model: 'A350-1041', fullName: '空客 A350-1000', seats: 334, layout: [3,3,3], rows: 38, cruiseAlt: 41000, cruiseMach: 0.85, rangeKm: 16100 },
  'A332': { manufacturer: '空客', model: 'A330-243', fullName: '空客 A330-200', seats: 246, layout: [2,4,2], rows: 32, cruiseAlt: 39000, cruiseMach: 0.82, rangeKm: 13450 },
  'A333': { manufacturer: '空客', model: 'A330-343', fullName: '空客 A330-300', seats: 277, layout: [2,4,2], rows: 36, cruiseAlt: 39000, cruiseMach: 0.82, rangeKm: 11750 },
  'A388': { manufacturer: '空客', model: 'A380-841', fullName: '空客 A380-800', seats: 525, layout: [3,4,3], rows: 44, cruiseAlt: 43000, cruiseMach: 0.85, rangeKm: 15200 },
  'B78X': { manufacturer: '波音', model: '787-10', fullName: '波音 787-10', seats: 318, layout: [3,3,3], rows: 36, cruiseAlt: 40000, cruiseMach: 0.85, rangeKm: 11730 },
  'B789': { manufacturer: '波音', model: '787-9', fullName: '波音 787-9', seats: 290, layout: [3,3,3], rows: 33, cruiseAlt: 41000, cruiseMach: 0.85, rangeKm: 14140 },
  'B788': { manufacturer: '波音', model: '787-8', fullName: '波音 787-8', seats: 242, layout: [3,3,3], rows: 28, cruiseAlt: 41000, cruiseMach: 0.85, rangeKm: 13620 },
  'B77W': { manufacturer: '波音', model: '777-300ER', fullName: '波音 777-300ER', seats: 396, layout: [3,4,3], rows: 40, cruiseAlt: 39000, cruiseMach: 0.84, rangeKm: 13650 },
  'B748': { manufacturer: '波音', model: '747-8', fullName: '波音 747-8', seats: 467, layout: [3,4,3], rows: 40, cruiseAlt: 41000, cruiseMach: 0.855, rangeKm: 14320 },
  // Narrow-body
  'A320': { manufacturer: '空客', model: 'A320-214', fullName: '空客 A320-200', seats: 168, layout: [3,3], rows: 29, cruiseAlt: 36000, cruiseMach: 0.78, rangeKm: 6150 },
  'A321': { manufacturer: '空客', model: 'A321-231', fullName: '空客 A321-200', seats: 195, layout: [3,3], rows: 34, cruiseAlt: 36000, cruiseMach: 0.78, rangeKm: 5950 },
  'A20N': { manufacturer: '空客', model: 'A320-271N', fullName: '空客 A320neo', seats: 174, layout: [3,3], rows: 30, cruiseAlt: 38000, cruiseMach: 0.78, rangeKm: 6500 },
  'B738': { manufacturer: '波音', model: '737-800', fullName: '波音 737-800', seats: 172, layout: [3,3], rows: 30, cruiseAlt: 37000, cruiseMach: 0.785, rangeKm: 5765 },
  'B739': { manufacturer: '波音', model: '737-900ER', fullName: '波音 737-900ER', seats: 189, layout: [3,3], rows: 33, cruiseAlt: 37000, cruiseMach: 0.785, rangeKm: 5925 },
  'B38M': { manufacturer: '波音', model: '737 MAX 8', fullName: '波音 737 MAX 8', seats: 178, layout: [3,3], rows: 31, cruiseAlt: 38000, cruiseMach: 0.79, rangeKm: 6570 },
};

const ENGINE_DB = {
  'A359': '2x Rolls-Royce Trent XWB-84',
  'A35K': '2x Rolls-Royce Trent XWB-97',
  'A332': '2x Rolls-Royce Trent 772B-60',
  'A333': '2x Rolls-Royce Trent 772B-60',
  'A388': '4x Engine Alliance GP7270',
  'B78X': '2x GE GEnx-1B76',
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
  const totalMinutes = Math.round(routeDistance / (parseFloat(mach) * 1065) * 60);
  const flightH = Math.floor(totalMinutes / 60);
  const flightM = totalMinutes % 60;
  return {
    altitude: `${altitude.toLocaleString()} ft`,
    mach: `Mach ${mach}`,
    groundSpeed: `${Math.round(parseFloat(mach) * 661)} kts`,
    headwind: headwind > 0 ? `逆风 ${headwind} kts` : `顺风 ${Math.abs(headwind)} kts`,
    estFlightTime: `${flightH}h${String(flightM).padStart(2, '0')}m`,
  };
}

function _generateRecentLogs(origin, dest, dateStr, carrierCode) {
  // Build a pool of realistic routes for this specific carrier based on its hub
  const hub = AIRLINE_HUBS[carrierCode];
  const secHub = AIRLINE_SECONDARY_HUBS[carrierCode];
  const targetDate = new Date(dateStr + 'T00:00:00');

  // Routes that make sense for this carrier (involve its hub)
  let carrierRoutes;
  if (hub) {
    const majorDestinations = [
      { code: 'LHR', name: '伦敦希思罗' }, { code: 'CDG', name: '巴黎戴高乐' },
      { code: 'FRA', name: '法兰克福' }, { code: 'JFK', name: '纽约肯尼迪' },
      { code: 'LAX', name: '洛杉矶国际' }, { code: 'SYD', name: '悉尼金斯福德' },
      { code: 'SIN', name: '新加坡樟宜' }, { code: 'BKK', name: '曼谷素万那普' },
      { code: 'NRT', name: '东京成田' }, { code: 'HND', name: '东京羽田' },
      { code: 'ICN', name: '首尔仁川' }, { code: 'DXB', name: '迪拜国际' },
      { code: 'DOH', name: '多哈哈马德' }, { code: 'IST', name: '伊斯坦布尔' },
      { code: 'HKG', name: '香港国际' }, { code: 'PEK', name: '北京首都' },
      { code: 'PVG', name: '上海浦东' }, { code: 'CAN', name: '广州白云' },
      { code: 'CTU', name: '成都天府' }, { code: 'XMN', name: '厦门高崎' },
      { code: 'SZX', name: '深圳宝安' },
    ];
    // Generate routes radiating from the hub
    carrierRoutes = majorDestinations
      .filter(d => d.code !== hub)
      .map(d => ({
        from: hub,
        to: d.code,
        fromName: getAirport(hub)?.name || hub,
        toName: d.name,
      }));
    // Add some routes radiating from secondary hub
    if (secHub) {
      const secRoutes = majorDestinations
        .filter(d => d.code !== secHub && d.code !== hub)
        .slice(0, 5)
        .map(d => ({
          from: secHub,
          to: d.code,
          fromName: getAirport(secHub)?.name || secHub,
          toName: d.name,
        }));
      carrierRoutes.push(...secRoutes);
    }
  } else {
    // Fallback generic routes
    carrierRoutes = [
      { from: 'CDG', to: 'PEK', fromName: '巴黎戴高乐', toName: '北京首都' },
      { from: 'LHR', to: 'PVG', fromName: '伦敦希思罗', toName: '上海浦东' },
      { from: 'NRT', to: 'CAN', fromName: '东京成田', toName: '广州白云' },
      { from: 'HKG', to: 'SIN', fromName: '香港国际', toName: '新加坡樟宜' },
      { from: 'DXB', to: 'ICN', fromName: '迪拜国际', toName: '首尔仁川' },
      { from: 'LAX', to: 'HND', fromName: '洛杉矶国际', toName: '东京羽田' },
      { from: 'FRA', to: 'BKK', fromName: '法兰克福', toName: '曼谷素万那普' },
      { from: 'SFO', to: 'SYD', fromName: '旧金山国际', toName: '悉尼金斯福德' },
    ];
  }

  const recent = [];
  const usedKeys = new Set();
  const shuffled = _shuffle(carrierRoutes);

  for (let i = 0; i < 3 && i < shuffled.length; i++) {
    const route = shuffled[i];
    const key = route.from + '-' + route.to;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);

    const logDate = new Date(targetDate);
    logDate.setDate(logDate.getDate() - (i + 1) * Math.round(1 + Math.random() * 3));
    recent.push({
      date: _fmtDate(logDate),
      from: route.from,
      fromName: route.fromName,
      to: route.to,
      toName: route.toName,
      flightNo: carrierCode + _genFlightNumber(route.from, route.to),
      duration: `${Math.round(6 + Math.random() * 12)}h${String(Math.floor(Math.random() * 60)).padStart(2,'0')}m`,
    });
  }

  // If we don't have 3 logs yet, add a couple of return trips
  while (recent.length < 3) {
    const route = shuffled[recent.length + 3] || shuffled[0];
    const swapped = {
      from: route.to, to: route.from,
      fromName: route.toName, toName: route.fromName,
    };
    const logDate = new Date(targetDate);
    logDate.setDate(logDate.getDate() - (recent.length + 1) * 3);
    recent.push({
      date: _fmtDate(logDate),
      from: swapped.from,
      fromName: swapped.fromName,
      to: swapped.to,
      toName: swapped.toName,
      flightNo: carrierCode + _genFlightNumber(swapped.from, swapped.to),
      duration: `${Math.round(6 + Math.random() * 12)}h${String(Math.floor(Math.random() * 60)).padStart(2,'0')}m`,
    });
  }

  return recent;
}

// ——— Airline primary hubs — each carrier's home base for international connections ———
const AIRLINE_HUBS = {
  // Foreign carriers — connections route through their home country base
  'EK': 'DXB',   // Emirates → Dubai
  'SQ': 'SIN',   // Singapore Airlines → Singapore Changi
  'QR': 'DOH',   // Qatar Airways → Doha
  'CX': 'HKG',   // Cathay Pacific → Hong Kong
  'TK': 'IST',   // Turkish Airlines → Istanbul
  'EY': 'AUH',   // Etihad → Abu Dhabi
  'QF': 'SYD',   // Qantas → Sydney
  'JL': 'HND',   // Japan Airlines → Tokyo Haneda
  'NH': 'NRT',   // ANA → Tokyo Narita
  'KE': 'ICN',   // Korean Air → Seoul Incheon
  'LH': 'FRA',   // Lufthansa → Frankfurt
  'AF': 'CDG',   // Air France → Paris CDG
  // Chinese carriers — international connections route through home base
  'CA': 'PEK',   // Air China → Beijing Capital
  'CZ': 'CAN',   // China Southern → Guangzhou
  'MU': 'PVG',   // China Eastern → Shanghai Pudong
  'HU': 'PEK',   // Hainan Airlines → Beijing Capital (primary hub)
  '3U': 'CTU',   // Sichuan Airlines → Chengdu
  'MF': 'XMN',   // Xiamen Airlines → Xiamen
  'ZH': 'SZX',   // Shenzhen Airlines → Shenzhen
};

// Secondary hubs — used when primary hub == origin or dest
const AIRLINE_SECONDARY_HUBS = {
  'CA': 'CTU',   // Air China also hubs at Chengdu
  'CZ': 'PKX',   // China Southern also hubs at Beijing Daxing
  'MU': 'XIY',   // China Eastern also hubs at Xi'an
  'HU': 'HAK',   // Hainan Airlines also hubs at Haikou
  'QF': 'MEL',   // Qantas also hubs at Melbourne
  'JL': 'NRT',   // JL secondary at Narita
  'NH': 'HND',   // NH secondary at Haneda
  'LH': 'MUC',   // Lufthansa secondary at Munich
  'KE': 'PUS',   // Korean Air secondary at Busan
};

// Mainland China airports (for domestic vs international detection)
const CHINA_AIRPORTS = new Set([
  'PEK','PKX','PVG','SHA','CAN','SZX','TFU','CTU','CKG','HGH',
  'XIY','WUH','NKG','KMG','CSX','XMN','TAO','DLC','TSN','CGO',
  'SYX','HAK','HRB','SHE','FOC','KWE','NNG','URC','LHW','TYN',
  'HET','SJW','TNA','CGQ','KHN','HFE','KWL','WNZ','NGB','WEH',
  'YNT','WUX','LYI','LJG','JHG','DYG','DOY',
]);

// ——— Fixed aircraft assignments for iconic routes ———
// Map `${origin}-${dest}` → { airline, flightNo, aircraft }
const FIXED_AIRCRAFT_ROUTES = {
  // === China ↔ USA ===
  'PEK-JFK': { airline:'CA', flightNo:'CA981', aircraft:'B748' },
  'JFK-PEK': { airline:'CA', flightNo:'CA982', aircraft:'B748' },
  'PEK-LAX': { airline:'CA', flightNo:'CA983', aircraft:'B77W' },
  'LAX-PEK': { airline:'CA', flightNo:'CA984', aircraft:'B77W' },
  'PEK-SFO': { airline:'CA', flightNo:'CA985', aircraft:'B77W' },
  'SFO-PEK': { airline:'CA', flightNo:'CA986', aircraft:'B77W' },
  'PVG-JFK': { airline:'MU', flightNo:'MU587', aircraft:'B77W' },
  'JFK-PVG': { airline:'MU', flightNo:'MU588', aircraft:'B77W' },
  'PVG-LAX': { airline:'MU', flightNo:'MU583', aircraft:'B77W' },
  'LAX-PVG': { airline:'MU', flightNo:'MU586', aircraft:'B77W' },
  'PVG-SFO': { airline:'MU', flightNo:'MU589', aircraft:'B77W' },
  'SFO-PVG': { airline:'MU', flightNo:'MU590', aircraft:'B77W' },
  'CAN-JFK': { airline:'CZ', flightNo:'CZ699', aircraft:'B77W' },
  'JFK-CAN': { airline:'CZ', flightNo:'CZ600', aircraft:'B77W' },
  'CAN-LAX': { airline:'CZ', flightNo:'CZ327', aircraft:'B77W' },
  'LAX-CAN': { airline:'CZ', flightNo:'CZ328', aircraft:'B77W' },
  'CAN-SFO': { airline:'CZ', flightNo:'CZ657', aircraft:'B77W' },
  'SFO-CAN': { airline:'CZ', flightNo:'CZ658', aircraft:'B77W' },
  'SZX-LAX': { airline:'CA', flightNo:'CA769', aircraft:'B77W' },
  'LAX-SZX': { airline:'CA', flightNo:'CA770', aircraft:'B77W' },
  'FOC-JFK': { airline:'MF', flightNo:'MF849', aircraft:'B789' },
  'JFK-FOC': { airline:'MF', flightNo:'MF850', aircraft:'B789' },
  'CTU-LAX': { airline:'3U', flightNo:'3U3837', aircraft:'A359' },
  'LAX-CTU': { airline:'3U', flightNo:'3U3838', aircraft:'A359' },
  // === China ↔ Europe ===
  'PEK-LHR': { airline:'CA', flightNo:'CA855', aircraft:'B77W' },
  'LHR-PEK': { airline:'CA', flightNo:'CA856', aircraft:'B77W' },
  'PVG-LHR': { airline:'MU', flightNo:'MU551', aircraft:'B77W' },
  'LHR-PVG': { airline:'MU', flightNo:'MU552', aircraft:'B77W' },
  'PEK-CDG': { airline:'CA', flightNo:'CA933', aircraft:'B77W' },
  'CDG-PEK': { airline:'CA', flightNo:'CA934', aircraft:'B77W' },
  'PVG-CDG': { airline:'MU', flightNo:'MU553', aircraft:'B77W' },
  'CDG-PVG': { airline:'MU', flightNo:'MU554', aircraft:'B77W' },
  'PEK-FRA': { airline:'CA', flightNo:'CA931', aircraft:'B77W' },
  'FRA-PEK': { airline:'CA', flightNo:'CA932', aircraft:'B77W' },
  'PVG-FRA': { airline:'MU', flightNo:'MU219', aircraft:'B77W' },
  'FRA-PVG': { airline:'MU', flightNo:'MU220', aircraft:'B77W' },
  // === China ↔ Oceania ===
  'PEK-SYD': { airline:'CA', flightNo:'CA173', aircraft:'B789' },
  'SYD-PEK': { airline:'CA', flightNo:'CA174', aircraft:'B789' },
  'PVG-SYD': { airline:'MU', flightNo:'MU561', aircraft:'A359' },
  'SYD-PVG': { airline:'MU', flightNo:'MU562', aircraft:'A359' },
  'CAN-SYD': { airline:'CZ', flightNo:'CZ301', aircraft:'A359' },
  'SYD-CAN': { airline:'CZ', flightNo:'CZ302', aircraft:'A359' },
  'PEK-MEL': { airline:'CA', flightNo:'CA165', aircraft:'A359' },
  'MEL-PEK': { airline:'CA', flightNo:'CA166', aircraft:'A359' },
  // === China ↔ Middle East ===
  'PEK-DXB': { airline:'EK', flightNo:'EK307', aircraft:'A388' },
  'DXB-PEK': { airline:'EK', flightNo:'EK308', aircraft:'A388' },
  'PVG-DXB': { airline:'EK', flightNo:'EK303', aircraft:'A388' },
  'DXB-PVG': { airline:'EK', flightNo:'EK304', aircraft:'A388' },
  'PEK-DOH': { airline:'QR', flightNo:'QR893', aircraft:'A359' },
  'DOH-PEK': { airline:'QR', flightNo:'QR892', aircraft:'A359' },
  'PVG-DOH': { airline:'QR', flightNo:'QR871', aircraft:'A359' },
  'DOH-PVG': { airline:'QR', flightNo:'QR870', aircraft:'A359' },
  // === China ↔ East Asia ===
  'PEK-HND': { airline:'CA', flightNo:'CA925', aircraft:'A359' },
  'HND-PEK': { airline:'CA', flightNo:'CA926', aircraft:'A359' },
  'PVG-HND': { airline:'MU', flightNo:'MU537', aircraft:'A333' },
  'HND-PVG': { airline:'MU', flightNo:'MU538', aircraft:'A333' },
  'PEK-ICN': { airline:'CA', flightNo:'CA123', aircraft:'A359' },
  'ICN-PEK': { airline:'CA', flightNo:'CA124', aircraft:'A359' },
  'PVG-ICN': { airline:'MU', flightNo:'MU5033', aircraft:'A333' },
  'ICN-PVG': { airline:'MU', flightNo:'MU5034', aircraft:'A333' },
  'PEK-HKG': { airline:'CA', flightNo:'CA109', aircraft:'A359' },
  'HKG-PEK': { airline:'CA', flightNo:'CA110', aircraft:'A359' },
  'PVG-HKG': { airline:'MU', flightNo:'MU501', aircraft:'A333' },
  'HKG-PVG': { airline:'MU', flightNo:'MU502', aircraft:'A333' },
  'PEK-SIN': { airline:'CA', flightNo:'CA969', aircraft:'A359' },
  'SIN-PEK': { airline:'CA', flightNo:'CA970', aircraft:'A359' },
  'PVG-SIN': { airline:'MU', flightNo:'MU567', aircraft:'A333' },
  'SIN-PVG': { airline:'MU', flightNo:'MU568', aircraft:'A333' },
  // === Transpacific (non-China) ===
  'HND-JFK': { airline:'JL', flightNo:'JL6', aircraft:'A35K' },
  'JFK-HND': { airline:'JL', flightNo:'JL5', aircraft:'A35K' },
  'HND-LAX': { airline:'NH', flightNo:'NH106', aircraft:'B789' },
  'LAX-HND': { airline:'NH', flightNo:'NH105', aircraft:'B789' },
  'NRT-JFK': { airline:'JL', flightNo:'JL4', aircraft:'B77W' },
  'JFK-NRT': { airline:'JL', flightNo:'JL3', aircraft:'B77W' },
  'ICN-JFK': { airline:'KE', flightNo:'KE81', aircraft:'B748' },
  'JFK-ICN': { airline:'KE', flightNo:'KE82', aircraft:'B748' },
  'ICN-LAX': { airline:'KE', flightNo:'KE17', aircraft:'B77W' },
  'LAX-ICN': { airline:'KE', flightNo:'KE18', aircraft:'B77W' },
  'HKG-JFK': { airline:'CX', flightNo:'CX830', aircraft:'A35K' },
  'JFK-HKG': { airline:'CX', flightNo:'CX831', aircraft:'A35K' },
  'HKG-LAX': { airline:'CX', flightNo:'CX880', aircraft:'A35K' },
  'LAX-HKG': { airline:'CX', flightNo:'CX881', aircraft:'A35K' },
  'HKG-LHR': { airline:'CX', flightNo:'CX251', aircraft:'A35K' },
  'LHR-HKG': { airline:'CX', flightNo:'CX252', aircraft:'A35K' },
  'SIN-JFK': { airline:'SQ', flightNo:'SQ24', aircraft:'A359' },
  'JFK-SIN': { airline:'SQ', flightNo:'SQ23', aircraft:'A359' },
  'SIN-LAX': { airline:'SQ', flightNo:'SQ36', aircraft:'A359' },
  'LAX-SIN': { airline:'SQ', flightNo:'SQ35', aircraft:'A359' },
  'SIN-LHR': { airline:'SQ', flightNo:'SQ322', aircraft:'A388' },
  'LHR-SIN': { airline:'SQ', flightNo:'SQ321', aircraft:'A388' },
  'DXB-JFK': { airline:'EK', flightNo:'EK203', aircraft:'A388' },
  'JFK-DXB': { airline:'EK', flightNo:'EK204', aircraft:'A388' },
  'DXB-LAX': { airline:'EK', flightNo:'EK215', aircraft:'A388' },
  'LAX-DXB': { airline:'EK', flightNo:'EK216', aircraft:'A388' },
  'DXB-LHR': { airline:'EK', flightNo:'EK1', aircraft:'A388' },
  'LHR-DXB': { airline:'EK', flightNo:'EK2', aircraft:'A388' },
  'DOH-JFK': { airline:'QR', flightNo:'QR703', aircraft:'A35K' },
  'JFK-DOH': { airline:'QR', flightNo:'QR704', aircraft:'A35K' },
  'DOH-LAX': { airline:'QR', flightNo:'QR739', aircraft:'A35K' },
  'LAX-DOH': { airline:'QR', flightNo:'QR740', aircraft:'A35K' },
  'SYD-LAX': { airline:'QF', flightNo:'QF11', aircraft:'A388' },
  'LAX-SYD': { airline:'QF', flightNo:'QF12', aircraft:'A388' },
  'SYD-LHR': { airline:'QF', flightNo:'QF1', aircraft:'B789' },
  'LHR-SYD': { airline:'QF', flightNo:'QF2', aircraft:'B789' },
  'MEL-LAX': { airline:'QF', flightNo:'QF93', aircraft:'B789' },
  'LAX-MEL': { airline:'QF', flightNo:'QF94', aircraft:'B789' },
};

// ——— Real direct international airport pairs ———
// Valid `${origin}-${dest}` pairs that actually have nonstop flights
const _DIRECT_PAIRS = new Set();
(function _initDirectPairs() {
  const p = (from, toList) => { for (const t of toList) { _DIRECT_PAIRS.add(from+'-'+t); _DIRECT_PAIRS.add(t+'-'+from); } };
  // China → USA (only these airports have nonstop flights)
  p('PEK', ['JFK','LAX','SFO','EWR','ORD','IAD','BOS','SEA']);
  p('PVG', ['JFK','LAX','SFO','EWR','ORD','SEA','DFW','DTW']);
  p('CAN', ['JFK','LAX','SFO']);
  p('SZX', ['LAX']);
  p('FOC', ['JFK']);
  p('CTU', ['LAX','SFO']);
  // China → Europe
  p('PEK', ['LHR','CDG','FRA','MUC','AMS','MAD','FCO','ZRH','SVO','IST']);
  p('PVG', ['LHR','CDG','FRA','MUC','AMS','MAD','FCO','ZRH','IST']);
  p('CAN', ['LHR','CDG','FRA','AMS','IST']);
  p('SZX', ['LHR','CDG','FRA','MAD']);
  p('CKG', ['LHR','CDG','FRA']);
  p('XIY', ['LHR','CDG']);
  p('CSX', ['LHR']);
  p('CTU', ['LHR','FRA','IST']);
  p('TAO', ['LHR','FRA']);
  p('XMN', ['AMS','CDG']);
  // China → Oceania
  p('PEK', ['SYD','MEL','AKL']);
  p('PVG', ['SYD','MEL','AKL','BNE']);
  p('CAN', ['SYD','MEL','AKL','BNE']);
  p('SZX', ['SYD','MEL']);
  p('CTU', ['SYD','MEL']);
  p('XMN', ['SYD','MEL']);
  p('CKG', ['SYD']);
  p('TAO', ['SYD']);
  // China → Middle East
  p('PEK', ['DXB','DOH','AUH','IST']);
  p('PVG', ['DXB','DOH','AUH','IST']);
  p('CAN', ['DXB','DOH','IST']);
  p('SZX', ['DXB','DOH']);
  p('CTU', ['DXB','DOH','IST']);
  p('CKG', ['DXB','DOH']);
  p('HGH', ['DOH']);
  // China → East/SE Asia (abundant routes)
  p('PEK', ['HND','NRT','KIX','CTS','FUK','ICN','HKG','SIN','BKK','DMK','KUL','SGN','HAN','MNL','CGK','DPS','TPE','DEL']);
  p('PVG', ['HND','NRT','KIX','CTS','FUK','ICN','HKG','SIN','BKK','DMK','KUL','SGN','HAN','MNL','CGK','DPS','TPE','DEL']);
  p('CAN', ['HND','NRT','KIX','ICN','HKG','SIN','BKK','KUL','SGN','HAN','MNL','CGK','DPS','TPE','DEL']);
  p('SZX', ['NRT','KIX','ICN','HKG','SIN','BKK','KUL','SGN','HAN','TPE']);
  p('CTU', ['NRT','KIX','ICN','HKG','SIN','BKK','KUL','SGN','HAN']);
  p('CKG', ['NRT','ICN','HKG','SIN','BKK','KUL']);
  p('XMN', ['NRT','KIX','ICN','HKG','SIN','BKK','KUL','TPE']);
  p('TAO', ['NRT','KIX','ICN','HKG','SIN','BKK']);
  p('DLC', ['NRT','KIX','ICN']);
  p('SHE', ['NRT','ICN']);
  p('HAK', ['SIN','BKK','KUL']);
  p('KMG', ['BKK','KUL','SGN','HAN']);
  p('WUH', ['NRT','ICN','HKG','SIN','BKK']);
  p('HGH', ['NRT','KIX','ICN','HKG','SIN','BKK']);
  // Major inter-hub routes (non-China endpoints)
  p('HND', ['JFK','LAX','SFO','ORD','LHR','CDG','FRA','SYD','SIN','BKK','ICN','HKG','DXB','DOH']);
  p('NRT', ['JFK','LAX','SFO','ORD','LHR','CDG','FRA','SYD','SIN','BKK','ICN','HKG','DXB','DOH']);
  p('ICN', ['JFK','LAX','SFO','ORD','LHR','CDG','FRA','SYD','SIN','BKK','HKG','DXB','DOH']);
  p('HKG', ['JFK','LAX','SFO','ORD','LHR','CDG','FRA','SYD','MEL','SIN','BKK','ICN','DXB','DOH','TPE','DEL']);
  p('SIN', ['JFK','LAX','SFO','LHR','CDG','FRA','SYD','MEL','AKL','BKK','HKG','ICN','DXB','DOH','DEL','BOM','IST']);
  p('BKK', ['LHR','CDG','FRA','SYD','MEL','SIN','HKG','ICN','DXB','DOH','DEL','IST']);
  p('DXB', ['JFK','LAX','SFO','ORD','LHR','CDG','FRA','SYD','MEL','AKL','SIN','BKK','HKG','ICN','DOH','DEL','BOM','IST']);
  p('DOH', ['JFK','LAX','SFO','ORD','LHR','CDG','FRA','SYD','MEL','AKL','SIN','BKK','HKG','ICN','DXB','DEL','BOM','IST']);
  p('SYD', ['JFK','LAX','SFO','LHR','CDG','FRA','SIN','BKK','HKG','ICN','DXB','DOH','AKL','NRT','HND','DEL']);
  p('LHR', ['JFK','LAX','SFO','ORD','BOS','MIA','DXB','DOH','SIN','HKG','ICN','HND','SYD','SIN','DEL','BOM','IST']);
  p('JFK', ['LHR','CDG','FRA','MUC','AMS','MAD','FCO','ZRH','IST','DXB','DOH','HND','NRT','ICN','HKG','SIN','SYD','GRU']);
  p('LAX', ['LHR','CDG','FRA','AMS','IST','DXB','DOH','HND','NRT','ICN','HKG','SIN','SYD','MEL','AKL','GRU']);
  p('SFO', ['LHR','CDG','FRA','AMS','IST','DXB','DOH','HND','NRT','ICN','HKG','SIN','SYD','MEL','AKL']);
})();

function _hasDirectFlight(origin, dest) {
  return _DIRECT_PAIRS.has(origin + '-' + dest);
}

function _getFixedRoute(origin, dest) {
  return FIXED_AIRCRAFT_ROUTES[origin + '-' + dest] || null;
}

function _pickTransitHub(origin, dest, carrierCode) {
  const hub = AIRLINE_HUBS[carrierCode];
  const secHub = AIRLINE_SECONDARY_HUBS[carrierCode];
  const originIsChina = CHINA_AIRPORTS.has(origin);
  const destIsChina = CHINA_AIRPORTS.has(dest);

  const _canConnect = (h) => {
    if (h === origin || h === dest) return false;
    const leg1Valid = (originIsChina && CHINA_AIRPORTS.has(h)) || _hasDirectFlight(origin, h);
    const leg2Valid = (destIsChina && CHINA_AIRPORTS.has(h)) || _hasDirectFlight(h, dest);
    return leg1Valid && leg2Valid;
  };

  const candidates = [];
  if (hub && _canConnect(hub)) candidates.push(hub);
  if (secHub && _canConnect(secHub)) candidates.push(secHub);

  const majorHubs = ['PEK','PVG','CAN','HKG','ICN','NRT','HND','SIN','DXB','DOH','BKK'];
  for (const h of majorHubs) {
    if (!candidates.includes(h) && _canConnect(h)) candidates.push(h);
  }

  if (candidates.length > 0) return _pickRandom(candidates);
  return hub || 'HKG';
}

function _isInternationalRoute(origin, dest) {
  // Route crosses country borders if both endpoints aren't in mainland China
  return !(CHINA_AIRPORTS.has(origin) && CHINA_AIRPORTS.has(dest));
}

// Flight number convention: domestic = 4-digit, international = 1–3 digit
function _genFlightNumber(origin, dest) {
  const isDomestic = CHINA_AIRPORTS.has(origin) && CHINA_AIRPORTS.has(dest);
  if (isDomestic) {
    return String(1000 + Math.floor(Math.random() * 9000));
  }
  // International: 1–3 digits, weighted toward 2-3 digits
  const len = Math.random();
  if (len < 0.15) return String(Math.floor(Math.random() * 9) + 1);       // 1-digit: 1–9
  if (len < 0.35) return String(Math.floor(Math.random() * 90) + 10);     // 2-digit: 10–99
  return String(Math.floor(Math.random() * 900) + 100);                    // 3-digit: 100–999
}

// Fallback hubs for carriers not in AIRLINE_HUBS
const FALLBACK_HUBS = ['HKG', 'ICN', 'NRT', 'SIN', 'PVG', 'CAN', 'BKK', 'DXB', 'DOH', 'HND'];

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

  // Filter carriers by route type
  const isIntl = _isInternationalRoute(origin, dest);
  let availableCarriers;
  if (isIntl) {
    // International routes: only carriers with widebody fleet can operate long-haul
    availableCarriers = _shuffle(MOCK_CARRIERS.filter(c =>
      (AIRLINE_WIDEBODY[c.code] || []).length > 0
    ));
  } else {
    // Domestic routes: only Chinese carriers
    const chineseCodes = new Set(['CA','CZ','MU','HU','3U','MF','ZH']);
    availableCarriers = _shuffle(MOCK_CARRIERS.filter(c => chineseCodes.has(c.code)));
  }
  const usedCarriers = availableCarriers.slice(0, 8 + Math.floor(Math.random() * 5));

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

    // Determine stops based on airline hub geography
    let stops = 0;
    let layoverCode = null;
    const hub = AIRLINE_HUBS[carrier.code];
    const secHub = AIRLINE_SECONDARY_HUBS[carrier.code];

    if (isIntl && hub) {
      const involvesChina = CHINA_AIRPORTS.has(origin) || CHINA_AIRPORTS.has(dest);

      if (involvesChina && !_hasDirectFlight(origin, dest)) {
        // No real direct flight on this China-international route → force transit
        stops = 1;
        layoverCode = _pickTransitHub(origin, dest, carrier.code);
      } else if (hub === origin || hub === dest) {
        // Airline's home base is already on the route — direct flight
        stops = 0;
      } else if (secHub && (secHub === origin || secHub === dest)) {
        // Secondary hub is on the route — direct flight
        stops = 0;
      } else {
        // Route doesn't touch airline's hub — 80% connect through primary hub
        if (Math.random() < 0.8) {
          stops = 1;
          layoverCode = hub;
        } else {
          // 20% direct (fifth-freedom, codeshare, or secondary hub)
          stops = 0;
        }
      }
    } else if (!isIntl && hub) {
      // Domestic route — 30% chance of one-stop through a Chinese hub
      if (Math.random() < 0.3) {
        const domesticHubs = ['PEK','PVG','CAN','CTU','XMN','SZX','CKG','XIY'];
        const candidates = domesticHubs.filter(h => h !== origin && h !== dest);
        if (candidates.length > 0) {
          stops = 1;
          layoverCode = _pickRandom(candidates);
        }
      }
    } else {
      // No hub data — fallback random hub selection
      if (Math.random() < 0.4) {
        const candidateHubs = _shuffle(FALLBACK_HUBS).filter(h => h !== origin && h !== dest);
        if (candidateHubs.length > 0) {
          stops = 1;
          layoverCode = candidateHubs[0];
        }
      }
    }

    // Register layover airport as a place (use proper name from database)
    if (layoverCode) {
      const layoverAirport = getAirport(layoverCode);
      _addPlace(layoverCode, layoverAirport?.name || layoverCode);
    }

    // Assign aircraft code — check fixed route for this carrier first
    const fixedRoute = stops === 0 ? _getFixedRoute(origin, dest) : null;
    const useFixed = fixedRoute && fixedRoute.airline === carrier.code;
    const acCode = useFixed ? fixedRoute.aircraft : _guessAircraft(carrier.code, stops);

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
        marketing_flight_number: useFixed ? fixedRoute.flightNo : _genFlightNumber(origin, dest),
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
        marketing_flight_number: _genFlightNumber(origin, layoverCode),
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
        marketing_flight_number: _genFlightNumber(layoverCode, dest),
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
      const acCode = seg._aircraft_code || _guessAircraft(segCarrier?.code || '', primaryLeg.stop_count);
      // Per-segment distance: real great-circle distance for each leg
      const segDist = _estimateDistance(segOrigin?.code || '', segDest?.code || '');
      const acRange = (AIRCRAFT_DB[acCode] || {}).rangeKm || 8000;
      const rangePct = acRange > 0 ? Math.round(segDist / acRange * 100) : 0;
      return {
        aircraft: acCode,
        flight_no: seg.marketing_flight_number || '',
        airline: segCarrier?.code || '',
        departure: _fmtTimeOnly(seg.departure),
        arrival: _fmtTimeOnly(seg.arrival),
        origin: segOrigin?.code || '',
        destination: segDest?.code || '',
        distance_km: segDist,
        range_pct: rangePct,
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
    const recentLogs = _generateRecentLogs(origin, dest, dateStr, mainCarrier?.code || '');

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
  const dateTasks = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = _fmtDate(d);

    if (ENABLE_REAL_API) {
      dateTasks.push(
        fetchRealFlightAPI(origin, dest, dateStr).then(apiData => ({ date: dateStr, apiData }))
      );
    } else {
      dateTasks.push(
        Promise.resolve({ date: dateStr, apiData: generateMockFlightAPIResponse(origin, dest, dateStr) })
      );
    }
  }

  const dailyResults = await Promise.all(dateTasks);
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

// —— Airport coordinate dictionary for accurate great-circle distances ——
const _AIRPORT_COORDS = {
  // East Asia — China
  PEK: [ 40.08, 116.58], PKX: [ 39.51, 116.41], PVG: [ 31.14, 121.81],
  SHA: [ 31.20, 121.34], CAN: [ 23.39, 113.30], SZX: [ 22.64, 113.81],
  CTU: [ 30.58, 103.95], CKG: [ 29.72, 106.64], HGH: [ 30.23, 120.43],
  XIY: [ 34.44, 108.75], WUH: [ 30.78, 114.21], NKG: [ 31.74, 118.86],
  KMG: [ 25.10, 102.94], HAK: [ 19.93, 110.46], XMN: [ 24.54, 118.13],
  TAO: [ 36.27, 120.37], DLC: [ 38.97, 121.54], TSN: [ 39.12, 117.35],
  CGO: [ 34.52, 113.84], SYX: [ 18.30, 109.41], SHE: [ 41.64, 123.48],
  URC: [ 43.91,  87.47], TNA: [ 36.86, 117.22], FOC: [ 25.93, 119.66],
  // East Asia — Japan / Korea / Taiwan
  HND: [ 35.55, 139.78], NRT: [ 35.76, 140.39], KIX: [ 34.43, 135.23],
  CTS: [ 42.78, 141.69], FUK: [ 33.59, 130.45], ICN: [ 37.46, 126.44],
  TPE: [ 25.08, 121.23], KHH: [ 22.58, 120.35],
  // Southeast Asia
  SIN: [  1.36, 103.99], BKK: [ 13.68, 100.75], DMK: [ 13.91, 100.61],
  HKG: [ 22.31, 113.91], KUL: [  2.75, 101.71], SGN: [ 10.82, 106.65],
  HAN: [ 21.22, 105.81], MNL: [ 14.51, 121.02], CGK: [ -6.13, 106.66],
  DPS: [ -8.75, 115.17],
  // South Asia / Middle East
  DEL: [ 28.57,  77.10], BOM: [ 19.09,  72.87], DXB: [ 25.25,  55.36],
  DOH: [ 25.27,  51.61], AUH: [ 24.43,  54.65], IST: [ 41.26,  28.74],
  // Europe
  LHR: [ 51.47,  -0.46], CDG: [ 49.01,   2.55], FRA: [ 50.03,   8.57],
  MUC: [ 48.35,  11.79], AMS: [ 52.31,   4.77], MAD: [ 40.47,  -3.56],
  FCO: [ 41.80,  12.25], ZRH: [ 47.46,   8.55], SVO: [ 55.97,  37.41],
  // North America
  LAX: [ 33.94,-118.41], SFO: [ 37.62,-122.38], JFK: [ 40.64, -73.78],
  EWR: [ 40.69, -74.17], ORD: [ 41.98, -87.91], YVR: [ 49.19,-123.18],
  YYZ: [ 43.68, -79.63], IAH: [ 29.99, -95.34], MIA: [ 25.80, -80.29],
  ATL: [ 33.64, -84.43], BOS: [ 42.36, -71.01], SEA: [ 47.45,-122.31],
  // Oceania
  SYD: [-33.95, 151.18], MEL: [-37.67, 144.84], AKL: [-37.01, 174.79],
  BNE: [-27.38, 153.12],
  // South America / Africa
  GRU: [-23.44, -46.47], CPT: [-33.97,  18.60], JNB: [-26.14,  28.24],
  ADD: [  8.98,  38.80], NBO: [ -1.32,  36.93], CAI: [ 30.12,  31.41],
};

function _haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _estimateDistance(from, to) {
  // Real great-circle distance between two airport codes
  const c1 = _AIRPORT_COORDS[from];
  const c2 = _AIRPORT_COORDS[to];
  if (c1 && c2) return Math.round(_haversineKm(c1[0], c1[1], c2[0], c2[1]));
  // Fallback: conservative estimate for unknown airport pairs
  return 4000 + Math.abs(_hashCode(from + to)) % 6000;
}

function _guessAircraft(carrierCode, stops) {
  const wideList = AIRLINE_WIDEBODY[carrierCode] || [];
  const narrowList = AIRLINE_NARROWBODY[carrierCode] || [];

  if (stops > 0) {
    // Multi-stop: can be either wide or narrow, prefer carrier's own fleet
    const pool = [...(wideList.length ? wideList : Object.values(AIRLINE_WIDEBODY).flat()),
                  ...(narrowList.length ? narrowList : Object.values(AIRLINE_NARROWBODY).flat())];
    return _pickRandom(pool);
  }
  // Non-stop: prefer widebody from carrier's own fleet
  if (wideList.length) return _pickRandom(wideList);
  // Fallback: any widebody
  const allWide = Object.values(AIRLINE_WIDEBODY).flat();
  return _pickRandom(allWide.length ? allWide : WIDE_BODY);
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
