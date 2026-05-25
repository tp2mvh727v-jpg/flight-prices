#!/usr/bin/env python3
"""修复 aircraft 图片库：删除错误图片、修正目录错放、清理重复文件"""

import os, shutil

BASE = os.path.expanduser("~/Desktop/CC_test/flight-prices/static/images/aircraft")

def rm(path):
    """安全删除，打印日志"""
    full = os.path.join(BASE, path)
    if os.path.exists(full):
        os.remove(full)
        print(f"  🗑 DELETED: {path}")
    else:
        print(f"  ⚠ NOT FOUND: {path}")

def mv(src, dst):
    """移动文件，目标目录不存在则创建"""
    full_src = os.path.join(BASE, src)
    full_dst = os.path.join(BASE, dst)
    os.makedirs(os.path.dirname(full_dst), exist_ok=True)
    if os.path.exists(full_src):
        if os.path.exists(full_dst):
            # 目标已存在，删除源
            os.remove(full_src)
            print(f"  📦 REMOVED DUP: {src} (target exists: {dst})")
        else:
            shutil.move(full_src, full_dst)
            print(f"  📦 MOVED: {src} → {dst}")
    else:
        print(f"  ⚠ NOT FOUND: {src}")

print("=" * 60)
print("PHASE 1: 删除明确错误的图片 (引擎局部/航司错误)")
print("=" * 60)

# 1. Engine-only shots
rm("B78X/BA/A Rolls Royce Trent 1000 Engine on British Airways B787-10 G-ZBLC.jpg")
rm("B738/DL/737-700 Engine Nacelle without Engine.jpg")

# 2. Wrong airline
rm("B738/AM/Hannover Airport Tailwind Airlines Boeing 737-8Z9(WL) TC-TLJ (DSC03319).jpg")
rm("A333/5J/9H-POP - Airbus A330-343 - US-Bangla Airlines - 1445 - VGHS.jpg")

print("\n" + "=" * 60)
print("PHASE 2: 修正型号错放的图片")
print("=" * 60)

# A20N → A321 (这些是 A321neo，不是 A320neo)
a20n_to_a321 = [
    ("A20N/VN/20250204 Airbus A321-272N of Vietnam Airlines (VN-A512) at CGO 01.jpg",
     "A321/VN/20250204 Airbus A321-272N of Vietnam Airlines (VN-A512) at CGO 01.jpg"),
    ("A20N/UA/United Airlines A321 neo.jpg",
     "A321/UA/United Airlines A321 neo.jpg"),
    ("A20N/MF/Xiamen Air Airbus A321neo B-32GA taking off from Taoyuan February 2026 2.jpg",
     "A321/MF/Xiamen Air Airbus A321neo B-32GA taking off from Taoyuan February 2026 2.jpg"),
    ("A20N/CZ/Hamburg-Finkenwerder Airport China Southern Airlines Airbus A321-251NX B-32M6 (DSC01384).jpg",
     "A321/CZ/Hamburg-Finkenwerder Airport China Southern Airlines Airbus A321-251NX B-32M6 (DSC01384).jpg"),
    ("A20N/ZH/Shenzhen Airlines Airbus A321neo B-32DV at Taoyuan February 2026 2.jpg",
     "A321/ZH/Shenzhen Airlines Airbus A321neo B-32DV at Taoyuan February 2026 2.jpg"),
    ("A20N/AA/American Airlines Airbus A321neo N455AN departing Boston March 2025 2.jpg",
     "A321/AA/American Airlines Airbus A321neo N455AN departing Boston March 2025 2.jpg"),
    ("A20N/DL/Delta Air Lines Airbus A321neo N591DT departing Boston March 2025.jpg",
     "A321/DL/Delta Air Lines Airbus A321neo N591DT departing Boston March 2025.jpg"),
]

for src, dst in a20n_to_a321:
    mv(src, dst)

# A20N/NZ: A321-271NX → move to A321
mv("A20N/NZ/Air New Zealand Airbus A321-271NX ZK-OYB - Star Alliance Livery.jpg",
   "A321/NZ/Air New Zealand Airbus A321-271NX ZK-OYB - Star Alliance Livery.jpg")

# A320/AC: filename says A321 → move to A321
mv("A320/AC/Air Canada Airbus A321-211 C-GJWI.jpg",
   "A321/AC/Air Canada Airbus A321-211 C-GJWI.jpg")

# A321/QR: filename says A320 → move to A320
mv("A321/QR/Qatar Airways A320-232 (A7-AHB) at Berlin Tegel Airport.jpg",
   "A320/QR/Qatar Airways A320-232 (A7-AHB) at Berlin Tegel Airport.jpg")

