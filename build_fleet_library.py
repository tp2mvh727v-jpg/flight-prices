#!/usr/bin/env python3
"""
构建 航司×机型 精准图片库 (v3.0 真实机队版)
=============================================
基于 planespotters.net / 各航司官方数据 (2025–2026) 的真实机队映射
仅搜索航司实际运营的机型，不浪费 API 配额在不存在组合上

用法: python build_fleet_library.py
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
import ssl

# ============================================================
# 真实机队映射 — 仅列出航司实际运营的机型
# 数据来源: planespotters.net / 航司官方年报 / ch-aviation (2025–2026)
# ============================================================

FLEET = {
    # ═══ 中国航司 ═══
    'CA': {  # Air China 国航
        'name': 'Air China',
        'models': ['A359', 'A333', 'A320', 'A321', 'A20N',
                   'B789', 'B77W', 'B748', 'B738', 'B38M'],
    },
    'CZ': {  # China Southern 南航
        'name': 'China Southern',
        'models': ['A359', 'A333', 'A388', 'A320', 'A321', 'A20N',
                   'B789', 'B788', 'B77W', 'B738', 'B38M'],
    },
    'MU': {  # China Eastern 东航
        'name': 'China Eastern',
        'models': ['A359', 'A333', 'A320', 'A321', 'A20N',
                   'B789', 'B77W', 'B738', 'B38M'],
    },
    'HU': {  # Hainan Airlines 海航
        'name': 'Hainan Airlines',
        'models': ['A333', 'A20N', 'A321',
                   'B789', 'B788', 'B738', 'B38M'],
    },
    '3U': {  # Sichuan Airlines 川航 (全空客)
        'name': 'Sichuan Airlines',
        'models': ['A359', 'A333', 'A320', 'A321', 'A20N'],
    },
    'MF': {  # Xiamen Airlines 厦航
        'name': 'Xiamen Airlines',
        'models': ['B789', 'B788', 'B738', 'B38M', 'A20N'],
    },
    'ZH': {  # Shenzhen Airlines 深航
        'name': 'Shenzhen Airlines',
        'models': ['A320', 'A321', 'A20N', 'B738', 'B38M'],
    },

    # ═══ 中东航司 ═══
    'EK': {  # Emirates 阿联酋航空
        'name': 'Emirates',
        'models': ['A388', 'B77W', 'A359'],
    },
    'QR': {  # Qatar Airways 卡塔尔航空
        'name': 'Qatar Airways',
        'models': ['A359', 'A35K', 'A388', 'B77W', 'B789', 'B788',
                   'A320', 'A321', 'B38M'],
    },
    'EY': {  # Etihad 阿提哈德航空
        'name': 'Etihad Airways',
        'models': ['A35K', 'A388', 'B77W', 'B789',
                   'A320', 'A321', 'A333'],
    },

    # ═══ 亚太航司 ═══
    'SQ': {  # Singapore Airlines 新航
        'name': 'Singapore Airlines',
        'models': ['A359', 'A35K', 'A388', 'B77W', 'B38M', 'B738'],
    },
    'CX': {  # Cathay Pacific 国泰
        'name': 'Cathay Pacific',
        'models': ['A359', 'A35K', 'A333', 'B77W', 'A321'],
    },
    'QF': {  # Qantas 澳航
        'name': 'Qantas',
        'models': ['A388', 'B789', 'A333', 'B738'],
    },
    'JL': {  # Japan Airlines 日航
        'name': 'Japan Airlines',
        'models': ['A359', 'A35K', 'B789', 'B788', 'B77W', 'B738', 'B38M'],
    },
    'NH': {  # ANA 全日空
        'name': 'All Nippon Airways',
        'models': ['A388', 'B789', 'B788', 'B77W', 'B738',
                   'A320', 'A321', 'A20N'],
    },
    'KE': {  # Korean Air 大韩航空
        'name': 'Korean Air',
        'models': ['A359', 'A388', 'A333', 'A321',
                   'B789', 'B77W', 'B748', 'B738', 'B739'],
    },
    'OZ': {  # Asiana Airlines 韩亚航空
        'name': 'Asiana Airlines',
        'models': ['A359', 'A388', 'A333', 'A321', 'B77W'],
    },

    # ═══ 欧洲航司 ═══
    'LH': {  # Lufthansa 汉莎
        'name': 'Lufthansa',
        'models': ['A359', 'A35K', 'A388', 'A333', 'A320', 'A321', 'A20N',
                   'B748', 'B789'],
    },
    'AF': {  # Air France 法航
        'name': 'Air France',
        'models': ['A359', 'B77W', 'B789',
                   'A320', 'A321'],
    },
    'BA': {  # British Airways 英航
        'name': 'British Airways',
        'models': ['A35K', 'A388', 'B788', 'B789', 'B77W',
                   'A320', 'A321'],
    },
    'TK': {  # Turkish Airlines 土耳其航空
        'name': 'Turkish Airlines',
        'models': ['A359', 'A35K', 'A333', 'B789', 'B77W',
                   'A320', 'A321', 'B738', 'B38M'],
    },

    # ═══ 亚太 — 非主要航司 ═══
    'TR': {  # Scoot 酷航 (新加坡航空旗下廉航)
        'name': 'Scoot',
        'models': ['B788', 'B789', 'A320', 'A20N', 'A321'],
    },
    'PR': {  # Philippine Airlines 菲律宾航空
        'name': 'Philippine Airlines',
        'models': ['A359', 'A333', 'B77W', 'A321', 'A320', 'A20N'],
    },
    'MH': {  # Malaysia Airlines 马航
        'name': 'Malaysia Airlines',
        'models': ['A359', 'A333', 'B738', 'B38M'],
    },
    '5J': {  # Cebu Pacific 宿务航空
        'name': 'Cebu Pacific',
        'models': ['A320', 'A20N', 'A321', 'A333'],
    },
    'TN': {  # Air Tahiti Nui 大溪地航空
        'name': 'Air Tahiti Nui',
        'models': ['B789'],
    },
    'NZ': {  # Air New Zealand 新西兰航空
        'name': 'Air New Zealand',
        'models': ['B789', 'B77W', 'A320', 'A20N', 'A321'],
    },
    'VN': {  # Vietnam Airlines 越南航空
        'name': 'Vietnam Airlines',
        'models': ['A359', 'B789', 'A321', 'A20N'],
    },
    'TG': {  # Thai Airways 泰国航空
        'name': 'Thai Airways',
        'models': ['A359', 'A333', 'B789', 'B788', 'B77W', 'A320'],
    },
    'BR': {  # EVA Air 长荣航空
        'name': 'EVA Air',
        'models': ['B789', 'B788', 'B77W', 'A321', 'A333'],
    },
    'CI': {  # China Airlines 中华航空
        'name': 'China Airlines',
        'models': ['A359', 'A333', 'B77W', 'B738', 'A321', 'A20N'],
    },
    'GA': {  # Garuda Indonesia 印尼鹰航
        'name': 'Garuda Indonesia',
        'models': ['A333', 'B77W', 'B738'],
    },

    # ═══ 非洲航司 ═══
    'ET': {  # Ethiopian Airlines 埃塞俄比亚航空
        'name': 'Ethiopian Airlines',
        'models': ['A359', 'A35K', 'B789', 'B788', 'B77W', 'B738', 'B38M'],
    },
    'SA': {  # South African Airways 南非航空
        'name': 'South African Airways',
        'models': ['A333', 'A320', 'A20N', 'B738'],
    },
    'KQ': {  # Kenya Airways 肯尼亚航空
        'name': 'Kenya Airways',
        'models': ['B788', 'B738'],
    },
    'MS': {  # EgyptAir 埃及航空
        'name': 'EgyptAir',
        'models': ['A333', 'B789', 'B738', 'A320', 'A321', 'A20N'],
    },
    'AT': {  # Royal Air Maroc 摩洛哥皇家航空
        'name': 'Royal Air Maroc',
        'models': ['B788', 'B789', 'B738', 'B38M', 'A320', 'A321'],
    },

    # ═══ 美洲航司 ═══
    'DL': {  # Delta Air Lines 达美航空
        'name': 'Delta Air Lines',
        'models': ['A359', 'A333', 'A20N', 'A321',
                   'B739', 'B738'],
    },
    'UA': {  # United Airlines 联合航空
        'name': 'United Airlines',
        'models': ['B789', 'B788', 'B77W',
                   'A320', 'A321', 'A20N',
                   'B738', 'B739', 'B38M'],
    },
    'AA': {  # American Airlines 美国航空
        'name': 'American Airlines',
        'models': ['B789', 'B788', 'B77W',
                   'A321', 'A320', 'A20N',
                   'B738', 'B38M'],
    },
    'AC': {  # Air Canada 加拿大航空
        'name': 'Air Canada',
        'models': ['B789', 'B788', 'B77W', 'A333',
                   'A321', 'A320', 'B738', 'B38M'],
    },
    'LA': {  # LATAM Airlines 拉美航空
        'name': 'LATAM Airlines',
        'models': ['B789', 'B788',
                   'A320', 'A20N', 'A321'],
    },
    'AD': {  # Azul Linhas Aereas 蓝色航空
        'name': 'Azul Linhas Aereas',
        'models': ['A333', 'A20N', 'A321', 'A320'],
    },
    'CM': {  # Copa Airlines 巴拿马航空
        'name': 'Copa Airlines',
        'models': ['B738', 'B38M', 'B739'],
    },
    'AM': {  # Aeromexico 墨西哥航空
        'name': 'Aeromexico',
        'models': ['B789', 'B788', 'B738', 'B38M'],
    },
}

# 机型 → 搜索用关键词 (排名第一为最佳匹配)
MODEL_TERMS = {
    'A359': ['Airbus A350-900', 'A350-900'],
    'A35K': ['Airbus A350-1000', 'A350-1000'],
    'A333': ['Airbus A330-300', 'A330-300'],
    'A388': ['Airbus A380-800', 'A380-800'],
    'A320': ['Airbus A320-200', 'A320-200', 'A320'],
    'A321': ['Airbus A321-200', 'A321-200', 'A321'],
    'A20N': ['Airbus A320neo', 'A320neo'],
    'B789': ['Boeing 787-9', '787-9 Dreamliner'],
    'B788': ['Boeing 787-8', '787-8 Dreamliner'],
    'B77W': ['Boeing 777-300ER', '777-300ER'],
    'B748': ['Boeing 747-8', '747-8'],
    'B738': ['Boeing 737-800', '737-800'],
    'B739': ['Boeing 737-900ER', '737-900ER'],
    'B38M': ['Boeing 737 MAX 8', '737 MAX 8'],
}

# ============================================================
BASE = os.path.join(os.path.dirname(__file__), 'static', 'images', 'aircraft')
COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
TIMEOUT = 15
DELAY = 5.0       # 基础请求间隔
BACKOFF_429 = 45  # 收到 429 后额外等待秒数
MAX_429_RETRIES = 3
ssl_ctx = ssl.create_default_context()

os.makedirs(BASE, exist_ok=True)


def search_commons(airline_name, model_term):
    """Search Wikimedia Commons for airline+model photos, return list of filenames."""
    query = f'"{airline_name}" "{model_term}"'
    params = {
        'action': 'query',
        'list': 'search',
        'srsearch': query,
        'srnamespace': '6',
        'format': 'json',
        'srlimit': 6,
    }
    url = f'{COMMONS_API}?{urllib.parse.urlencode(params)}'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'AeroHub-FleetBuilder/3.0 (local dev)'
        })
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read())
            results = []
            for r in data.get('query', {}).get('search', []):
                fname = r['title'].replace('File:', '')
                low = fname.lower()
                if any(x in low for x in ['cockpit', 'cabin', 'seat', 'engine close', 'landing gear', 'wing ']):
                    continue
                results.append(fname)
            return results
    except Exception as e:
        print(f'    ✗ API 搜索失败: {e}')
        return None


def download_image(fname, save_path):
    """Download a single image from Wikimedia Commons."""
    if os.path.exists(save_path) and os.path.getsize(save_path) > 1000:
        return 'skip'
    encoded = urllib.parse.quote(fname, safe='')
    url = f'https://commons.wikimedia.org/wiki/Special:FilePath/{encoded}?width=800'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'AeroHub-FleetBuilder/3.0'
        })
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=TIMEOUT) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'image' not in ct:
                return f'bad_type:{ct}'
            data = resp.read()
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            with open(save_path, 'wb') as f:
                f.write(data)
            return f'ok:{len(data)//1024}KB'
    except urllib.error.HTTPError as e:
        return f'http_{e.code}'
    except Exception as e:
        return f'err:{e}'


# ============================================================
# 主流程
# ============================================================

total_combos = sum(len(v['models']) for v in FLEET.values())
downloaded = 0
skipped_existing = 0
missed = []
rate_limited = False
consecutive_429 = 0

print('=' * 64)
print('  Aero-Hub 机队图片库构建器 v3.0 (真实机队)')
print(f'  {len(FLEET)} 家航司 × 真实机队映射 = {total_combos} 组合')
print(f'  来源: planespotters.net / 航司官方年报 / ch-aviation')
print('=' * 64)
print(f'\n→ API 间隔 {DELAY}s, 429退避 {BACKOFF_429}s')

# Step 1: 创建目录结构
print('\n▸ Step 1: 创建目录结构\n')
for model in sorted(MODEL_TERMS.keys()):
    count = 0
    for code, info in FLEET.items():
        if model in info['models']:
            d = os.path.join(BASE, model, code)
            os.makedirs(d, exist_ok=True)
            count += 1
    print(f'  {model}/  ({count} 家航司)')

# Step 2: 搜索 + 下载
print(f'\n▸ Step 2: 搜索 Commons + 下载\n')

for code, info in FLEET.items():
    for model in info['models']:
        air_dir = os.path.join(BASE, model, code)

        # 连续 429 过多则暂停
        if consecutive_429 >= MAX_429_RETRIES:
            wait = BACKOFF_429 * 3
            print(f'  ⚠ 连续 429，退避 {wait}s ...')
            time.sleep(wait)
            consecutive_429 = 0

        # 已有图片则跳过
        existing = [f for f in os.listdir(air_dir) if os.path.isfile(os.path.join(air_dir, f)) and not f.startswith('.')]
        if existing:
            skipped_existing += 1
            continue

        # 搜索 Commons
        terms = MODEL_TERMS.get(model, [model])
        all_filenames = []
        search_ok = True

        for term in terms:
            result = search_commons(info['name'], term)
            if result is None:
                consecutive_429 += 1
                print(f'    429 退避 {BACKOFF_429}s ...')
                time.sleep(BACKOFF_429)
                result = search_commons(info['name'], term)
                if result is None:
                    search_ok = False
                    rate_limited = True
                    break
                else:
                    consecutive_429 = 0
            else:
                consecutive_429 = 0

            all_filenames.extend(result)
            if result:
                break
            time.sleep(0.3)

        if not search_ok:
            missed.append((model, code, info['name'], 'API 限流'))
            time.sleep(DELAY)
            continue

        # 去重
        seen = set()
        unique = []
        for f in all_filenames:
            if f not in seen:
                seen.add(f)
                unique.append(f)

        if unique:
            best = unique[0]
            save_path = os.path.join(air_dir, best)
            result = download_image(best, save_path)
            if result.startswith('ok'):
                print(f'  {model}/{code}  ✓ {result.split(":")[1]}')
                downloaded += 1
            elif result == 'skip':
                skipped_existing += 1
            elif result.startswith('http_429'):
                consecutive_429 += 1
                missed.append((model, code, info['name'], '下载限流'))
                rate_limited = True
            else:
                missed.append((model, code, info['name'], f'下载失败({result})'))
        else:
            missed.append((model, code, info['name'], 'Commons 无匹配'))

        time.sleep(DELAY)

# ============================================================
# 报告
# ============================================================
print(f'\n{"=" * 64}')
print(f'  完成摘要')
print(f'{"=" * 64}')
print(f'  航司总数:   {len(FLEET)}')
print(f'  真实组合:   {total_combos}')
print(f'  新增下载:   {downloaded} 张')
print(f'  已有图片:   {skipped_existing} 个组合')
print(f'  未找到:     {len(missed)} 个组合')

if rate_limited:
    print(f'\n  ⚠ Wikimedia 速率限制已触发。')
    print(f'  重新运行 python build_fleet_library.py 可续传 (已有图片自动跳过)。')

if missed:
    print(f'\n  以下组合留空 (目录已创建，可手动填充):')
    for model, code, name, reason in missed:
        print(f'    □ {model}/{code:<4} — {name} ({reason})')

print(f'\n  目录: {BASE}')
print(f'  下次运行: python build_fleet_library.py (续传模式)')
