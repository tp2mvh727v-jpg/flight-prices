#!/usr/bin/env python3
"""
Strategic AirLabs cache warmer — burns ~200 API calls per run.
Schedule: 4-5 runs/month to use the 1000-call free quota efficiently.

Strategy: prioritize routes by search volume potential, not geographic spread.
"""
import urllib.request, json, time, sys

BASE = "http://localhost:5088"

# Tier 1: Chinese gateway ↔ world hubs (highest search volume)
TIER1 = [
    ("PEK","SYD"),("PEK","LHR"),("PEK","LAX"),("PEK","CDG"),("PEK","FRA"),
    ("PEK","JFK"),("PEK","SFO"),("PEK","SIN"),("PEK","BKK"),("PEK","DXB"),
    ("PVG","SYD"),("PVG","LHR"),("PVG","LAX"),("PVG","CDG"),("PVG","SFO"),
    ("CAN","SYD"),("CAN","LHR"),("CAN","LAX"),
]
# Tier 2: Non-China ↔ world hubs
TIER2 = [
    ("SYD","LHR"),("SYD","LAX"),("SYD","SIN"),("SYD","DXB"),
    ("LHR","JFK"),("LHR","DXB"),("LHR","SIN"),
    ("NRT","SYD"),("NRT","LAX"),("NRT","LHR"),
    ("ICN","SYD"),("ICN","LAX"),("ICN","LHR"),
    ("HKG","SYD"),("HKG","LAX"),("HKG","LHR"),
]
# Tier 3: Regional connections
TIER3 = [
    ("PEK","NRT"),("PEK","ICN"),("PEK","HKG"),("PEK","TPE"),
    ("PVG","NRT"),("PVG","ICN"),("PVG","TPE"),
    ("SIN","SYD"),("BKK","SYD"),("KUL","SYD"),
]

ALL = TIER1 + TIER2 + TIER3

def warm_connections(dep, arr):
    url = f"{BASE}/api/airlabs-connections?dep={dep}&arr={arr}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        return data.get("count", 0)
    except Exception as e:
        print(f"  ✗ {e}", end="")
        return 0

def warm_direct(dep, arr):
    url = f"{BASE}/api/airlabs-routes?dep={dep}&arr={arr}"
    try:
        urllib.request.urlopen(urllib.request.Request(url), timeout=10)
        return True
    except:
        return False

if __name__ == "__main__":
    tier = sys.argv[1] if len(sys.argv) > 1 else "1"
    routes = {"1": TIER1, "2": TIER2, "3": TIER3, "all": ALL}.get(tier, TIER1)
    
    total_conns = 0
    for dep, arr in routes:
        n = warm_connections(dep, arr)
        warm_direct(dep, arr)
        marker = "✓" if n > 0 else "○"
        print(f"  {marker} {dep}→{arr}: {n} conns")
        total_conns += n
        time.sleep(0.3)
    
    print(f"\nDone — {len(routes)} routes, {total_conns} connections cached (7-day TTL)")
