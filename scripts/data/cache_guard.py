#!/usr/bin/env python3
"""
cache_guard.py — AirLabs 缓存健康巡检 + 配额卫士。

保护 AirLabs 免费额度（1000 次/月，key 2026-11-25 到期）：
  - stats()          缓存新鲜度统计（fresh / stale / expired_90d）
  - monthly_usage()  以本月写入的缓存文件数估算配额用量
  - should_fetch()   本月用量 >= 800 时返回 False（保留 20% 缓冲）

CLI:
  python3 scripts/data/cache_guard.py                打印巡检报告
  python3 scripts/data/cache_guard.py --purge-90d     dry-run，只打印待删数量
  python3 scripts/data/cache_guard.py --purge-90d --yes   实际删除 90 天以上缓存
"""

import sys
import time
from datetime import datetime
from pathlib import Path

CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "airlabs_cache"

FRESH_TTL = 7 * 86400       # 新鲜窗口（7 天）
EXPIRED_TTL = 90 * 86400    # 硬过期阈值（可清理）
MONTHLY_LIMIT = 1000        # AirLabs 免费额度
QUOTA_SOFT_CEILING = 800    # 用量达到 800 即停止外呼


def _cache_files():
    if not CACHE_DIR.exists():
        return []
    return list(CACHE_DIR.glob("*.json"))


def _month_start_ts(now):
    dt = datetime.fromtimestamp(now)
    start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start.timestamp()


def stats():
    """返回 {total, fresh, stale, expired_90d, by_route_top10}。

    fresh:        < 7 天
    stale:        7 ~ 90 天（可先用后刷新）
    expired_90d:  >= 90 天（清理候选）
    """
    files = _cache_files()
    now = time.time()
    total = len(files)
    fresh = 0
    stale = 0
    expired_90d = 0
    by_route = {}

    for f in files:
        age = now - f.stat().st_mtime
        if age < FRESH_TTL:
            fresh += 1
        elif age < EXPIRED_TTL:
            stale += 1
        else:
            expired_90d += 1

        # 按航线归组：剥离 |AIRLINE 后缀与 flight_ 前缀
        name = f.stem
        if name.startswith("flight_"):
            route = name[len("flight_"):]
        elif "|" in name:
            route = name.split("|")[0]
        else:
            route = name
        by_route[route] = by_route.get(route, 0) + 1

    by_route_top10 = sorted(by_route.items(), key=lambda kv: kv[1], reverse=True)[:10]

    return {
        "total": total,
        "fresh": fresh,
        "stale": stale,
        "expired_90d": expired_90d,
        "by_route_top10": by_route_top10,
    }


def monthly_usage():
    """以本月写入的缓存文件数估算配额用量（上限 1000）。"""
    files = _cache_files()
    now = time.time()
    month_start = _month_start_ts(now)
    usage = 0
    for f in files:
        if f.stat().st_mtime >= month_start:
            usage += 1
    return min(usage, MONTHLY_LIMIT)


def should_fetch():
    """本月用量 >= 800 时返回 False，触发降级、停止外呼。"""
    return monthly_usage() < QUOTA_SOFT_CEILING


def _purge_90d(dry_run=True):
    files = _cache_files()
    now = time.time()
    doomed = [f for f in files if (now - f.stat().st_mtime) >= EXPIRED_TTL]
    if not dry_run:
        for f in doomed:
            try:
                f.unlink()
            except OSError:
                pass
    return len(doomed)


if __name__ == "__main__":
    dry_run = "--yes" not in sys.argv
    purge = "--purge-90d" in sys.argv

    if purge:
        n = _purge_90d(dry_run=dry_run)
        if dry_run:
            print(f"[dry-run] 待删除 {n} 个 90 天以上缓存文件（加 --yes 实际删除）")
        else:
            print(f"已删除 {n} 个 90 天以上缓存文件")
    else:
        s = stats()
        u = monthly_usage()
        print("AirLabs 缓存健康报告")
        print(f"  total:        {s['total']}")
        print(f"  fresh (<7d):  {s['fresh']}")
        print(f"  stale (7-90d):{s['stale']}")
        print(f"  expired_90d:  {s['expired_90d']}")
        print(f"  本月用量估算:  {u}/{MONTHLY_LIMIT}")
        print(f"  配额卫士:      {'已触发(停止外呼)' if not should_fetch() else '正常'}")
        print("  top10 航线:")
        for route, n in s["by_route_top10"]:
            print(f"    {route}: {n}")
