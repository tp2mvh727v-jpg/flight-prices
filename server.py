import os
import time
import random
import socket
import json
import re
import urllib.request
from pathlib import Path
from datetime import datetime, timedelta

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv

from scripts.utils.scraper import (scrape_google_flights, scrape_date_range,
                      scrape_date_range_parallel, _get_flight_segments,
                      _classify_aircraft, _get_typical_aircraft,
                      FLIGHT_NUMBERS, AIRLINE_WIDEBODY, can_operate_route,
                      AIRLINE_COUNTRY, AIRPORT_COUNTRY)

# AirLabs route fetcher (server-side caching, no per-user API calls)
try:
    from scripts.data.airlabs_fetcher import fetch_routes as airlabs_fetch_routes, get_cache_stats
except ImportError:
    airlabs_fetch_routes = None
    get_cache_stats = None

load_dotenv()

app = Flask(__name__)

CACHE = {}
CACHE_TTL = 3600 * 6  # 6 小时

# ——— 机型分类 ———
WIDE_PREFIXES = {"A33", "A34", "A35", "A38", "B74", "B76", "B77", "B78",
                  "330", "340", "350", "380", "747", "767", "777", "787"}

DEMO_AIRLINES = [
    # Chinese carriers
    ("CA", "中国国航"), ("CZ", "南方航空"), ("MU", "东方航空"),
    ("HU", "海南航空"), ("MF", "厦门航空"), ("3U", "四川航空"),
    ("ZH", "深圳航空"), ("FM", "上海航空"),
    # Foreign carriers — Asia-Pacific
    ("CX", "国泰航空"), ("SQ", "新加坡航空"), ("KE", "大韩航空"),
    ("NH", "全日空"), ("JL", "日本航空"), ("QF", "澳洲航空"),
    ("OZ", "韩亚航空"), ("BR", "长荣航空"), ("CI", "中华航空"),
    ("TR", "酷航"), ("NZ", "新西兰航空"), ("FJ", "斐济航空"),
    # Southeast Asia
    ("TG", "泰国航空"), ("VN", "越南航空"), ("PR", "菲律宾航空"),
    ("MH", "马来西亚航空"), ("GA", "印尼鹰航"),
    # South Asia
    ("AI", "印度航空"), ("UL", "斯里兰卡航空"),
    # Foreign carriers — Middle East
    ("EK", "阿联酋航空"), ("QR", "卡塔尔航空"), ("TK", "土耳其航空"),
    ("EY", "阿提哈德航空"), ("GF", "海湾航空"), ("WY", "阿曼航空"),
    # Foreign carriers — Europe
    ("LH", "汉莎航空"), ("AF", "法国航空"), ("BA", "英国航空"),
    ("KL", "荷兰皇家航空"), ("VS", "维珍大西洋"),
    ("SK", "北欧航空"), ("AY", "芬兰航空"), ("LX", "瑞士航空"),
    ("OS", "奥地利航空"), ("TP", "TAP葡萄牙"), ("LO", "LOT波兰"),
    ("EI", "爱尔兰航空"), ("SN", "布鲁塞尔航空"),
    # Foreign carriers — Americas
    ("UA", "美联航"), ("DL", "达美航空"), ("AA", "美国航空"),
    ("AC", "加拿大航空"), ("LA", "拉美航空"),
    # Foreign carriers — Africa
    ("ET", "埃塞俄比亚航空"), ("SA", "南非航空"),
    ("MS", "埃及航空"), ("AT", "摩洛哥皇家航空"),
    # —— v5.9 IATA补充 ——
    # Europe
    ("IB", "西班牙航空"), ("AZ", "ITA航空"), ("UX", "欧罗巴航空"),
    ("DE", "康多尔航空"), ("JU", "塞尔维亚航空"),
    # Middle East
    ("SV", "沙特航空"), ("LY", "以色列航空"), ("RJ", "约旦皇家航空"),
    ("G9", "阿拉伯航空"), ("FZ", "迪拜航空"), ("J9", "半岛航空"),
    # Asia-Pacific
    ("JX", "星宇航空"), ("HX", "香港航空"), ("NX", "澳门航空"),
    ("6E", "靛蓝航空"), ("VJ", "越捷航空"), ("PG", "曼谷航空"),
    ("7C", "济州航空"), ("YP", "普莱米亚航空"),
    # Chinese additional
    ("SC", "山东航空"), ("HO", "吉祥航空"), ("JD", "首都航空"),
    ("TV", "西藏航空"), ("GS", "天津航空"),
    # Americas
    ("AS", "阿拉斯加航空"), ("TS", "越洋航空"),
    # CIS
    ("HY", "乌兹别克斯坦航空"), ("J2", "阿塞拜疆航空"),
    # Africa
    ("WB", "卢旺达航空"), ("AH", "阿尔及利亚航空"),
]
DEMO_WIDE = ["B789", "B788", "A359", "A333", "B773", "B77W", "A388", "A35K", "B748"]
DEMO_NARROW = ["A320", "A321", "B738", "B739", "A20N", "B38M"]

# Mainland China airports (for domestic vs international detection)
CHINA_AIRPORTS_PY = {
    'PEK','PKX','PVG','SHA','CAN','SZX','TFU','CTU','CKG','HGH',
    'XIY','WUH','NKG','KMG','CSX','XMN','TAO','DLC','TSN','CGO',
    'SYX','HAK','HRB','SHE','FOC','KWE','NNG','URC','LHW','TYN',
    'HET','SJW','TNA','CGQ','KHN','HFE','KWL','WNZ','NGB','WEH',
    'YNT','WUX','LYI','LJG','JHG','DYG','DOY',
}


