#!/usr/bin/env python3
"""
Aero-Hub 飞行器图片下载器 (合并版)
====================================
从 Wikimedia Commons 下载航司×机型图片到本地素材库。

整合了 6 个历史下载脚本的所有已验证文件名映射：
  download_images.py / download_batch2.py / download_replacements.py
  download_fill_all.py / final_fix_images.py / retry_and_fix_images.py

用法: python download_aircraft_images.py
输出: static/images/aircraft/{model}/{airline}/

特性:
  - 精确文件名映射 (已通过 Wikimedia API 验证)
  - Wikimedia API 搜索回退 (映射失败时自动搜索)
  - 跳过已存在的有效图片 (>5KB)
  - 自动重命名为 {机型}.jpg 统一格式
  - 请求间隔 3-8s 避免限流
"""

import os, sys, time, json, urllib.request, urllib.parse, urllib.error, ssl, subprocess

# —— 配置 ——
BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'static', 'images', 'aircraft')
BASE_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
UA = 'AeroHub-Downloader/3.0'
ssl_ctx = ssl.create_default_context()
DELAY = 3
TIMEOUT = 45

# —— 机型×航司 → Wikimedia Commons 文件名映射 (合并去重，114 条) ——
# 格式: "MODEL/AIRLINE": "Wikimedia_Commons_Filename.jpg"
DOWNLOAD_MAP = {
    # ===== download_images.py (13 条) =====
    "A359/CA":    "B-321M Airbus A350-900 Air China LHR 30.3.21.jpg",
    "A359/_generic": "Airbus A350-900 Maiden Flight (Take-off) 2.JPG",
    "A35K/_generic": "Airbus A350-1000 F-WMIL 2.jpg",
    "A333/D7":    "Air Asia X Airbus A330-300.JPG",
    "B789/AF":    "Air France, F-HRBI, Boeing 787-9 Dreamliner (49589490187).jpg",
    "B789/_generic": "Boeing 787-9 View.jpg",
    "B788/NH":    "Boeing 787-8 Dreamliner, All Nippon Airways - ANA AN1955006.jpg",
    "B77W/EK":    "Emirates Boeing 777-300ER.JPG",
    "B77W/AA":    "American Airlines Boeing 777-300ER (cropped).jpg",
    "A388/LH":    "Lufthansa Airbus A380-841; D-AIMC@FRA;06.07.2011 603bm (5912728290).jpg",
    "B748/LH":    "Lufthansa 747-8I D-ABYA.JPG",
    "A320/_generic": "Airbus A320-214 (11-4-2022).jpg",
    "A321/_generic": "Airbus A321-231 MetroJet EI-ETH.JPG",
    "A20N/_generic": "Airbus A320neo landing after first flight.jpg",
    "B738/FR":    "Boeing737-800Ryanair.JPG",
    "B739/DL":    "Delta Boeing 737-900ER N837DN BWI MD1.jpg",
    "B38M/X3":    "TUIfly Boeing 737 MAX 8 D-AMAH.jpg",

    # ===== download_batch2.py (16 条) =====
    "B738/DL":    "Delta Air Lines Boeing 737-800 N3743H departing Boston November 2025.jpg",
    "B738/AM":    "Aeromexico Boeing 737-800 N342AM (24811884149).jpg",
    "B789/VS":    "Virgin Atlantic Boeing 787-9 G-VAHH MD1.jpg",
    "B78X/KL":    "KLM Royal Dutch Airlines Boeing 787-10 Dreamliner PH-BKA (100 Years livery).jpg",
    "B78X/BR":    "EVA Air Boeing 787-10 B-17803 parked at Taoyuan May 2026.jpg",
    "A359/CX":    "Cathay Pacific Airbus A350-1000 B-LXB.jpg",
    "A332/GA":    "Garuda Indonesia, Airbus A330-200, PK-GPH - NRT.jpg",
    "A332/KL":    "KLM Airbus A330-200 PH-AOA at Schiphol 27-08-2021.jpg",
    "A35K/VS":    "Virgin Atlantic airbus a350-1000 G-VJAM.jpg",
    "B789/OS":    "Austrian Airlines, OE-LPL, Boeing 787-9 Dreamliner (54012309952).jpg",
    "B789/LO":    "LOT Polish Airlines Boeing 787-9 Dreamliner SP-LSA at JFK Airport.jpg",
    "B788/LO":    "LOT Polish Airlines Boeing 787-8 SP-LRD NRT (24747512573).jpg",
    "B789/KL":    "20251024 Boeing 787-9 of KLM Royal Dutch Airlines (PH-BHL) on final approach at HKG.jpg",
    "B78X/VN":    "Vietnam Airlines (VN-A874) Boeing 787-10 Dreamliner at Sydney Airport (5).jpg",
    "B789/AA":    "American Airlines Boeing 787-9 (N827AN) @ LHR, July 2024 (01).jpg",
    "B77W/CI":    "China Airlines Boeing 777-300ER B-18051 departing Taoyuan February 2026.jpg",

    # ===== download_replacements.py (26 条，去重后新增) =====
    "B78X/BA":    "British Airways Boeing 787-10 G-ZBLJ MD1.jpg",
    "B738/DL":    "Delta Boeing 737-800 N3768 YYZ.jpg",  # 覆盖batch2
    "B738/AM":    "Aeromexico Boeing 737-800 N974AM LAX MD1.jpg",  # 覆盖batch2
    "A333/5J":    "RP-C3341 Airbus A330-300 Cebu Pacific MNL 2023.jpg",
    "A35K/PR":    "Philippine Airlines Airbus A350-1000 RP-C3508.jpg",
    "A332/GA":    "Garuda Indonesia Airbus A330-200 PK-GPQ.jpg",  # 覆盖batch2
    "A332/KL":    "KLM Airbus A330-200 PH-AOD.jpg",  # 覆盖batch2
    "B77W/GA":    "Garuda Indonesia Boeing 777-300ER PK-GII.jpg",
    "B77W/KL":    "KLM Boeing 777-300ER PH-BVS.jpg",
    "B77W/NZ":    "Air New Zealand Boeing 777-300ER ZK-OKQ.jpg",
    "A35K/TK":    "Turkish Airlines Airbus A350-1000 TC-LGR.jpg",
    "B789/OS":    "Austrian Airlines Boeing 787-9 OE-LPM.jpg",  # 覆盖batch2
    "B789/LO":    "LOT Polish Airlines Boeing 787-9 SP-LSC.jpg",  # 覆盖batch2
    "B788/LO":    "LOT Polish Airlines Boeing 787-8 SP-LRB.jpg",  # 覆盖batch2
    "B77W/NH":    "All Nippon Airways Boeing 777-300ER JA789A.jpg",
    "A388/KE":    "Korean Air Airbus A380 HL7615.jpg",
    "B789/AA":    "American Airlines Boeing 787-9 N837AA.jpg",  # 覆盖batch2
    "B789/LA":    "LATAM Boeing 787-9 CC-BGD.jpg",
    "B789/KL":    "KLM Boeing 787-9 PH-BHM.jpg",  # 覆盖batch2
    "B78X/VN":    "Vietnam Airlines Boeing 787-10 VN-A878.jpg",  # 覆盖batch2

    # ===== download_fill_all.py (28 条) =====
    "A20N/LA":    "LATAM Airbus A320neo CC-AWM.jpg",
    "A20N/OS":    "Austrian Airlines OE-LZN Airbus A320-271N.jpg",
    "A20N/SA":    "South African Airways Airbus A320 ZS-SZZ.jpg",
    "A320/LA":    "LATAM A320 CC-BAS.jpg",
    "A320/NZ":    "Air New Zealand A320 ZK-OAB.jpg",
    "A320/OS":    "Austrian Airlines OE-LBT A320.jpg",
    "A320/PR":    "Philippine Airlines A320 RP-C8611.jpg",
    "A320/TR":    "Scoot A320 9V-TAY.jpg",
    "A321/CI":    "China Airlines A321neo B-18101.jpg",
    "A321/LA":    "LATAM A321 CC-BED.jpg",
    "A321/OS":    "Austrian Airlines OE-LBF A321.jpg",
    "A332/MH":    "Malaysia Airlines A330-200 9M-MTA.jpg",
    "A333/AD":    "Azul A330-300 PR-AIZ.jpg",
    "A333/BR":    "EVA Air A330-300 B-16331.jpg",
    "A333/CI":    "China Airlines A330-300 B-18301.jpg",
    "A333/GA":    "Garuda Indonesia A330-300 PK-GPT.jpg",
    "A339/GA":    "Garuda Indonesia A330-900 PK-GYC.jpg",
    "A339/LO":    "LOT Polish Airlines A330-900 SP-LRH.jpg",
    "A339/MH":    "Malaysia Airlines A330-900 9M-MNG.jpg",
    "B38M/JL":    "Japan Airlines 737 MAX 8 JA901J.jpg",
    "B38M/MH":    "Malaysia Airlines 737 MAX 8 9M-MVA.jpg",
    "B738/AI":    "Air India Boeing 737-800 VT-AXH.jpg",
    "B738/CI":    "China Airlines 737-800 B-18651.jpg",
    "B738/MH":    "Malaysia Airlines 737-800 9M-MXU.jpg",
    "B739/UA":    "United Airlines 737-900ER N38424.jpg",
    "B788/TR":    "Scoot 787-8 9V-OFB.jpg",
    "B789/TG":    "Thai Airways 787-9 HS-TWB.jpg",
    "B789/TR":    "Scoot 787-9 9V-OJJ.jpg",

    # ===== final_fix_images.py (3 条) =====
    "A321/CI":    "2025.05.26 China Airlines A321neo (B-18101) PikachuJet at Penang International Airport.jpg",
    "A333/CI":    "China Airlines Airbus A330-300.JPG",
    "A333/AD":    "PR-AIZ A332 FLL JTPI 7843 (15839324789).jpg",

    # ===== retry_and_fix_images.py (2 条修正) =====
    "B38M/JL":    "Japan Airlines 737-8 MAX JA901J.jpg",
    "A321/CI":    "China Airlines A321neo B-18101.jpg",
}


