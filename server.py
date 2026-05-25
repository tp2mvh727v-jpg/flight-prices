import os
import time
import random
import socket
from datetime import datetime, timedelta

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv

from scraper import (scrape_google_flights, scrape_date_range,
                      scrape_date_range_parallel, _get_flight_segments,
                      _classify_aircraft, _get_typical_aircraft,
                      FLIGHT_NUMBERS, AIRLINE_WIDEBODY, can_operate_route,
                      AIRLINE_COUNTRY, AIRPORT_COUNTRY)

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
        "method": "Playwright 抓取 Google Flights",
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
│  🚀 机票展示网页 v5.6.4 启动成功！                     │
├────────────────────────────────────────────────────────┤
│  💻 本地开发访问:  http://localhost:5088               │
│  📱 手机同步测试:  http://{lan_ip}:5088                │
├────────────────────────────────────────────────────────┤
│  📡 数据源: Google Flights (Playwright 抓取, 免费)     │
└────────────────────────────────────────────────────────┘
"""
    print(banner)
    app.run(debug=True, host='0.0.0.0', port=5088)