def classify_aircraft(code):
    if not code:
        return {"code": "?", "type": "未知"}
    upper = code.strip().upper()
    for p in WIDE_PREFIXES:
        if upper.startswith(p):
            return {"code": upper, "type": "大型机"}
    return {"code": upper, "type": "中型机"}


def generate_demo_prices(depart_date_str, origin="PEK", dest="SYD"):
    base = datetime.strptime(depart_date_str, "%Y-%m-%d")
    days_ahead = (base - datetime.now()).days

    if days_ahead < 3:       urgency_mult = 2.5
    elif days_ahead < 7:     urgency_mult = 1.8
    elif days_ahead < 14:    urgency_mult = 1.4
    elif days_ahead < 30:    urgency_mult = 1.1
    elif days_ahead < 60:    urgency_mult = 0.85
    elif days_ahead < 90:    urgency_mult = 0.95
    else:                    urgency_mult = 1.05

    weekday = base.weekday()
    weekend_mult = 1.2 if weekday >= 4 else 1.0
    base_price = random.randint(2800, 4200)
    prices = []

    # —— Airline primary hubs (real-world home base for each carrier) ——
    AIRLINE_HUBS_PY = {
        # Foreign carriers → home country base
        "EK": "DXB", "SQ": "SIN", "QR": "DOH", "CX": "HKG",
        "TK": "IST", "EY": "AUH", "QF": "SYD", "JL": "HND",
        "NH": "NRT", "KE": "ICN", "LH": "FRA", "AF": "CDG",
        "BA": "LHR", "KL": "AMS", "VS": "LHR",
        "SK": "CPH", "AY": "HEL", "LX": "ZRH", "OS": "VIE",
        "TP": "LIS", "LO": "WAW", "EI": "DUB", "SN": "BRU",
        "UA": "ORD", "DL": "ATL", "AA": "DFW", "AC": "YYZ",
        "LA": "SCL", "OZ": "ICN", "BR": "TPE", "CI": "TPE",
        "NZ": "AKL", "FJ": "NAN",
        "TG": "BKK", "VN": "HAN", "PR": "MNL", "MH": "KUL",
        "GA": "CGK", "AI": "DEL", "GF": "BAH", "WY": "MCT",
        "ET": "ADD", "SA": "JNB", "MS": "CAI", "AT": "CMN",
        "TR": "SIN",
        # Chinese carriers → home base
        "CA": "PEK", "CZ": "CAN", "MU": "PVG", "HU": "PEK",
        "3U": "CTU", "MF": "XMN", "ZH": "SZX", "FM": "SHA",
    }
    # Secondary hubs (when primary == origin or dest)
    SECONDARY_HUBS_PY = {
        "CA": "CTU", "CZ": "PKX", "MU": "XIY", "HU": "HAK",
        "QF": "MEL", "JL": "NRT", "NH": "HND", "LH": "MUC",
        "BA": "LGW", "KL": "EIN", "UA": "EWR", "DL": "MSP",
        "AA": "MIA", "AC": "YVR", "SQ": "SIN", "EK": "DXB",
        "TG": "HKT", "VN": "SGN", "AI": "BOM", "ET": "BOM",
    }

    # —— Determine if route is international ——
    is_intl = not (origin in CHINA_AIRPORTS_PY and dest in CHINA_AIRPORTS_PY)

    # —— Filter available carriers ——
    # v5.9: 先按本国枢纽原则过滤，再按宽体机限制
    available = [a for a in DEMO_AIRLINES if can_operate_route(a[0], origin, dest)]
    if is_intl:
        # International routes: further limit to widebody carriers
        available = [a for a in available if AIRLINE_WIDEBODY.get(a[0], [])]
    else:
        # Domestic routes: only Chinese carriers
        chinese_codes = {"CA", "CZ", "MU", "HU", "3U", "MF", "ZH", "FM"}
        available = [a for a in available if a[0] in chinese_codes]

    used = random.sample(available, min(10, len(available)))

    for code, name in used:
        mult = urgency_mult * weekend_mult * random.uniform(0.85, 1.25)
        price = round(base_price * mult, 2)

        # —— Determine stops based on airline hub geography ——
        hub = AIRLINE_HUBS_PY.get(code)
        sec_hub = SECONDARY_HUBS_PY.get(code)
        stops = 0
        layover_airport = ""
        layover_duration = ""

        if is_intl and hub:
            if hub == origin or hub == dest:
                # Airline's home base is on the route → direct flight
                stops = 0
            elif sec_hub and (sec_hub == origin or sec_hub == dest):
                # Secondary hub is on the route → direct
                stops = 0
            else:
                # Route doesn't touch airline's hub → 80% connect through hub
                if random.random() < 0.8:
                    stops = 1
                    layover_airport = hub
                else:
                    stops = 0
        elif not is_intl and hub:
            # Domestic route → 30% one-stop through a Chinese hub
            if random.random() < 0.3:
                domestic_hubs = ["PEK","PVG","CAN","CTU","XMN","SZX","CKG","XIY"]
                candidates = [h for h in domestic_hubs if h != origin and h != dest]
                if candidates:
                    stops = 1
                    layover_airport = random.choice(candidates)
        else:
            # No hub data fallback → restrict to airline's home country airports
            if random.random() < 0.4:
                stops = 1
                country = AIRLINE_COUNTRY.get(code)
                if country:
                    home_airports = [ap for ap, c in AIRPORT_COUNTRY.items()
                                     if c == country and ap != origin and ap != dest]
                    if home_airports:
                        layover_airport = random.choice(home_airports)

        if stops > 0 and layover_airport:
            lh = random.randint(1, 5)
            lm = random.choice([0, 15, 30, 45])
            layover_duration = f"{lh}h{lm:02d}m"

        # —— Aircraft type ——
        ac_code = _get_typical_aircraft(code, layover_airport)
        ac_info = classify_aircraft(ac_code)

        # —— Departure/Arrival times ——
        if stops == 0:
            dep_hour = random.choice([0, 1, 7, 15, 16, 22, 23])
            dur_h = random.randint(8, 14)
        else:
            dep_hour = random.choice([7, 8, 9, 10, 14, 15, 20, 21, 22])
            dur_h = random.randint(14, 26)
        dep_min = random.choice([0, 15, 30, 45])
        dur_m = random.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])

        dep_dt = base.replace(hour=dep_hour, minute=dep_min)
        arr_dt = dep_dt + timedelta(hours=dur_h, minutes=dur_m)
        dep_time = dep_dt.strftime("%H:%M")
        arr_time = arr_dt.strftime("%H:%M")
        duration = f"{dur_h}h{dur_m:02d}m"

        # —— Flight segments ——
        segments = _get_flight_segments(code, layover_airport, stops, origin, dest)
        if segments:
            if len(segments) == 1:
                segments[0]["dep_time"] = dep_time
                segments[0]["arr_time"] = arr_time
            elif len(segments) >= 2:
                segments[0]["dep_time"] = dep_time
                segments[-1]["arr_time"] = arr_time

        prices.append({
            "price": price, "currency": "CNY", "stops": stops,
            "airline": code, "airline_name": name,
            "departure": dep_time, "arrival": arr_time,
            "duration": duration,
            "layover_airport": layover_airport,
            "layover_duration": layover_duration,
            "aircraft_code": ac_info["code"], "aircraft_type": ac_info["type"],
            "segments": segments,
            "source": "Demo",
        })
    prices.sort(key=lambda x: x["price"])
    return prices


