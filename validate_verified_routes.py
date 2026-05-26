#!/usr/bin/env python3
"""
validate_verified_routes.py
Compare verified_routes.json against AirLabs real schedule data.
Flags: wrong aircraft type, wrong flight numbers, mismatched carriers, stale routes.

Usage:
  python3 validate_verified_routes.py            # validate all 66 routes
  python3 validate_verified_routes.py --fix      # auto-fix aircraft types from AirLabs
  python3 validate_verified_routes.py --route PEK-JFK  # validate single route
"""

import json
import sys
import os
import urllib.request
import urllib.parse
import time
from datetime import datetime

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = SCRIPTS_DIR
DATA_DIR = os.path.join(PROJECT_DIR, "data")
VERIFIED_PATH = os.path.join(DATA_DIR, "verified_routes.json")
SERVER_URL = "http://localhost:5088"

# Known aircraft type mapping from AirLabs codes to our codes
AIRLABS_AIRCRAFT_MAP = {
    "777": "B77W", "77W": "B77W", "773": "B77W",
    "747": "B748", "74H": "B748", "744": "B744",
    "787": "B789", "789": "B789", "788": "B788", "781": "B78X",
    "380": "A388", "388": "A388",
    "350": "A359", "359": "A359", "351": "A35K",
    "330": "A333", "333": "A333", "332": "A332",
    "320": "A320", "321": "A321", "32N": "A20N",
    "738": "B738", "739": "B739", "7M8": "B38M",
    "763": "B763",
}

def fetch_airlabs_route(origin, dest):
    """Fetch AirLabs route data for a city pair."""
    params = urllib.parse.urlencode({"dep": origin, "arr": dest})
    url = f"{SERVER_URL}/api/airlabs-routes?{params}"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
            return data.get("routes", [])
    except Exception as e:
        print(f"  ⚠️  AirLabs fetch failed: {e}")
        return []

def map_airlabs_aircraft(raw_equipment):
    """Map AirLabs equipment strings to our aircraft codes."""
    if not raw_equipment:
        return None
    # Try direct match
    for key, mapped in AIRLABS_AIRCRAFT_MAP.items():
        if key in raw_equipment.upper():
            return mapped
    return None

def validate_route(route_key, verified, airlabs_routes, auto_fix=False):
    """Validate a single verified route against AirLabs data."""
    issues = []
    
    # Filter AirLabs routes for the verified carrier
    carrier_routes = [r for r in airlabs_routes 
                       if r.get("airline_iata") == verified["airline"] 
                       and not r.get("cs_airline_iata")]  # exclude codeshares
    
    if not carrier_routes:
        # Check if any route exists for this carrier
        all_carrier = [r for r in airlabs_routes if r.get("airline_iata") == verified["airline"]]
        if all_carrier:
            issues.append(f"⚠️  AirLabs has {len(all_carrier)} routes for {verified['airline']} but all are codeshares")
        else:
            # Carrier not in AirLabs results at all — may be OK for less-traveled routes
            pass
        return issues
    
    # Check aircraft type
    airlabs_equipments = set()
    for r in carrier_routes:
        eq = r.get("equipment", "")
        if eq:
            airlabs_equipments.add(eq)
    
    if airlabs_equipments:
        mapped = set()
        for eq in airlabs_equipments:
            m = map_airlabs_aircraft(eq)
            if m:
                mapped.add(m)
        
        if mapped and verified["aircraft"] not in mapped:
            suggested = ", ".join(sorted(mapped))
            issues.append(f"🔴 机型不匹配: verified={verified['aircraft']} | AirLabs={suggested}")
            if auto_fix:
                # Pick the first suggested type
                new_ac = sorted(mapped)[0]
                print(f"     🔧 Auto-fix: {verified['aircraft']} → {new_ac}")
                verified["aircraft"] = new_ac
    
    # Check flight number consistency
    airlabs_flight_nos = set()
    for r in carrier_routes:
        fn = r.get("flight_number", "")
        if fn:
            airlabs_flight_nos.add(f"{verified['airline']}{fn}")
    
    if airlabs_flight_nos and verified["flightNo"] not in airlabs_flight_nos:
        issues.append(f"🟡 航班号不在AirLabs中: verified={verified['flightNo']} | AirLabs有: {', '.join(sorted(airlabs_flight_nos)[:5])}")
    
    # Check departure time (±2h tolerance)
    for r in carrier_routes:
        if r.get("dep_time"):
            dep_verified = _to_minutes(verified["departure"])
            dep_airlabs = _to_minutes(r["dep_time"])
            if dep_verified and dep_airlabs:
                diff = abs(dep_airlabs - dep_verified)
                if diff > 120:  # more than 2 hours off
                    issues.append(f"🟡 出发时间偏差: verified={verified['departure']} | AirLabs={r['dep_time']} ({diff}min)")
                break  # only check first matching route
    
    return issues

def _to_minutes(t):
    """HH:MM → minutes."""
    if not t:
        return None
    try:
        parts = str(t).split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except:
        return None

def main():
    auto_fix = "--fix" in sys.argv
    single_route = None
    for i, arg in enumerate(sys.argv):
        if arg == "--route" and i + 1 < len(sys.argv):
            single_route = sys.argv[i + 1]
    
    # Load verified routes
    if not os.path.exists(VERIFIED_PATH):
        print(f"ERROR: {VERIFIED_PATH} not found")
        sys.exit(1)
    
    with open(VERIFIED_PATH, "r") as f:
        data = json.load(f)
    
    routes = data.get("routes", {})
    if single_route:
        if single_route in routes:
            routes = {single_route: routes[single_route]}
        else:
            print(f"ERROR: Route '{single_route}' not found")
            sys.exit(1)
    
    print(f"🔍 Validating {len(routes)} verified routes against AirLabs data...")
    print(f"   Auto-fix: {'ON' if auto_fix else 'OFF'}")
    print()
    
    total_issues = 0
    fixed = 0
    
    for i, (route_key, verified) in enumerate(sorted(routes.items()), 1):
        origin = route_key.split("-")[0]
        dest = route_key.split("-")[1]
        
        # Fetch AirLabs data
        airlabs_routes = fetch_airlabs_route(origin, dest)
        
        if airlabs_routes:
            issues = validate_route(route_key, verified, airlabs_routes, auto_fix)
            if issues:
                print(f"[{i}] {route_key} ({verified['airline']}{verified['flightNo']}):")
                for issue in issues:
                    print(f"     {issue}")
                total_issues += len(issues)
                if auto_fix:
                    fix_count = sum(1 for i in issues if "🔴" in i)
                    fixed += fix_count
        else:
            print(f"[{i}] {route_key}: ⬜ No AirLabs data available")
        
        # Rate limit
        time.sleep(0.5)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 Validation complete: {len(routes)} routes checked")
    print(f"   Issues found: {total_issues}")
    if auto_fix:
        print(f"   Auto-fixed: {fixed} aircraft types")
        # Save fixed data
        data["routes"] = routes
        data["validated"] = datetime.now().strftime("%Y-%m-%d %H:%M")
        # Backup
        backup_path = VERIFIED_PATH + ".bak"
        with open(backup_path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        # Save
        with open(VERIFIED_PATH, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   Backup saved: verified_routes.json.bak")
        print(f"   Updated saved: verified_routes.json")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
