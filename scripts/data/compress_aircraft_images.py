#!/usr/bin/env python3
"""compress_aircraft_images.py — 批量压缩飞机图片生成缩略图
输出到 static/images/aircraft-thumb/{model}/{airline}/，最长边 800px，JPEG 质量 82。
"""
import os, subprocess, sys

BASE = "/Users/apple/Desktop/CC_test/flight-prices"
SRC = f"{BASE}/static/images/aircraft"
DST = f"{BASE}/static/images/aircraft-thumb"

ok, skip, fail = 0, 0, 0
for root, dirs, files in os.walk(SRC):
    for f in sorted(files):
        if not f.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        src_path = os.path.join(root, f)
        rel = os.path.relpath(root, SRC)
        dst_dir = os.path.join(DST, rel)
        os.makedirs(dst_dir, exist_ok=True)
        dst_path = os.path.join(dst_dir, os.path.splitext(f)[0] + ".jpg")
        try:
            # 已存在且源未变 → 跳过
            if os.path.exists(dst_path) and os.path.getmtime(dst_path) >= os.path.getmtime(src_path):
                skip += 1
                continue
            r = subprocess.run(
                ["sips", "-Z", "800", "-s", "format", "jpeg", "-s", "formatOptions", "82",
                 src_path, "--out", dst_path],
                capture_output=True, timeout=60)
            if r.returncode == 0 and os.path.exists(dst_path):
                ok += 1
            else:
                fail += 1
                print(f"FAIL {rel}/{f}: {r.stderr.decode()[:100]}")
        except Exception as e:
            fail += 1
            print(f"ERR {rel}/{f}: {e}")

# 汇总
sizes_src = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(SRC) for f in fs if f.lower().endswith((".jpg",".jpeg",".png")))
sizes_dst = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(DST) for f in fs if f.lower().endswith(".jpg"))
print(f"\n===== 压缩完成 ===== 新生成 {ok} / 跳过 {skip} / 失败 {fail}")
if sizes_dst:
    print(f"源图总大小: {sizes_src/1024/1024:.1f}MB → 缩略图总大小: {sizes_dst/1024/1024:.1f}MB (压缩 {(1-sizes_dst/max(sizes_src,1))*100:.0f}%)")
sys.exit(0 if fail == 0 else 1)