def make_best_offer(day_prices):
    if not day_prices:
        return None
    b = day_prices[0]
    return {
        "airline": b["airline"], "airline_name": b["airline_name"],
        "price": b["price"], "stops": b["stops"],
        "departure": b.get("departure", ""),
        "arrival": b.get("arrival", ""),
        "duration": b.get("duration", ""),
        "layover_airport": b.get("layover_airport", ""),
        "layover_duration": b.get("layover_duration", ""),
        "aircraft_code": b.get("aircraft_code", "?"),
        "aircraft_type": b.get("aircraft_type", "未知"),
        "segments": b.get("segments"),
    }


# ——— API 路由 ———

@app.route("/api/status")
def api_status():
    return jsonify({
        "mode": "google_flights",
        "method": "Google Flights (Playwright)",
        "free": True,
    })


@app.route("/api/prices")
def api_prices():
    origin = request.args.get("origin", "PEK")
    dest = request.args.get("dest", "SYD")
    date_str = request.args.get("date", "")
    if not date_str:
        date_str = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    # —— 方法 1: Google Flights 抓取 ——
    cache_key = f"gf:{origin}:{dest}:{date_str}"
    entry = CACHE.get(cache_key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        prices = entry["data"]
    else:
        prices, err = scrape_google_flights(origin, dest, date_str)
        if prices:
            CACHE[cache_key] = {"data": prices, "ts": time.time()}
        else:
            print(f"[Server] Google Flights 抓取失败: {err}")

    if prices:
        # v5.9: Filter real Google Flights results by home country rule
        prices = [p for p in prices if can_operate_route(p.get("airline", ""), origin, dest)]
        if prices:
            return jsonify({
                "prices": prices, "date": date_str,
                "origin": origin, "dest": dest,
                "mode": "live", "source": "Google Flights",
            })

    # —— 方法 2: 演示数据兜底 ——
    demo_prices = generate_demo_prices(date_str, origin, dest)
    return jsonify({
        "prices": demo_prices, "date": date_str,
        "origin": origin, "dest": dest,
        "mode": "demo",
        "hint": "Google Flights 抓取暂不可用，显示模拟数据",
    })


@app.route("/api/date-range")
def api_date_range():
    origin = request.args.get("origin", "PEK")
    dest = request.args.get("dest", "SYD")
    start = request.args.get("start", "")
    days = int(request.args.get("days", 30))
    if not start:
        start = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    # 检查缓存
    cache_key = f"range:{origin}:{dest}:{start}:{days}"
    entry = CACHE.get(cache_key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return jsonify({
            "results": entry["data"], "origin": origin, "dest": dest,
            "mode": "live",
        })

    # 批量抓取 (并行模式)
    days = min(days, 60)
    results, err = scrape_date_range_parallel(origin, dest, start, days, workers=3)

    if results:
        CACHE[cache_key] = {"data": results, "ts": time.time()}
        return jsonify({
            "results": results, "origin": origin, "dest": dest,
            "mode": "live",
        })

    # 兜底：演示数据
    demo_results = []
    base_date = datetime.strptime(start, "%Y-%m-%d")
    for i in range(days):
        d = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
        prices = generate_demo_prices(d)
        if prices:
            demo_results.append({
                "date": d, "lowest": prices[0]["price"],
                "offers": len(prices), "best": make_best_offer(prices),
            })

    return jsonify({
        "results": demo_results, "origin": origin, "dest": dest,
        "mode": "demo",
    })


@app.route("/api/analytics", methods=["POST"])
def api_analytics():
    data = request.get_json(silent=True) or {}
    events = data.get("events", [])
    for ev in events:
        app.logger.info("[Analytics] %s: %s", ev.get("event", "?"), ev.get("data", {}))
    return jsonify({"status": "ok", "count": len(events)})


# ── AirLabs Routes API (server-side caching) ──
@app.route("/api/airlabs-routes")
def api_airlabs_routes():
    """Fetch real flight schedule data from AirLabs (cached server-side)."""
    if not airlabs_fetch_routes:
        return jsonify({"error": "AirLabs fetcher not available", "routes": []}), 503
    
    dep = request.args.get('dep', '').strip().upper()
    arr = request.args.get('arr', '').strip().upper()
    force = request.args.get('force', '0') == '1'
    
    if not dep or not arr:
        return jsonify({"error": "dep and arr required", "routes": []}), 400
    
    result = airlabs_fetch_routes(dep, arr, force_refresh=force)
    return jsonify(result)


@app.route("/api/airlabs-cache-stats")
def api_airlabs_cache_stats():
    """Return AirLabs cache statistics."""
    if not get_cache_stats:
        return jsonify({"error": "AirLabs not available"}), 503
    return jsonify(get_cache_stats())


# ── Flight Number Direct Lookup ──
@app.route("/api/flight-lookup")
def api_flight_lookup():
    """Direct flight number lookup via AirLabs /v9/schedules with aircraft backfill."""
    raw = request.args.get("flight", "").strip()
    if not raw:
        return jsonify({"error": "航班号不能为空", "flight": ""}), 400

    # Normalize: uppercase, remove spaces → "CA981"
    flight = re.sub(r'\s+', '', raw).upper()
    if not re.match(r'^[A-Z0-9]{3,8}$', flight):
        return jsonify({"error": "无效的航班号格式", "flight": flight}), 400

    # Check cache
    cache_dir = Path("data/airlabs_cache")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"flight_{flight}.json"

    if cache_file.exists():
        try:
            cached = json.loads(cache_file.read_text())
            if time.time() - cached.get("ts", 0) < CACHE_TTL:
                data = cached.get("data")
                if isinstance(data, list):
                    local = _search_verified_route_by_flight(flight)
                    if local:
                        route_key, route_data = local
                        result = _build_verified_result(flight, route_key, route_data)
                        return jsonify(result)
                    return jsonify({"error": f"未找到航班 {flight} 的信息", "flight": flight}), 404
                result = _format_flight_result(flight, data)
                return jsonify(result)
        except (json.JSONDecodeError, KeyError):
            pass

    # Call AirLabs API
    key_file = Path("/tmp/airlabs_key.txt")
    if not key_file.exists():
        return jsonify({"error": "AirLabs API key 未配置", "flight": flight}), 502

    api_key = key_file.read_text().strip()
    url = f"https://airlabs.co/api/v9/schedules?api_key={api_key}&flight_iata={flight}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Aero-Hub/5.22"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            api_data = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        return jsonify({"error": f"AirLabs 请求失败: {str(e)}", "flight": flight}), 502
    except json.JSONDecodeError:
        return jsonify({"error": "AirLabs 返回数据格式异常", "flight": flight}), 502

    # Check for API-level errors
    if api_data.get("error"):
        return jsonify({"error": api_data["error"].get("message", "AirLabs API 错误"), "flight": flight}), 502

    response_data = api_data.get("response", [])
    if not response_data:
        # Fallback: try verified_routes.json before giving up
        route_key, route_data = _search_verified_route_by_flight(flight)
        if route_key:
            result = _build_verified_result(flight, route_key, route_data)
            return jsonify(result)
        # Cache empty results
        cache_file.write_text(json.dumps({"ts": time.time(), "data": []}))
        return jsonify({"error": f"未找到航班 {flight} 的信息", "flight": flight}), 404

    # Take the first matching schedule
    schedule = response_data[0] if isinstance(response_data, list) else response_data

    # Cache result
    cache_file.write_text(json.dumps({"ts": time.time(), "data": schedule}))

    result = _format_flight_result(flight, schedule)
    return jsonify(result)


def _format_flight_result(flight, schedule):
    """Format a single AirLabs schedule entry into the API response."""
    dep_iata = schedule.get("dep_iata", "")
    arr_iata = schedule.get("arr_iata", "")
    dep_time = schedule.get("dep_time", "")
    arr_time = schedule.get("arr_time", "")
    duration_min = schedule.get("duration", 0)
    status = schedule.get("status", "scheduled")
    airline_iata = schedule.get("airline_iata", flight[:2])

    # Backfill aircraft from verified_routes.json
    aircraft = _backfill_aircraft(dep_iata, arr_iata)

    # Build ISO timestamps
    # AirLabs may return date+time ("2026-05-27 19:25") or just time ("19:25")
    today = datetime.now().strftime("%Y-%m-%d")
    if dep_time and ' ' in dep_time:
        dep_iso = dep_time.replace(' ', 'T')
    else:
        dep_iso = f"{today}T{dep_time}" if dep_time else None
    
    if arr_time and ' ' in arr_time:
        arr_iso = arr_time.replace(' ', 'T')
    else:
        arr_iso = f"{today}T{arr_time}" if arr_time else None

    # If arrival appears before departure, push arrival to next day
    if dep_iso and arr_iso and arr_iso <= dep_iso:
        next_day = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        time_part = arr_iso.split('T')[1] if 'T' in arr_iso else arr_iso
        arr_iso = f"{next_day}T{time_part}"

    # Airline ICAO lookup
    airline_icao = _AIRLINE_IATA_TO_ICAO.get(airline_iata, "")

    return {
        "flight": flight,
        "airline": {
            "iata": airline_iata,
            "icao": airline_icao,
        },
        "departure": {
            "airport": dep_iata,
            "terminal": schedule.get("dep_terminal") or None,
            "time": dep_iso,
        },
        "arrival": {
            "airport": arr_iata,
            "terminal": schedule.get("arr_terminal") or None,
            "time": arr_iso,
        },
        "duration_min": duration_min,
        "status": status,
        "aircraft": aircraft,
    }


def _backfill_aircraft(dep, arr):
    """Look up aircraft type from verified_routes.json by dep-arr route."""
    if not dep or not arr:
        return None
    try:
        routes_path = Path("data/verified_routes.json")
        if not routes_path.exists():
            return None
        routes_data = json.loads(routes_path.read_text())
        routes = routes_data.get("routes", {})
        route_key = f"{dep}-{arr}"
        # Exact match (old format)
        if route_key in routes:
            return routes[route_key].get("aircraft") or None
        # ROUTE|AIRLINE format
        prefix = f"{route_key}|"
        for key, val in routes.items():
            if key.startswith(prefix):
                return val.get("aircraft") or None
    except (json.JSONDecodeError, IOError):
        return None


def _search_verified_route_by_flight(flight):
    """Search verified_routes.json for a matching flight number.
    Returns (route_key, route_data) or (None, None).
    """
    try:
        routes_path = Path("data/verified_routes.json")
        if not routes_path.exists():
            return None, None
        data = json.loads(routes_path.read_text())
        routes = data.get("routes", {})
        for route_key, route_data in routes.items():
            if route_data.get("flightNo") == flight:
                return route_key, route_data
    except (json.JSONDecodeError, IOError):
        pass
    return None, None


def _build_verified_result(flight, route_key, route_data):
    """Build a flight lookup response from verified_routes.json data,
    matching the format of _format_flight_result."""
    # Handle ROUTE|AIRLINE key format
    if '|' in route_key:
        pure_route = route_key.split('|')[0]
    else:
        pure_route = route_key
    parts = pure_route.split("-")
    dep_iata = parts[0] if len(parts) >= 2 else ""
    arr_iata = parts[1] if len(parts) >= 2 else ""

    dep_time = route_data.get("departure", "")
    arr_time = route_data.get("arrival", "")
    duration_min = route_data.get("duration", 0)
    aircraft = route_data.get("aircraft") or None
    airline_iata = route_data.get("airline", flight[:2])

    airline_icao = _AIRLINE_IATA_TO_ICAO.get(airline_iata, "")

    today = datetime.now().strftime("%Y-%m-%d")
    dep_iso = f"{today}T{dep_time}" if dep_time else None
    arr_iso = f"{today}T{arr_time}" if arr_time else None

    if dep_iso and arr_iso and arr_iso <= dep_iso:
        next_day = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        time_part = arr_iso.split("T")[1] if "T" in arr_iso else arr_iso
        arr_iso = f"{next_day}T{time_part}"

    return {
        "flight": flight,
        "airline": {
            "iata": airline_iata,
            "icao": airline_icao,
        },
        "departure": {
            "airport": dep_iata,
            "terminal": None,
            "time": dep_iso,
        },
        "arrival": {
            "airport": arr_iata,
            "terminal": None,
            "time": arr_iso,
        },
        "duration_min": duration_min,
        "status": "scheduled",
        "aircraft": aircraft,
        "source": "verified_db",
    }


# IATA → ICAO airline code mapping for major carriers
_AIRLINE_IATA_TO_ICAO = {
    "CA": "CCA", "CZ": "CSN", "MU": "CES", "HU": "CHH", "MF": "CXA",
    "3U": "CSC", "ZH": "CSZ", "FM": "CSH", "CX": "CPA", "SQ": "SIA",
    "KE": "KAL", "NH": "ANA", "JL": "JAL", "QF": "QFA", "OZ": "AAR",
    "BR": "EVA", "CI": "CAL", "TR": "TGW", "NZ": "ANZ", "FJ": "FJI",
    "TG": "THA", "VN": "HVN", "PR": "PAL", "MH": "MAS", "GA": "GIA",
    "AI": "AIC", "UL": "ALK", "EK": "UAE", "QR": "QTR", "TK": "THY",
    "EY": "ETD", "GF": "GFA", "WY": "OMA", "LH": "DLH", "AF": "AFR",
    "BA": "BAW", "KL": "KLM", "VS": "VIR", "SK": "SAS", "AY": "FIN",
    "LX": "SWR", "OS": "AUA", "TP": "TAP", "LO": "LOT", "EI": "EIN",
    "SN": "BEL", "UA": "UAL", "DL": "DAL", "AA": "AAL", "AC": "ACA",
    "LA": "LAN", "ET": "ETH", "SA": "SAA", "MS": "MSR", "AT": "RAM",
    "IB": "IBE", "AZ": "ITY", "UX": "AEA", "DE": "CFG", "JU": "ASL",
    "SV": "SVA", "LY": "ELY", "RJ": "RJA", "G9": "ABY", "FZ": "FDB",
    "J9": "JZR", "JX": "SJX", "HX": "CRK", "NX": "AMU", "6E": "IGO",
    "VJ": "VJC", "PG": "BKP", "7C": "JJA", "YP": "APZ",
    "SC": "CDG", "HO": "DKH", "JD": "CBJ", "TV": "TBA", "GS": "GCR",
    "AS": "ASA", "TS": "TSC", "HY": "UZB", "J2": "AHY", "WB": "RWD",
    "AH": "DAH",
}


# ── AirLabs Connecting Flights API ──
# Matches real schedules through transit hubs.
# Rules: same airline > same alliance > layover < 24h > detour < 2x

# Airline → hub (subset of AIRLINE_HUBS in flightService.js)
_TRANSIT_HUBS = {
    'KE': 'ICN', 'OZ': 'ICN',  # Korean Air + Asiana → Seoul
    'CX': 'HKG',                # Cathay Pacific → Hong Kong
    'MU': 'PVG', 'CZ': 'CAN', '3U': 'CTU', 'CA': 'PEK',  # Chinese carriers
    'SQ': 'SIN',                # Singapore Airlines
    'JL': 'HND', 'NH': 'NRT',  # JAL + ANA → Tokyo
    'BR': 'TPE', 'CI': 'TPE',  # EVA + China Airlines → Taipei
    'TG': 'BKK',                # Thai Airways → Bangkok
    'MH': 'KUL',                # Malaysia Airlines → KL
    'VN': 'HAN',                # Vietnam Airlines → Hanoi
    'QF': 'SYD',                # Qantas → Sydney
    'EK': 'DXB', 'QR': 'DOH', 'EY': 'AUH',  # Middle East
    'TK': 'IST',                # Turkish
    'GA': 'CGK',                # Garuda → Jakarta
}

# Airport coordinates for detour calculation
_AIRPORT_COORDS = {
    'PEK': (40.08,116.58), 'PKX': (39.51,116.41), 'PVG': (31.14,121.81),
    'CAN': (23.39,113.31), 'CTU': (30.58,103.95), 'SZX': (22.64,113.81),
    'HKG': (22.31,113.92), 'ICN': (37.46,126.44), 'NRT': (35.76,140.39),
    'HND': (35.55,139.78), 'TPE': (25.08,121.23), 'SIN': (1.36,103.99),
    'BKK': (13.69,100.75), 'KUL': (2.75,101.71), 'HAN': (21.22,105.81),
    'SYD': (-33.87,151.21), 'MEL': (-37.67,144.84),
    'DXB': (25.25,55.36), 'DOH': (25.27,51.61), 'AUH': (24.43,54.65),
    'IST': (41.26,28.74), 'CGK': (-6.13,106.66),
    'DEL': (28.57,77.10), 'BOM': (19.09,72.87),
    'LHR': (51.47,-0.46), 'CDG': (49.01,2.55), 'FRA': (50.04,8.56),
    'AMS': (52.31,4.76), 'LAX': (33.94,-118.41), 'JFK': (40.64,-73.78),
    'SFO': (37.62,-122.38), 'ORD': (41.98,-87.90),
    'ADD': (8.98,38.80), 'JNB': (-26.13,28.24), 'CAI': (30.12,31.41),
}
import math

def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def _candidate_hubs(origin, dest):
    """Return candidate transit hubs filtered by geographic detour ratio < 2.0x, capped at 10."""
    orig_coords = _AIRPORT_COORDS.get(origin)
    dest_coords = _AIRPORT_COORDS.get(dest)
    if not orig_coords or not dest_coords:
        return list(set(h for h in _TRANSIT_HUBS.values() if h not in (origin, dest)))[:10]

    direct_dist = _haversine_km(*orig_coords, *dest_coords)
    
    hubs_with_score = []
    seen = set()
    for airline, hub in _TRANSIT_HUBS.items():
        if hub in (origin, dest) or hub in seen:
            continue
        hub_coords = _AIRPORT_COORDS.get(hub)
        if not hub_coords:
            continue
        detour = _haversine_km(*orig_coords, *hub_coords) + _haversine_km(*hub_coords, *dest_coords)
        ratio = detour / max(direct_dist, 1000)
        if ratio < 2.0:
            hubs_with_score.append((hub, ratio))
            seen.add(hub)
    
    # Sort by detour ratio (closest first), keep all within 2x
    hubs_with_score.sort(key=lambda x: x[1])
    return [h for h, _ in hubs_with_score]


# Alliance data (mirrors flight-profile.js AIRLINE_ALLIANCE)
_AIRLINE_ALLIANCE = {
    'CA': 'star', 'NH': 'star', 'NZ': 'star', 'OZ': 'star', 'BR': 'star',
    'LH': 'star', 'SQ': 'star', 'TG': 'star', 'UA': 'star', 'AC': 'star',
    'TK': 'star', 'ZH': 'star', 'ET': 'star',
    'AA': 'oneworld', 'BA': 'oneworld', 'CX': 'oneworld', 'JL': 'oneworld',
    'MH': 'oneworld', 'QF': 'oneworld', 'QR': 'oneworld',
    'AF': 'skyteam', 'CI': 'skyteam', 'DL': 'skyteam', 'GA': 'skyteam',
    'KE': 'skyteam', 'MU': 'skyteam', 'VN': 'skyteam',
}


def _time_to_minutes(t):
    """HH:MM → minutes since midnight."""
    if not t:
        return None
    parts = str(t).split(':')
    return int(parts[0]) * 60 + int(parts[1])


def _build_connections(dep, arr, date_str):
    """Build real connecting flights through transit hubs.
    Returns list of connection dicts, ranked best→worst.
    """
    if not airlabs_fetch_routes:
        return []

    hubs = _candidate_hubs(dep, arr)
    connections = []

    for hub in hubs:
        # Fetch both legs (cached server-side)
        leg1_data = airlabs_fetch_routes(dep, hub)
        leg2_data = airlabs_fetch_routes(hub, arr)

        leg1_routes = leg1_data.get('routes', []) if isinstance(leg1_data, dict) else []
        leg2_routes = leg2_data.get('routes', []) if isinstance(leg2_data, dict) else []

        if not leg1_routes or not leg2_routes:
            continue

        # Index by airline
        leg1_by_airline = {}
        for r in leg1_routes:
            code = r.get('airline_iata')
            if not code or r.get('cs_airline_iata'):
                continue
            leg1_by_airline.setdefault(code, []).append(r)

        leg2_by_airline = {}
        for r in leg2_routes:
            code = r.get('airline_iata')
            if not code or r.get('cs_airline_iata'):
                continue
            leg2_by_airline.setdefault(code, []).append(r)

        # --- PASS 1: Same airline ---
        for airline in leg1_by_airline:
            if airline not in leg2_by_airline:
                continue
            for r1 in leg1_by_airline[airline]:
                arr1_min = _time_to_minutes(r1.get('arr_time'))
                dur1 = r1.get('duration', 0)
                if arr1_min is None:
                    continue
                for r2 in leg2_by_airline[airline]:
                    dep2_min = _time_to_minutes(r2.get('dep_time'))
                    dur2 = r2.get('duration') or 0
                    if dep2_min is None:
                        continue
                    # Layover: time from arrival of leg1 to departure of leg2
                    # Handle day wrap: if leg2 departs "earlier" than leg1 arrives, it's next day
                    raw_gap = dep2_min - arr1_min
                    if raw_gap < 60:  # same-day but too tight (<1h) → next day
                        raw_gap += 1440
                    if raw_gap < 60:  # still too tight after wrap
                        continue
                    if raw_gap > 1440:  # >24h layover
                        continue

                    layover_min = raw_gap
                    total_dur = dur1 + dur2 + layover_min
                    detour_ratio = (dur1 + dur2) / max(dur1, 60)

                    connections.append({
                        'airline': airline,
                        'hub': hub,
                        'leg1': {
                            'flight_iata': r1.get('flight_iata'),
                            'flight_number': r1.get('flight_number'),
                            'dep_time': r1.get('dep_time'),
                            'arr_time': r1.get('arr_time'),
                            'duration': dur1,
                            'dep_terminal': r1.get('dep_terminal'),
                            'arr_terminal': r1.get('arr_terminal'),
                        },
                        'leg2': {
                            'flight_iata': r2.get('flight_iata'),
                            'flight_number': r2.get('flight_number'),
                            'dep_time': r2.get('dep_time'),
                            'arr_time': r2.get('arr_time'),
                            'duration': r2.get('duration', 0),
                            'dep_terminal': r2.get('dep_terminal'),
                            'arr_terminal': r2.get('arr_terminal'),
                        },
                        'total_duration': total_dur,
                        'layover_min': layover_min,
                        'match_type': 'same_airline',
                        'score': 100 - layover_min / 10,  # shorter layover = better
                    })

        # --- PASS 2: Same alliance ---
        alliance1_map = {}
        for code in leg1_by_airline:
            al = _AIRLINE_ALLIANCE.get(code)
            if al:
                alliance1_map.setdefault(al, []).append(code)

        for al_key in alliance1_map:
            ally_codes_leg2 = [c for c in leg2_by_airline if _AIRLINE_ALLIANCE.get(c) == al_key]
            if not ally_codes_leg2:
                continue

            for ac1 in alliance1_map[al_key]:
                for r1 in leg1_by_airline[ac1]:
                    arr1_min = _time_to_minutes(r1.get('arr_time'))
                    dur1 = r1.get('duration', 0)
                    if arr1_min is None:
                        continue
                    for ac2 in ally_codes_leg2:
                        if ac1 == ac2:
                            continue  # already handled in PASS 1
                        for r2 in leg2_by_airline[ac2]:
                            dep2_min = _time_to_minutes(r2.get('dep_time'))
                            dur2 = r2.get('duration') or 0
                            if dep2_min is None:
                                continue
                            raw_gap = dep2_min - arr1_min
                            if raw_gap < 60:
                                raw_gap += 1440
                            if raw_gap < 60 or raw_gap > 1440:
                                continue

                            layover_min = raw_gap
                            total_dur = dur1 + dur2 + layover_min

                            connections.append({
                                'airline': f"{ac1}/{ac2}",
                                'airline_leg1': ac1,
                                'airline_leg2': ac2,
                                'hub': hub,
                                'alliance': al_key,
                                'leg1': {
                                    'flight_iata': r1.get('flight_iata'),
                                    'flight_number': r1.get('flight_number'),
                                    'dep_time': r1.get('dep_time'),
                                    'arr_time': r1.get('arr_time'),
                                    'duration': dur1,
                                },
                                'leg2': {
                                    'flight_iata': r2.get('flight_iata'),
                                    'flight_number': r2.get('flight_number'),
                                    'dep_time': r2.get('dep_time'),
                                    'arr_time': r2.get('arr_time'),
                                    'duration': r2.get('duration', 0),
                                },
                                'total_duration': total_dur,
                                'layover_min': layover_min,
                                'match_type': 'same_alliance',
                                'score': 70 - layover_min / 10,
                            })

    # Sort by match type priority, then by score
    type_order = {'same_airline': 0, 'same_alliance': 1}
    connections.sort(key=lambda c: (type_order.get(c['match_type'], 9), -c['score']))

    return connections[:12]  # max 12 results


@app.route("/api/airlabs-connections")
def api_airlabs_connections():
    """Build real connecting flights through transit hubs."""
    if not airlabs_fetch_routes:
        return jsonify({"error": "AirLabs fetcher not available", "connections": []}), 503

    dep = request.args.get('dep', '').strip().upper()
    arr = request.args.get('arr', '').strip().upper()
    date_str = request.args.get('date', '').strip()

    if not dep or not arr:
        return jsonify({"error": "dep and arr required", "connections": []}), 400

    connections = _build_connections(dep, arr, date_str)
    return jsonify({
        'dep': dep, 'arr': arr,
        'connections': connections,
        'count': len(connections),
    })


@app.route("/api/watchlist-refresh", methods=["POST"])
def api_watchlist_refresh():
    """Refresh prices for tracked routes. Accepts {routes: [{origin, dest, cabin}, ...]}.
    Returns {results: [{origin, dest, cabin, price, airline, airline_name, date, source}, ...]}."""
    data = request.get_json(silent=True) or {}
    routes = data.get("routes", [])
    if not routes:
        return jsonify({"results": [], "error": "No routes provided"}), 400

    today = datetime.now().strftime("%Y-%m-%d")
    results = []

    for route in routes:
        origin = route.get("origin", "")
        dest = route.get("dest", "")
        cabin = route.get("cabin", "economy")
        if not origin or not dest:
            continue

        cache_key = f"wl:{origin}:{dest}:{cabin}"
        entry = CACHE.get(cache_key)
        if entry and (time.time() - entry["ts"]) < 1800:  # 30 min cache for watchlist
            results.append(entry["data"])
            continue

        # Try live scrape first
        prices, err = scrape_google_flights(origin, dest, today)
        if prices:
            best = prices[0]
            result = {
                "origin": origin, "dest": dest, "cabin": cabin,
                "price": best["price"], "airline": best["airline"],
                "airline_name": best["airline_name"],
                "date": today, "source": "live",
            }
        else:
            # Demo fallback
            demo = generate_demo_prices(today, origin, dest)
            if demo:
                best = demo[0]
                result = {
                    "origin": origin, "dest": dest, "cabin": cabin,
                    "price": best["price"], "airline": best["airline"],
                    "airline_name": best["airline_name"],
                    "date": today, "source": "demo",
                }
            else:
                result = {
                    "origin": origin, "dest": dest, "cabin": cabin,
                    "price": None, "airline": "", "airline_name": "",
                    "date": today, "source": "unavailable",
                }

        CACHE[cache_key] = {"data": result, "ts": time.time()}
        results.append(result)

    return jsonify({"results": results})


@app.route("/sw.js")
def service_worker():
    response = app.send_static_file("sw.js")
    response.headers["Cache-Control"] = "no-cache, max-age=0"
    response.headers["Service-Worker-Allowed"] = "/"
    return response


@app.route("/")
def index():
    return render_template("index.html")


def _get_lan_ip():
    """Auto-detect primary LAN IPv4 address."""
    try:
        # Try connecting to a public endpoint to discover the preferred local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.05)
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        pass
    # Fallback: iterate network interfaces
    try:
        for ifname, ifaddrs in socket.if_nameindex():
            # skip loopback
            if ifname.startswith('lo'):
                continue
            for family, _, _, _, addr in socket.getaddrinfo(
                socket.gethostname(), None, socket.AF_INET, socket.SOCK_STREAM
            ):
                if not addr.startswith('127.'):
                    return addr
    except Exception:
        pass
    return '0.0.0.0'


if __name__ == "__main__":
    lan_ip = _get_lan_ip()
    banner = f"""
┌────────────────────────────────────────────────────────┐
│  🚀 机票展示网页 v5.22 启动成功！                      │
├────────────────────────────────────────────────────────┤
│  💻 本地开发访问:  http://localhost:5088               │
│  📱 手机同步测试:  http://{lan_ip}:5088                │
├────────────────────────────────────────────────────────┤
│  📡 数据源: Google Flights                           │
└────────────────────────────────────────────────────────┘
"""
    print(banner)
    app.run(debug=True, host='0.0.0.0', port=5088)
