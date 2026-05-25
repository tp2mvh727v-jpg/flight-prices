#!/usr/bin/env python3
"""渐进式图片下载器 — 每批 6 张，自动续传，避免 Wikimedia 限流"""

import os, sys, time, json, urllib.request, urllib.parse, ssl, subprocess

BASE = os.path.expanduser("~/Desktop/CC_test/flight-prices/static/images/aircraft")
STATE_FILE = os.path.join(BASE, ".download_state.json")
BATCH_SIZE = 6
DELAY = 4  # 每张图间隔秒数
BASE_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
UA = 'AeroHub/1.0 (batch downloader)'
ssl_ctx = ssl.create_default_context()

# ============ PHASE 1: 缩略图升级 ============
# 这些文件已经存在但分辨率太低，需要重新下载
def find_thumbnails():
    """找到所有 <1000px 宽的缩略图"""
    thumbs = []
    result = subprocess.run(
        ["find", BASE, "-type", "f", "(", "-name", "*.jpg", "-o", "-name", "*.png", ")"],
        capture_output=True, text=True
    )
    for f in result.stdout.strip().split('\n'):
        if not f: continue
        r = subprocess.run(["sips", "-g", "pixelWidth", f], capture_output=True, text=True)
        for line in r.stdout.split('\n'):
            if 'pixelWidth' in line:
                w = int(line.split(':')[1].strip())
                if w < 1000:
                    rel = f.replace(BASE + '/', '')
                    thumbs.append(rel)
                break
    return thumbs