# A321/AD: filename says A320neo → move to A20N
mv("A321/AD/PR-YRW, Airbus A320neo of Azul Linhas Aéreas Brasileiras and PT-MXB, Airbus A321 of TAM Linhas Aéreas at Salgado Filho International Airport, 2019.jpg",
   "A20N/AD/PR-YRW, Airbus A320neo of Azul Linhas Aéreas Brasileiras and PT-MXB, Airbus A321 of TAM Linhas Aéreas at Salgado Filho International Airport, 2019.jpg")

print("\n" + "=" * 60)
print("PHASE 3: 清理重复文件 (删除放在错误机型目录的副本)")
print("=" * 60)

# B788 duplicates → filename says 787-9, should only be in B789
dupes_remove_from_b788 = [
    "B788/AC/Air Canada Boeing 787-9 Dreamliner C-FVND approaching EWR Airport.jpg",
    "B788/MF/XiamenAir Boeing 787-9 Dreamliner B-1356 (United Nations special livery) taxiing at JFK Airport.jpg",
    "B788/CZ/B-1128 AIRCRAFT Boeing 787-9 Dreamliner.jpg",
    "B788/HU/Hainan Airlines B787-9 (B-7880) @ MAN, Aug 2017.jpg",
]
for p in dupes_remove_from_b788:
    rm(p)

# B788/AI: "AI B787" - ambiguous, keep B788 since Air India has 787-8s
# (keep both for now, can't determine variant)

# B788/AM: "AeroMexico Boeing 787" - AM has both 787-8 and 787-9
# (keep both for now)

# B788/ET: "Ethiopian Airlines Boeing 787" - ET has both
# (keep both for now)

# B788/TG: "Thai 787-8" → KEEP B788, remove B789 copy
rm("B789/TG/HS-TQD - Thai Airways International - Boeing 787-8 Dreamliner - MSN 35320 - VGHS.jpg")

# A359 duplicates → filename says A350-941 (=A350-900, so A359 is correct)
rm("A35K/PR/Philippines Airlines Airbus A350-941 RP-C3506.jpg")

# A35K/CX: Cathay A350-1041 (=A350-1000, so A35K is correct)
rm("A359/CX/Cathay Pacific A350-1041.jpg")

# A35K/JL: "A350-900＆A350-1000" - ambiguous, keep both
# A35K/ET: "Ethiopian Airlines A350 ET-ATQ" - ET has both A359 and A35K
# (keep both for now)

# A332/DL: N802NW is A330-200 → KEEP A332, remove A333 copy
rm("A333/DL/N802NW Delta Air Lines (5492060857).jpg")

# A320/QR: A320-232 → KEEP A320, remove A321 copy (already moved A321→A320 above via mv)

# B789/NH vs B78X/NH: "STAR ALLIANCE(All Nippon Airways1)" - ambiguous
# (keep both for now)

# B739/CM: "B737 Copa Airlines at GDL" - ambiguous 737 variant
# (keep both for now)

# A320/MS → A20N/MS: A320-251N = A320neo → correct dir is A20N
rm("A320/MS/Berlin Brandenburg Airport EgyptAir Airbus A320-251N SU-GFO (DSC00291).jpg")

# A320/AD → A20N/AD: A320neo
rm("A320/AD/A320neo Azul SBPA (31500553833).jpg")

# A321/NZ → A20N/NZ: A321-271NX (this was already moved from A20N, so the dup at A321 should remain)
# Wait - we already moved A20N/NZ to A321/NZ. But the A321/NZ already exists from the previous sync.
# Actually, looking again: A20N/NZ was the A321 file, and we moved it to A321/NZ. 
# The original at A321/NZ/Air New Zealand Airbus A321-271NX ZK-OYB - Star Alliance Livery.jpg 
# should be the same file. So there might be a duplicate. Let me check...

print("\n" + "=" * 60)
print("PHASE 4: 统计修复结果")
print("=" * 60)

# Count remaining files
result = os.popen(f"find {BASE} -type f \\( -name '*.jpg' -o -name '*.png' \\) | wc -l").read().strip()
print(f"Remaining images: {result}")

# List empty dirs
empty = os.popen(f"find {BASE} -type d -empty | sort").read().strip()
empty_count = len(empty.split('\n')) if empty else 0
print(f"Empty directories: {empty_count}")
if empty:
    for d in empty.split('\n'):
        print(f"  {d.replace(BASE + '/', '')}")

print("\n✅ 修复完成！运行 sync_aircraft_images.py 同步映射。")
