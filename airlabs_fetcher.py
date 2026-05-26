#!/usr/bin/env python3
"""
airlabs_fetcher.py — Fetch routes from AirLabs API with server-side caching.
Used by Aero-Hub server.py to provide real flight schedule data.

Cache: data/airlabs_cache/{dep_iata}-{arr_iata}.json
TTL: 7 days (routes don't change frequently)
"""

import json
import os
import time
import urllib.request
from pathlib import Path

API_KEY_FILE = "/tmp/airlabs_key.txt"
CACHE_DIR = Path(__file__).parent / "data" / "airlabs_cache"
CACHE_TTL = 7 * 86400  # 7 days

def _load_api_key():
    """Load API key from file (keeps it out of code)."""
    if os.path.exists(API_KEY_FILE):
        return open(API_KEY_FILE).read().strip()
    # Fallback: try environment
    return os.environ.get('AIRLABS_KEY', '')

def fetch_routes(dep_iata, arr_iata, force_refresh=False):
    """
    Fetch routes for an airport pair from AirLabs.
    Returns: list of route dicts (AirLabs format)
    """
    api_key = _load_api_key()
    if not api_key:
        return {"error": "AirLabs API key not configured", "routes": []}
    
    # Check cache
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{dep_iata}-{arr_iata}.json"
    
    if not force_refresh and cache_path.exists():
        age = time.time() - cache_path.stat().st_mtime
        if age < CACHE_TTL:
            data = json.loads(cache_path.read_text())
            return data
    
    # Fetch from API
    import urllib.parse
    params = urllib.parse.urlencode({
        'dep_iata': dep_iata,
        'arr_iata': arr_iata,
        'api_key': api_key,
    })
    url = f"https://airlabs.co/api/v9/routes?{params}"    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Aero-Hub/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = json.loads(resp.read())
    except Exception as e:
        # Return stale cache if available
        if cache_path.exists():
            return json.loads(cache_path.read_text())
        return {"error": str(e), "routes": []}
    
    routes = raw.get('response', [])
    
    # Enrich: extract useful fields
    enriched = []
    for r in routes:
        enriched.append({
            'airline_iata': r.get('airline_iata'),
            'airline_icao': r.get('airline_icao'),
            'flight_number': r.get('flight_number'),
            'flight_iata': r.get('flight_iata'),
            'dep_iata': r.get('dep_iata'),
            'arr_iata': r.get('arr_iata'),
            'dep_time': r.get('dep_time'),
            'arr_time': r.get('arr_time'),
            'dep_time_utc': r.get('dep_time_utc'),
            'arr_time_utc': r.get('arr_time_utc'),
            'duration': r.get('duration'),
            'days': r.get('days', []),
            'dep_terminal': (r.get('dep_terminals') or [None])[0],
            'arr_terminal': (r.get('arr_terminals') or [None])[0],
            'cs_airline_iata': r.get('cs_airline_iata'),
            'cs_flight_iata': r.get('cs_flight_iata'),
            'counter': r.get('counter'),
        })
    
    result = {
        'dep_iata': dep_iata,
        'arr_iata': arr_iata,
        'routes': enriched,
        'count': len(enriched),
        'cached_at': time.time(),
    }
    
    # Save cache
    cache_path.write_text(json.dumps(result, indent=2))
    
    return result


def get_cache_stats():
    """Return stats about the cache."""
    if not CACHE_DIR.exists():
        return {'cached_routes': 0, 'total_pairs': 0}
    
    files = list(CACHE_DIR.glob('*.json'))
    total_routes = 0
    for f in files:
        try:
            data = json.loads(f.read_text())
            total_routes += data.get('count', 0)
        except:
            pass
    
    return {
        'cached_pairs': len(files),
        'total_routes': total_routes,
    }


if __name__ == '__main__':
    import sys
    if len(sys.argv) >= 3:
        dep, arr = sys.argv[1], sys.argv[2]
        force = '--force' in sys.argv
        result = fetch_routes(dep, arr, force_refresh=force)
        print(f"{dep}->{arr}: {result['count']} routes")
        for r in result['routes']:
            days = ','.join(r.get('days', [])[:3])
            print(f"  {r['flight_iata']}  {r['dep_time']}->{r['arr_time']}  {r['duration']}min  [{days}]")
    else:
        stats = get_cache_stats()
        print(f"Cache: {stats['cached_pairs']} pairs, {stats['total_routes']} routes")
