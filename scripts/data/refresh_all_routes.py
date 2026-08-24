import json, time, sys
sys.path.insert(0, "/Users/apple/Desktop/CC_test/flight-prices")
from scripts.data.airlabs_fetcher import fetch_routes

BASE = "/Users/apple/Desktop/CC_test/flight-prices"
vr = json.load(open(f"{BASE}/data/verified_routes.json"))["routes"]

ok, fail, rl = 0, 0, 0
fails = []
total = len(vr)
print(f"开始拉取 {total} 条方向性航线（force_refresh）...", flush=True)
t0 = time.time()
for i, (key, v) in enumerate(vr.items(), 1):
    o, a = key.split("-")
    for attempt in range(4):
        try:
            r = fetch_routes(o, a, force_refresh=True)
        except Exception as e:
            r = {"error": str(e)}
        err = str(r.get("error", "")).lower()
        if any(s in err for s in ("429", "limit", "too many", "quota")):
            rl += 1
            print(f"  限流({err[:50]}), 暂停 60s", flush=True)
            time.sleep(60)
            continue
        if r.get("routes") is not None and "not configured" not in err and "api key" not in err:
            ok += 1
            break
        fail += 1
        fails.append((key, err[:80]))
        break
    if i % 50 == 0 or i == total:
        el = time.time() - t0
        print(f"[{i}/{total}] ok={ok} fail={fail} rl={rl} 用时{el:.0f}s", flush=True)
    time.sleep(1.2)

print(f"\n===== 完成 ===== 成功={ok} 失败={fail} 限流={rl} 总耗时{(time.time()-t0)/60:.1f}分钟", flush=True)
if fails:
    print("失败列表(前20):")
    for k, e in fails[:20]:
        print(f"  {k}: {e}", flush=True)
