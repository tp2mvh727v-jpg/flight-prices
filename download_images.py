#!/usr/bin/env python3
"""
下载 Wikimedia Commons 飞行器图片到本地素材库 (全量验证版)
用法: python download_images.py
输出: static/images/aircraft/
"""

import os
import sys
import time
import urllib.request
import urllib.parse
import ssl

# —— 机型 → 航司 → Wikimedia Commons 文件名（全部已通过 API 验证） ——
#   _generic = 无特定航司 (原型机/制造商涂装等)
AIRCRAFT_FILES = {
    'A359': {
        'CA':       ['B-321M Airbus A350-900 Air China LHR 30.3.21.jpg'],
        '_generic': ['Airbus A350-900 Maiden Flight (Take-off) 2.JPG'],
    },
    'A35K': {
        '_generic': ['Airbus A350-1000 F-WMIL 2.jpg'],
    },
    'A333': {
        'D7':       ['Air Asia X Airbus A330-300.JPG'],
    },
    'B789': {
        'AF':       ['Air France, F-HRBI, Boeing 787-9 Dreamliner (49589490187).jpg'],
        '_generic': ['Boeing 787-9 View.jpg'],
    },
    'B788': {
        'NH':       ['Boeing 787-8 Dreamliner, All Nippon Airways - ANA AN1955006.jpg'],
    },
    'B77W': {
        'EK':       ['Emirates Boeing 777-300ER.JPG'],
        'AA':       ['American Airlines Boeing 777-300ER (cropped).jpg'],
    },
    'A388': {
        'LH':       ['Lufthansa Airbus A380-841; D-AIMC@FRA;06.07.2011 603bm (5912728290).jpg'],
    },
    'B748': {
        'LH':       ['Lufthansa 747-8I D-ABYA.JPG'],
    },
    'A320': {
        '_generic': ['Airbus A320-214 (11-4-2022).jpg'],
    },
    'A321': {
        '_generic': ['Airbus A321-231 MetroJet EI-ETH.JPG'],
    },
    'A20N': {
        '_generic': ['Airbus A320neo landing after first flight.jpg'],
    },
    'B738': {
        'FR':       ['Boeing737-800Ryanair.JPG'],
    },
    'B739': {
        'DL':       ['Delta Boeing 737-900ER N837DN BWI MD1.jpg'],
    },
    'B38M': {
        'X3':       ['TUIfly Boeing 737 MAX 8 D-AMAH.jpg'],
    },
}

# ============================================================

OUT_DIR = os.path.join(os.path.dirname(__file__), 'static', 'images', 'aircraft')
BASE_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
TIMEOUT = 30
DELAY = 1.5  # 避免触发 Wikimedia 速率限制

os.makedirs(OUT_DIR, exist_ok=True)
ssl_ctx = ssl.create_default_context()

total = sum(len(files) for airlines in AIRCRAFT_FILES.values() for files in airlines.values())
done = 0
failed = []

print(f"→ 开始下载 {total} 张图片到 {OUT_DIR}")
print(f"→ 目录结构: 机型/航司/文件名")
print(f"→ 每次请求间隔 {DELAY}s，预计耗时 ~{int(total * DELAY / 60)} 分钟\n")

for model, airlines in AIRCRAFT_FILES.items():
    for airline, filenames in airlines.items():
        air_dir = os.path.join(OUT_DIR, model, airline)
        os.makedirs(air_dir, exist_ok=True)

        for fname in filenames:
            done += 1
            local_path = os.path.join(air_dir, fname)

            # 跳过已下载的文件
            if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
                print(f"  [{done}/{total}] SKIP (已存在)  {model}/{airline}/{fname}")
                continue

            # 构建 URL: Special:FilePath 会 302→Redirect→upload.wikimedia.org
            encoded = urllib.parse.quote(fname, safe='')
            url = f'{BASE_URL}{encoded}?width=800'

            print(f"  [{done}/{total}] GET  {model}/{airline}/{fname} ...", end=' ', flush=True)
            try:
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'AeroHub-ImageCollector/1.0 (local dev tool)'
                })
                with urllib.request.urlopen(req, context=ssl_ctx, timeout=TIMEOUT) as resp:
                    content_type = resp.headers.get('Content-Type', '')
                    if 'image' not in content_type:
                        print(f"SKIP (非图片: {content_type})")
                        failed.append((model, airline, fname, f'非图片: {content_type}'))
                        continue

                    data = resp.read()
                    with open(local_path, 'wb') as f:
                        f.write(data)
                    size_kb = len(data) / 1024
                    print(f"OK ({size_kb:.0f} KB)")
            except urllib.error.HTTPError as e:
                print(f"FAIL (HTTP {e.code})")
                failed.append((model, airline, fname, f'HTTP {e.code}'))
            except Exception as e:
                print(f"FAIL ({e})")
                failed.append((model, airline, fname, str(e)))

            time.sleep(DELAY)

print(f"\n{'='*60}")
print(f"下载完成: {done - len(failed)}/{done} 成功")
if failed:
    print(f"\n失败列表 ({len(failed)} 项):")
    for model, airline, fname, reason in failed:
        print(f"  ✗ {model}/{airline}/{fname}  — {reason}")
else:
    print("全部图片下载成功！")
print(f"\n图片目录: {OUT_DIR}")
