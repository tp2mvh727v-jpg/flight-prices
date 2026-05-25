#!/usr/bin/env python3
"""批量下载替换图片 — 使用 Wikimedia Special:FilePath 接口 (已验证可用)"""

import os, sys, time, urllib.request, urllib.parse, ssl, json

BASE = os.path.expanduser("~/Desktop/CC_test/flight-prices/static/images/aircraft")
BASE_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
USER_AGENT = 'AeroHub-ImageCollector/1.0 (local dev tool)'
ssl_ctx = ssl.create_default_context()
TIMEOUT = 30
DELAY = 2

# (target_dir, wikimedia_filename)
# 这些文件名来自 Wikimedia Commons 真实文件
DOWNLOAD_LIST = [
    # === 替换被删图片 ===
    ("B78X/BA", "British Airways Boeing 787-10 G-ZBLJ MD1.jpg"),
    ("B738/DL", "Delta Boeing 737-800 N3768 YYZ.jpg"),
    ("B738/AM", "Aeromexico Boeing 737-800 N974AM LAX MD1.jpg"),
    ("A333/5J", "RP-C3341 Airbus A330-300 Cebu Pacific MNL 2023.jpg"),
    
    # === 优先空目录 ===
    ("B78X/BR", "EVA Air Boeing 787-10 B-17803 TPE.jpg"),
    ("A359/CX", "Cathay Pacific Airbus A350-1000 B-LXA HKG.jpg"),
    ("A35K/PR", "Philippine Airlines Airbus A350-1000 RP-C3508.jpg"),
    ("A332/GA", "Garuda Indonesia Airbus A330-200 PK-GPQ.jpg"),
    ("A332/KL", "KLM Airbus A330-200 PH-AOD.jpg"),
    ("B77W/GA", "Garuda Indonesia Boeing 777-300ER PK-GII.jpg"),
    ("B77W/KL", "KLM Boeing 777-300ER PH-BVS.jpg"),
    ("B77W/NZ", "Air New Zealand Boeing 777-300ER ZK-OKQ.jpg"),
    ("B789/VS", "Virgin Atlantic Boeing 787-9 G-VNEW MAN.jpg"),
    ("B78X/KL", "KLM Boeing 787-10 PH-BKA AMS.jpg"),
    ("A35K/VS", "Virgin Atlantic Airbus A350-1000 G-VLUV.jpg"),
    ("A35K/TK", "Turkish Airlines Airbus A350-1000 TC-LGR.jpg"),
    ("B789/OS", "Austrian Airlines Boeing 787-9 OE-LPM.jpg"),
    ("B789/LO", "LOT Polish Airlines Boeing 787-9 SP-LSC.jpg"),
    ("B788/LO", "LOT Polish Airlines Boeing 787-8 SP-LRB.jpg"),
    
    # === 额外高频航司 ===
    ("B77W/CI", "China Airlines Boeing 777-300ER B-18051.jpg"),
    ("B77W/NH", "All Nippon Airways Boeing 777-300ER JA789A.jpg"),
    ("A388/KE", "Korean Air Airbus A380 HL7615.jpg"),
    ("B789/AA", "American Airlines Boeing 787-9 N837AA.jpg"),
    ("B789/LA", "LATAM Boeing 787-9 CC-BGD.jpg"),
    ("B789/KL", "KLM Boeing 787-9 PH-BHM.jpg"),
    ("B78X/VN", "Vietnam Airlines Boeing 787-10 VN-A878.jpg"),
]

def search_wikimedia(query, limit=3):
    """Search Wikimedia for a filename"""
    url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": f"{query} filetype:bitmap",
        "srnamespace": "6",
        "srlimit": limit,
    }
    full_url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full_url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=15) as resp:
            data = json.loads(resp.read())
        return [r['title'].replace('File:', '') for r in data.get("query", {}).get("search", [])]
    except Exception as e:
        print(f"    Search error: {e}")
        return []

def download_file(filename, dest_dir):
    """Download a file from Wikimedia using Special:FilePath"""
    os.makedirs(dest_dir, exist_ok=True)
    
    encoded = urllib.parse.quote(filename, safe='')
    # 不加 width 参数 → 全分辨率
    url = f'{BASE_URL}{encoded}'
    
    local_path = os.path.join(dest_dir, filename)
    if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
        print(f"    SKIP (exists)")
        return False
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=TIMEOUT) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'image' not in ct:
                print(f"    FAIL: not an image ({ct})")
                return False
            data = resp.read()
            with open(local_path, 'wb') as f:
                f.write(data)
            size_kb = len(data) // 1024
            # Check dimensions
            import subprocess
            r = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", local_path],
                             capture_output=True, text=True)
            dims = ""
            for line in r.stdout.split('\n'):
                if 'pixel' in line:
                    dims += line.split(':')[1].strip() + " "
            print(f"    ✅ {size_kb}KB [{dims.strip()}]")
            return True
    except Exception as e:
        print(f"    ❌ {e}")
        return False

def main():
    total = len(DOWNLOAD_LIST)
    success = 0
    skip = 0
    fail = 0
    
    for i, (target_dir, filename) in enumerate(DOWNLOAD_LIST):
        model, airline = target_dir.split('/')
        dest = os.path.join(BASE, target_dir)
        
        # Check if already has good images
        existing = []
        if os.path.exists(dest):
            existing = [f for f in os.listdir(dest) if f.lower().endswith(('.jpg','.png','.jpeg','.webp')) and not f.startswith('.')]
        
        if existing:
            print(f"[{i+1}/{total}] {target_dir} — {len(existing)} files, SKIP")
            skip += 1
            continue
        
        print(f"[{i+1}/{total}] {target_dir} → {filename[:60]}...")
        
        # Try the hardcoded filename first
        if download_file(filename, dest):
            success += 1
            time.sleep(DELAY)
            continue
        
        # Fallback: search Wikimedia
        model_name = model.replace('A20N','A320neo').replace('B38M','737 MAX 8').replace('B78X','787-10').replace('B788','787-8').replace('B789','787-9').replace('B77W','777-300ER')
        query = f"{airline} {model_name}"
        print(f"    Searching: {query}...")
        results = search_wikimedia(query)
        
        found = False
        for r in results[:5]:
            if any(x in r.lower() for x in ['.svg', 'logo', 'map', 'icon']):
                continue
            print(f"    Trying: {r[:70]}")
            if download_file(r, dest):
                success += 1
                found = True
                break
        
        if not found:
            fail += 1
        
        time.sleep(DELAY)
    
    print(f"\n{'='*60}")
    print(f"Results: {success} downloaded, {skip} skipped, {fail} failed")
    
    # Count final state
    empty = os.popen(f"find {BASE} -type d -empty | wc -l").read().strip()
    count = os.popen(f"find {BASE} -type f \\( -name '*.jpg' -o -name '*.png' \\) | wc -l").read().strip()
    print(f"Total images: {count}, Empty dirs: {empty}")

if __name__ == "__main__":
    main()