# ============ PHASE 2: 空目录填充 ============
# 预验证的 Wikimedia 文件名映射
EMPTY_DIR_MAP = {
    # 已有验证文件名
    "A359/CI": ["China Airlines Airbus A350-900 B-18901 TPE.jpg"],
    "A35K/PR": ["Philippine Airlines Airbus A350-1000 RP-C3508 MNL.jpg"],
    "A333/BR": ["EVA Air Airbus A330-300 B-16331 TPE.jpg"],
    "A333/GA": ["Garuda Indonesia Airbus A330-300 PK-GPT CGK.jpg"],
    "A333/KL": ["KLM Airbus A330-300 PH-AKA AMS.jpg"],
    "A333/VS": ["Virgin Atlantic Airbus A330-300 G-VSXY LHR.jpg"],
    "A332/MH": ["Malaysia Airlines Airbus A330-200 9M-MTA KUL.jpg"],
    "A332/TK": ["Turkish Airlines Airbus A330-200 TC-JNB IST.jpg"],
    "A339/GA": ["Garuda Indonesia Airbus A330-900 PK-GYC.jpg"],
    "A339/MH": ["Malaysia Airlines Airbus A330-900 9M-MNG.jpg"],
    "A339/VS": ["Virgin Atlantic Airbus A330-900 G-VTOM.jpg"],
    "A339/LO": ["LOT Polish Airlines Airbus A330-900 SP-LRH.jpg"],
    "B38M/JL": ["Japan Airlines Boeing 737-8 JA901J.jpg"],
    "B38M/MH": ["Malaysia Airlines Boeing 737-8 9M-MVA.jpg"],
    "B38M/TK": ["Turkish Airlines Boeing 737-8 MAX TC-LCP.jpg"],
    "B38M/UA": ["United Airlines Boeing 737 MAX 8 N27273.jpg"],
    "B738/AI": ["Air India Boeing 737-800 VT-AXH.jpg"],
    "B738/CI": ["China Airlines Boeing 737-800 B-18651.jpg"],
    "B738/KL": ["KLM Boeing 737-800 PH-BCA.jpg"],
    "B738/MH": ["Malaysia Airlines Boeing 737-800 9M-MXU.jpg"],
    "B738/MS": ["EgyptAir Boeing 737-800 SU-GCM.jpg"],
    "B738/UA": ["United Airlines Boeing 737-800 N14219.jpg"],
    "B739/KL": ["KLM Boeing 737-900 PH-BXO.jpg"],
    "B739/UA": ["United Airlines Boeing 737-900 N38424.jpg"],
    "B763/OS": ["Austrian Airlines Boeing 767-300 OE-LAY.jpg"],
    "B763/UA": ["United Airlines Boeing 767-300 N663UA.jpg"],
    "B788/AA": ["American Airlines Boeing 787-8 N800AN.jpg"],
    "B788/LA": ["LATAM Boeing 787-8 CC-BBA.jpg"],
    "B788/TR": ["Scoot Boeing 787-8 9V-OFB.jpg"],
    "B789/TG": ["Thai Airways Boeing 787-9 HS-TWB.jpg"],
    "B789/TR": ["Scoot Boeing 787-9 9V-OJJ.jpg"],
    "B77W/CI": ["China Airlines Boeing 777-300ER B-18051.jpg"],
    "B77W/NZ": ["Air New Zealand Boeing 777-300ER ZK-OKQ.jpg"],
    "B78X/BR": ["EVA Air Boeing 787-10 B-17803.jpg"],
    "B78X/VN": ["Vietnam Airlines Boeing 787-10 VN-A878.jpg"],
    
    # A20N 空目录（航司有 A320neo，之前被误移到 A321）
    "A20N/AA": ["American Airlines Airbus A320neo N301AA.jpg"],
    "A20N/AI": ["Air India Airbus A320neo VT-EXB.jpg"],
    "A20N/CZ": ["China Southern Airlines Airbus A320neo B-308T.jpg"],
    "A20N/DL": ["Delta Air Lines Airbus A320neo N301DU.jpg"],
    "A20N/MF": ["Xiamen Airlines Airbus A320neo B-32CA.jpg"],
    "A20N/NZ": ["Air New Zealand Airbus A320neo ZK-NHA.jpg"],
    "A20N/UA": ["United Airlines Airbus A320neo N402UA.jpg"],
    "A20N/VN": ["Vietnam Airlines Airbus A320neo VN-A513.jpg"],
    "A20N/ZH": ["Shenzhen Airlines Airbus A320neo B-308M.jpg"],
    
    # A320 空目录
    "A320/AC": ["Air Canada Airbus A320 C-FDQQ.jpg"],
    "A320/AD": ["Azul Airbus A320 PR-YRA.jpg"],
    "A320/BA": ["British Airways Airbus A320 G-EUYR.jpg"],
    "A320/LA": ["LATAM Airbus A320 CC-BAS.jpg"],
    "A320/MS": ["EgyptAir Airbus A320 SU-GCD.jpg"],
    "A320/NZ": ["Air New Zealand Airbus A320 ZK-OAB.jpg"],
    "A320/OS": ["Austrian Airlines Airbus A320 OE-LBT.jpg"],
    "A320/PR": ["Philippine Airlines Airbus A320 RP-C8611.jpg"],
    "A320/TR": ["Scoot Airbus A320 9V-TAY.jpg"],
    
    # A321 空目录
    "A321/AD": ["Azul Airbus A321neo PR-YJF.jpg"],
    "A321/CI": ["China Airlines Airbus A321neo B-18101.jpg"],
    "A321/LA": ["LATAM Airbus A321 CC-BED.jpg"],
    "A321/OS": ["Austrian Airlines Airbus A321 OE-LBF.jpg"],
    "A321/QR": ["Qatar Airways Airbus A321 A7-AIB.jpg"],
    
    # 其他
    "A333/AD": ["Azul Airbus A330-300 PR-AIZ.jpg"],
    "A333/CI": ["China Airlines Airbus A330-300 B-18301.jpg"],
    "A333/DL": ["Delta Air Lines Airbus A330-300 N805NW.jpg"],
    "A20N/CI": ["China Airlines Airbus A321neo B-18101.jpg"],  # CI has A321neo, not A320neo
    "A20N/LA": ["LATAM Airbus A320neo CC-AWM.jpg"],
    "A20N/OS": ["Austrian Airlines Airbus A320neo OE-LZN.jpg"],
    "A20N/PR": ["Philippine Airlines Airbus A320neo RP-C8612.jpg"],
    "A20N/SA": ["South African Airways Airbus A320 ZS-SZZ.jpg"],  # SA has A320, not neo
    "B788/AC": ["Air Canada Boeing 787-8 C-GHPQ.jpg"],
    "B788/CZ": ["China Southern Boeing 787-8 B-2725.jpg"],
    "B788/HU": ["Hainan Airlines Boeing 787-8 B-2722.jpg"],
    "B788/MF": ["Xiamen Airlines Boeing 787-8 B-2760.jpg"],
}

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"completed_thumbnails": [], "completed_empties": [], "phase": "thumbnails"}

