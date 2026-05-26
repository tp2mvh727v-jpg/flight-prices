#!/usr/bin/env python3
"""
build_route_db.py
Parse OpenFlights data → Aero-Hub local route database.
Output: data/route_db.json — used by flightService.js for realistic route generation.
"""

import csv
import json
from collections import defaultdict

ROUTES_FILE = "data/openflights_routes.dat"
AIRLINES_FILE = "data/openflights_airlines.dat"
OUTPUT = "data/route_db.json"

# Our supported carrier IATA codes (from flightService.js MOCK_CARRIERS)
SUPPORTED_CARRIERS = {
    'CX','SQ','KE','NH','QF','JL','EK','QR','TK','EY',
    'LH','AF','BA','KL','VS',
    'SK','AY','LX','OS','TP','LO','EI','SN',
    'UA','DL','AA','AC','LA',
    'OZ','BR','CI','NZ','TG','VN','PR','MH','GA','AI',
    'GF','WY',
    'ET','SA',
    'CA','CZ','MU','HU','3U','MF','ZH',
    'TR','MS',
}

# ── Parse airlines.dat ──
airlines = {}
with open(AIRLINES_FILE, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if len(row) < 8:
            continue
        # Format: ID, Name, Alias, IATA, ICAO, Callsign, Country, Active
        airline_id, name, alias, iata, icao, callsign, country, active = row[:8]
        iata = iata.strip()
        active = active.strip()
        if iata in SUPPORTED_CARRIERS and active == 'Y':
            airlines[iata] = {
                'name': name.strip(),
                'country': country.strip(),
                'icao': icao.strip(),
            }

print(f"Loaded {len(airlines)} supported airlines from OpenFlights")

# ── Parse routes.dat ──
route_index = defaultdict(lambda: defaultdict(set))
equipment_index = defaultdict(lambda: defaultdict(set))
carrier_route_count = defaultdict(int)

parsed = 0
skipped = 0

with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if len(row) < 9:
            skipped += 1
            continue
        
        # Format: Airline, AirlineID, Src, SrcID, Dst, DstID, Codeshare, Stops, Equipment
        airline_iata = row[0].strip()
        src_iata = row[2].strip()
        dst_iata = row[4].strip()
        
        if airline_iata == '\\N' or src_iata == '\\N' or dst_iata == '\\N':
            skipped += 1
            continue
        if not airline_iata or not src_iata or not dst_iata:
            skipped += 1
            continue
        if airline_iata not in SUPPORTED_CARRIERS:
            skipped += 1
            continue
        
        equipment = row[8].strip() if len(row) > 8 else ''
        if equipment and equipment != '\\N':
            # Split "748 77W" → {"748", "77W"} and add individually for proper dedup
            for equip_code in equipment.split():
                equipment_index[f"{src_iata}-{dst_iata}"][airline_iata].add(equip_code)
        
        route_index[src_iata][dst_iata].add(airline_iata)
        carrier_route_count[airline_iata] += 1
        parsed += 1

print(f"Parsed {parsed} routes, skipped {skipped}")

# ── Convert to JSON-serializable ──
route_db = {}
for src, dsts in route_index.items():
    route_db[src] = {dst: sorted(carriers) for dst, carriers in dsts.items()}

equip_db = {}
for route_key, carrier_equip in equipment_index.items():
    equip_db[route_key] = {c: sorted(e) for c, e in carrier_equip.items()}

# ── Merge supplementary equipment (known multi-type routes) ──
SUPPLEMENT_FILE = "data/equipment_supplement.json"
import os
if os.path.exists(SUPPLEMENT_FILE):
    with open(SUPPLEMENT_FILE, 'r', encoding='utf-8') as f:
        supplement = json.load(f)
    merged = 0
    for carrier, routes in supplement.get("routes", {}).items():
        for route_key, equip_list in routes.items():
            if route_key not in equip_db:
                equip_db[route_key] = {}
            equip_db[route_key][carrier] = sorted(set(
                equip_db[route_key].get(carrier, []) + equip_list
            ))
            merged += 1
    print(f"Supplemented {merged} route+carrier equipment entries")

# ── Stats ──
total_pairs = sum(len(dsts) for dsts in route_db.values())
unique_dests = len(set(d for dsts in route_db.values() for d in dsts))

print(f"\nUnique departure airports: {len(route_db)}")
print(f"Unique destination airports: {unique_dests}")
print(f"Total route pairs: {total_pairs}")
print(f"\nTop carriers by route count:")
for carrier, count in sorted(carrier_route_count.items(), key=lambda x: -x[1])[:15]:
    name = airlines.get(carrier, {}).get('name', carrier)
    print(f"  {carrier} - {name}: {count} routes")

output = {
    "source": "OpenFlights routes.dat",
    "description": "Real airline routes for Aero-Hub mock flight generation",
    "updated": "2026-05-26",
    "routes": route_db,
    "equipment": equip_db,
    "carriers": {k: v for k, v in airlines.items()},
    "stats": {
        "total_routes": parsed,
        "unique_origins": len(route_db),
        "unique_destinations": unique_dests,
        "route_pairs": total_pairs,
        "carrier_route_counts": dict(sorted(carrier_route_count.items(), key=lambda x: -x[1])),
    },
}

with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n✅ Written to {OUTPUT}")
print(f"   Size: {len(json.dumps(output, ensure_ascii=False)):,} bytes")

# ── Sample: PEK & PVG routes ──
print("\n📋 PEK routes:")
pek_routes = route_db.get('PEK', {})
for dst, carriers in sorted(pek_routes.items())[:15]:
    print(f"  PEK → {dst}: {', '.join(carriers)}")
print(f"  ... and {len(pek_routes) - 15} more")

print("\n📋 SYD routes:")
syd_routes = route_db.get('SYD', {})
for dst, carriers in sorted(syd_routes.items())[:15]:
    print(f"  SYD → {dst}: {', '.join(carriers)}")
print(f"  ... and {len(syd_routes) - 15} more")