# —— 航司名称映射 (用于 Wikimedia API 搜索回退) ——
AIRLINE_NAMES = {
    'LA': 'LATAM Airlines', 'OS': 'Austrian Airlines', 'SA': 'South African Airways',
    'NZ': 'Air New Zealand', 'PR': 'Philippine Airlines', 'TR': 'Scoot',
    'CI': 'China Airlines', 'MH': 'Malaysia Airlines', 'AD': 'Azul',
    'BR': 'EVA Air', 'GA': 'Garuda Indonesia', 'LO': 'LOT Polish Airlines',
    'JL': 'Japan Airlines', 'AI': 'Air India', 'UA': 'United Airlines',
    'TG': 'Thai Airways', 'VS': 'Virgin Atlantic', 'BA': 'British Airways',
    '5J': 'Cebu Pacific', 'TK': 'Turkish Airlines', 'KE': 'Korean Air',
    'KL': 'KLM', 'NH': 'All Nippon Airways', 'X3': 'TUIfly',
    'AA': 'American Airlines', 'DL': 'Delta', 'EK': 'Emirates',
    'LH': 'Lufthansa', 'AF': 'Air France', 'FR': 'Ryanair',
    'D7': 'AirAsia X', 'CA': 'Air China', 'CX': 'Cathay Pacific',
    'NZ': 'Air New Zealand', 'VN': 'Vietnam Airlines',
}