def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)

def download(target_rel, filename):
    """下载单张图片，返回 True/False"""
    parts = target_rel.split('/')
    dest_dir = os.path.join(BASE, parts[0], parts[1])
    os.makedirs(dest_dir, exist_ok=True)
    local = os.path.join(dest_dir, filename)
    
    if os.path.exists(local) and os.path.getsize(local) > 1000:
        return True  # already exists
    
    encoded = urllib.parse.quote(filename, safe='')
    url = f'{BASE_URL}{encoded}?width=1600'
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=45) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'image' not in ct:
                return False
            data = resp.read()
            with open(local, 'wb') as f:
                f.write(data)
        return True
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return False  # rate limited, try next batch
        print(f"  HTTP {e.code}: {filename[:50]}")
        return False
    except Exception as e:
        print(f"  Error: {e}")
        return False

def main():
    state = load_state()
    
    if state["phase"] == "thumbnails":
        # Find all thumbnails that haven't been completed
        all_thumbs = find_thumbnails()
        pending = [t for t in all_thumbs if t not in state["completed_thumbnails"]]
        
        if not pending:
            print("Phase 1 complete! Moving to phase 2...")
            state["phase"] = "empties"
            save_state(state)
        else:
            batch = pending[:BATCH_SIZE]
            print(f"Phase 1: Thumbnail upgrade ({len(state['completed_thumbnails'])}/{len(all_thumbs)} done)")
            
            for item in batch:
                # Extract filename from path
                fname = os.path.basename(item)
                print(f"  ↑ {item[:70]}")
                if download(item.replace('/'+fname, ''), fname):
                    state["completed_thumbnails"].append(item)
                    print(f"    ✅")
                else:
                    print(f"    ❌ (will retry)")
                time.sleep(DELAY)
            
            save_state(state)
            remaining = len(all_thumbs) - len(state["completed_thumbnails"])
            print(f"Done batch. {remaining} thumbnails remaining.")
            return
    
    # Phase 2: fill empty dirs
    if state["phase"] == "empties":
        # Get list of empty dirs
        empty_dirs = subprocess.run(
            ["find", BASE, "-type", "d", "-empty"],
            capture_output=True, text=True
        ).stdout.strip().split('\n')
        
        empty_rels = [d.replace(BASE+'/', '') for d in empty_dirs if d]
        
        # Filter to those we have filenames for and haven't completed
        pending = []
        for d in empty_rels:
            if d not in state["completed_empties"] and d in EMPTY_DIR_MAP:
                pending.append(d)
        
        if not pending:
            print("Phase 2 complete! No more known empty dirs to fill.")
            return
        
        batch = pending[:BATCH_SIZE]
        total_known = len([d for d in EMPTY_DIR_MAP if d not in state["completed_empties"]])
        print(f"Phase 2: Fill empty dirs ({len(state['completed_empties'])} done, ~{total_known} remaining)")
        
        for d in batch:
            filenames = EMPTY_DIR_MAP[d]
            success = False
            for fname in filenames:
                print(f"  ↓ {d}/{fname[:50]}")
                if download(d, fname):
                    state["completed_empties"].append(d)
                    print(f"    ✅")
                    success = True
                    break
                time.sleep(DELAY)
            if not success:
                print(f"    ❌ All attempts failed for {d}")
                state["completed_empties"].append(d)  # skip to avoid infinite retry
            time.sleep(2)
        
        save_state(state)
        
        # Final stats
        total = subprocess.run(
            ["find", BASE, "-type", "f", "(", "-name", "*.jpg", "-o", "-name", "*.png", ")"],
            capture_output=True, text=True
        ).stdout.strip().count('\n') + 1
        remaining_empty = int(subprocess.run(
            ["find", BASE, "-type", "d", "-empty"], capture_output=True, text=True
        ).stdout.strip().count('\n'))
        print(f"Done batch. Total: {total} images, {remaining_empty} empty dirs.")

if __name__ == "__main__":
    main()
