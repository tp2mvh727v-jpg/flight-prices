#!/usr/bin/env python3
"""refresh_progress.py — 显示 AirLabs 全量拉取进度（独立监视器，不干扰拉取进程）
进度依据: data/airlabs_cache/ 中 24 小时内被 force_refresh 更新的机场对缓存文件数 / 545。
"""
import os, sys, time

BASE = "/Users/apple/Desktop/CC_test/flight-prices"
cache_dir = f"{BASE}/data/airlabs_cache"
TOTAL = 545
WINDOW = 86400  # 24h

# 统计 24h 内刷新的机场对缓存（排除 flight_* 航班号缓存）
refreshed = 0
for f in os.listdir(cache_dir):
    if not f.endswith(".json") or f.startswith("flight_"):
        continue
    p = os.path.join(cache_dir, f)
    try:
        if time.time() - os.path.getmtime(p) < WINDOW:
            refreshed += 1
    except OSError:
        pass

pct = refreshed / TOTAL
bar_len = 24
filled = int(pct * bar_len)
bar = "█" * filled + "░" * (bar_len - filled)

# 进程运行时长
elapsed = 0
proc = os.popen("pgrep -f refresh_all_routes.py | head -1").read().strip()
if proc:
    et = os.popen(f"ps -o etime= -p {proc}").read().strip()
    # 解析 HH:MM:SS / MM:SS
    parts = et.strip().split(":")
    if len(parts) == 3:
        elapsed = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    elif len(parts) == 2:
        elapsed = int(parts[0]) * 60 + int(parts[1])

rate = refreshed / elapsed if elapsed > 0 else 0
eta = (TOTAL - refreshed) / rate / 60 if rate > 0 else 0

alive = bool(proc)
print(f"{'🔄 拉取中' if alive else '⏹ 进程已结束'}")
print(f"[{bar}] {pct*100:5.1f}%  ({refreshed}/{TOTAL} 条)")
if alive:
    print(f"已运行 {elapsed//60}分{elapsed%60:02d}秒 | 速度 {rate:.2f} 条/秒 | 预计剩余 ~{eta:.0f} 分钟")
else:
    print(f"共刷新 {refreshed} 条")
sys.exit(0)