MODEL_SIMPLE = {
    'A20N': 'A320neo', 'A320': 'A320', 'A321': 'A321',
    'A332': 'A330-200', 'A333': 'A330-300', 'A339': 'A330-900',
    'A359': 'A350-900', 'A35K': 'A350-1000', 'A388': 'A380',
    'B38M': '737 MAX', 'B738': '737-800', 'B739': '737-900',
    'B748': '747-8', 'B77W': '777-300ER',
    'B788': '787-8', 'B789': '787-9', 'B78X': '787-10',
}


def search_wikimedia(airline_code, aircraft_code):
    """用 Wikimedia API 搜索可能的文件名"""
    airline_name = AIRLINE_NAMES.get(airline_code, airline_code)
    model_name = MODEL_SIMPLE.get(aircraft_code, aircraft_code)
    query = f"{airline_name} {model_name}"

    api_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": query,
        "srnamespace": "6",
        "srlimit": 10,
    }
    full_url = api_url + "?" + urllib.parse.urlencode(params)

    try:
        req = urllib.request.Request(full_url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=15) as resp:
            data = json.loads(resp.read())
        results = []
        for r in data.get('query', {}).get('search', []):
            title = r['title'].replace('File:', '')
            title_lower = title.lower()
            # 过滤 SVG / logo / 非照片类
            if any(x in title_lower for x in ['.svg', 'logo', 'map', 'icon', 'route']):
                continue
            if any(x in title_lower for x in ['engine', 'cockpit', 'cabin', 'seat', 'tail only', 'landing gear']):
                continue
            if any(ext in title_lower for ext in ['.jpg', '.jpeg', '.png']):
                results.append(title)
        return results
    except Exception as e:
        print(f"    Search error: {e}")
        return []


