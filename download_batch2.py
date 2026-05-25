#!/usr/bin/env python3
"""第二波：用验证过的 Wikimedia 文件名下载高清图片"""

import os, time, urllib.request, urllib.parse, ssl

BASE = os.path.expanduser("~/Desktop/CC_test/flight-prices/static/images/aircraft")
BASE_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
UA = 'AeroHub-ImageCollector/1.0 (local dev tool)'
ssl_ctx = ssl.create_default_context()
DELAY = 3  # seconds between downloads

# Verified filenames from web search
DOWNLOADS = [
    ("B738/DL", "Delta Air Lines Boeing 737-800 N3743H departing Boston November 2025.jpg"),
    ("B738/AM", "Aeromexico Boeing 737-800 N342AM (24811884149).jpg"),
    ("B789/VS", "Virgin Atlantic Boeing 787-9 G-VAHH MD1.jpg"),
    ("B78X/KL", "KLM Royal Dutch Airlines Boeing 787-10 Dreamliner PH-BKA (100 Years livery).jpg"),
    ("B78X/BR", "EVA Air Boeing 787-10 B-17803 parked at Taoyuan May 2026.jpg"),
    ("A359/CX", "Cathay Pacific Airbus A350-1000 B-LXB.jpg"),
    ("A332/GA", "Garuda Indonesia, Airbus A330-200, PK-GPH - NRT.jpg"),
    ("A332/KL", "KLM Airbus A330-200 PH-AOA at Schiphol 27-08-2021.jpg"),
    ("A35K/VS", "Virgin Atlantic airbus a350-1000 G-VJAM.jpg"),
    ("B789/OS", "Austrian Airlines, OE-LPL, Boeing 787-9 Dreamliner (54012309952).jpg"),
    ("B789/LO", "LOT Polish Airlines Boeing 787-9 Dreamliner SP-LSA at JFK Airport.jpg"),
    ("B788/LO", "LOT Polish Airlines Boeing 787-8 SP-LRD NRT (24747512573).jpg"),
    ("B789/KL", "20251024 Boeing 787-9 of KLM Royal Dutch Airlines (PH-BHL) on final approach at HKG.jpg"),
    ("B78X/VN", "Vietnam Airlines (VN-A874) Boeing 787-10 Dreamliner at Sydney Airport (5).jpg"),
    ("B789/AA", "American Airlines Boeing 787-9 (N827AN) @ LHR, July 2024 (01).jpg"),
    ("B77W/CI", "China Airlines Boeing 777-300ER B-18051 departing Taoyuan February 2026.jpg"),
]

def download(target_dir, filename):
    dest_dir = os.path.join(BASE, target_dir)
    os.makedirs(dest_dir, exist_ok=True)
    
    # Clean existing wrong files
    for existing in os.listdir(dest_dir):
        if not existing.startswith('.') and existing.lower().endswith(('.jpg','.png','.jpeg')):
            # Remove wrong downloads from previous batch
            if any(x in existing for x in ['SNCT', 'Ercole', 'Maizy', 'Vernayaz', 'Freiburg']):
                os.remove(os.path.join(dest_dir, existing))
                print(f"    🗑 Removed wrong: {existing}")
    
    local_path = os.path.join(dest_dir, filename)
    if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
        print(f"    SKIP (exists)")
        return
    
    encoded = urllib.parse.quote(filename, safe='')
    url = f'{BASE_URL}{encoded}?width=1600'  # 1600px is good quality without hitting rate limits
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=45) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'image' not in ct:
                print(f"    FAIL: not image ({ct})")
                return
            data = resp.read()
            with open(local_path, 'wb') as f:
                f.write(data)
            size_kb = len(data) // 1024
            print(f"    ✅ {size_kb}KB")
    except Exception as e:
        print(f"    ❌ {e}")

def main():
    # First remove the wrong B78X/BR image
    wrong_br = os.path.join(BASE, "B78X/BR")
    if os.path.exists(wrong_br):
        for f in os.listdir(wrong_br):
            if 'SNCT' in f:
                os.remove(os.path.join(wrong_br, f))
                print(f"🗑 Removed wrong B78X/BR: {f}")
    
    success = 0
    for i, (target, fname) in enumerate(DOWNLOADS):
        print(f"[{i+1}/{len(DOWNLOADS)}] {target}")
        download(target, fname)
        success += 1 if os.path.exists(os.path.join(BASE, target, fname)) else 0
        time.sleep(DELAY)
    
    print(f"\nResults: {success}/{len(DOWNLOADS)}")
    empty = os.popen(f"find {BASE} -type d -empty | wc -l").read().strip()
    print(f"Empty dirs remaining: {empty}")

if __name__ == "__main__":
    main()