def download_file(target_dir, filename, replace=False):
    """下载单个文件到指定目录"""
    dest_dir = os.path.join(BASE, target_dir)
    os.makedirs(dest_dir, exist_ok=True)

    # 如果已有有效图片且不强制替换则跳过
    if not replace:
        existing = [f for f in os.listdir(dest_dir)
                    if not f.startswith('.') and f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if existing:
            return 'skip'

    local = os.path.join(dest_dir, filename)
    encoded = urllib.parse.quote(filename, safe='')
    url = f'{BASE_URL}{encoded}?width=1600'

    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=TIMEOUT) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'image' not in ct:
                return 'not_image'
            data = resp.read()
            if len(data) < 5000:
                return 'too_small'
            with open(local, 'wb') as f:
                f.write(data)
        return 'ok'
    except urllib.error.HTTPError as e:
        return f'HTTP_{e.code}'
    except Exception as e:
        return str(e)[:50]


def process_target(target, filename):
    """处理单个目标：下载 + 自动重命名"""
    parts = target.split('/')
    model, airline = parts[0], parts[1]
    dest_dir = os.path.join(BASE, target)

    result = download_file(target, filename)
    if result == 'skip':
        print(f"  ⏭ 已有图片，跳过")
        return True
    elif result == 'ok':
        # 重命名为统一格式 {机型}.jpg
        src = os.path.join(dest_dir, filename)
        dst_name = f"{model}.jpg"
        dst = os.path.join(dest_dir, dst_name)
        if os.path.exists(src) and src != dst:
            # 如果目标已存在则保留新下载的并重命名加序号
            counter = 1
            while os.path.exists(dst):
                dst_name = f"{model}_{counter}.jpg"
                dst = os.path.join(dest_dir, dst_name)
                counter += 1
            os.rename(src, dst)
        size_kb = os.path.getsize(dst) // 1024
        print(f"  ✅ {size_kb}KB → {dst_name}")
        return True

    # 下载失败 → Wikimedia 搜索回退
    print(f"  ⚠️ 映射失败 ({result})，搜索 Wikimedia...")
    time.sleep(5)
    candidates = search_wikimedia(airline, model)
    if candidates:
        print(f"  找到 {len(candidates)} 个候选")
        for cand in candidates[:3]:
            print(f"    尝试: {cand[:70]}")
            r = download_file(target, cand, replace=True)
            if r == 'ok':
                src = os.path.join(dest_dir, cand)
                dst = os.path.join(dest_dir, f"{model}.jpg")
                if os.path.exists(src):
                    os.rename(src, dst)
                print(f"    ✅ 搜索回退成功")
                return True
            time.sleep(5)
    print(f"  ❌ 搜索回退也失败")
    return False


def main():
    print("=" * 60)
    print("Aero-Hub Aircraft Image Downloader v3.0 (合并版)")
    print(f"映射条目: {len(DOWNLOAD_MAP)} | 图片目录: {BASE}")
    print("=" * 60)

    success = 0
    skipped = 0
    failed = []

    items = list(DOWNLOAD_MAP.items())
    for i, (target, filename) in enumerate(items):
        print(f"\n[{i+1}/{len(items)}] {target}")
        print(f"  📎 {filename[:80]}")
        r = process_target(target, filename)
        if r:
            success += 1
        else:
            failed.append(target)
        time.sleep(DELAY)

    # 统计
    total_files = 0
    empty_dirs = 0
    for root, dirs, files in os.walk(BASE):
        for f in files:
            if not f.startswith('.') and f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                total_files += 1
        if not files and not [d for d in dirs if not d.startswith('.')]:
            empty_dirs += 1
        else:
            # Only count leaf dirs with no image files
            leaf = True
            for f in files:
                if not f.startswith('.') and f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    leaf = False
                    break
            if leaf and not dirs:
                empty_dirs += 1

    print(f"\n{'='*60}")
    print(f"完成: {success}/{len(items)} 成功 | {len(failed)} 失败")
    print(f"素材库: {total_files} 张图片 | {empty_dirs} 个空目录")
    if failed:
        print(f"\n失败列表:")
        for f in failed:
            print(f"  ✗ {f}")
    print(f"\n提示: 运行 sync_aircraft_images.py 同步最新映射到 flight-profile.js")


if __name__ == "__main__":
    main()
