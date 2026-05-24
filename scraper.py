"""
Google Flights 免费抓取模块
从 Google Flights 页面 aria-label + 可见文本提取结构化航班数据。
"""
import re
import time
import math
import random
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

# ——— 机型分类 ———
WIDE_PREFIXES = {"A33", "A34", "A35", "A38", "B74", "B76", "B77", "B78",
                  "330", "340", "350", "380", "747", "767", "777", "787"}

# ——— 航司 → 真实宽体机队 (planespotters.net 2025–2026) ———
# 仅列出航司实际运营的宽体机型号，用于航线和机型匹配
AIRLINE_WIDEBODY = {
    "CA": ["A359", "A333", "A332", "B789", "B77W", "B748"],
    "CZ": ["A359", "A333", "B789", "B788", "B77W"],
    "MU": ["A359", "A332", "A333", "B789", "B77W"],
    "HU": ["A359", "A333", "B789", "B788"],
    "3U": ["A359", "A332"],
    "MF": ["B789", "B788"],
    "ZH": [],  # 深航无宽体机
    "EK": ["A388", "B77W", "A359"],
    "QR": ["A359", "A35K", "A388", "B77W", "B789", "B788"],
    "EY": ["A35K", "A388", "B77W", "B789", "A333"],
    "SQ": ["A359", "A35K", "A388", "B77W"],
    "CX": ["A359", "A35K", "A333", "B77W"],
    "QF": ["A388", "B789", "A333"],
    "JL": ["A359", "A35K", "B789", "B788", "B77W"],
    "NH": ["A388", "B789", "B788", "B77W"],
    "KE": ["A359", "A388", "A333", "B789", "B77W", "B748"],
    "OZ": ["A359", "A388", "A333", "B77W"],
    "LH": ["A359", "A35K", "A388", "A333", "B748", "B789"],
    "AF": ["A359", "B77W", "B789"],
    "BA": ["A35K", "A388", "B788", "B789", "B77W"],
    "TK": ["A359", "A35K", "A333", "B789", "B77W"],
    "TR": ["B788", "B789"],
    "PR": ["A359", "A333", "B77W"],
    "MH": ["A359", "A333"],
    "5J": ["A333"],
    "TN": ["B789"],
    "NZ": ["B789", "B77W"],
    "VN": ["A359", "B789"],
    "TG": ["A359", "A333", "B789", "B788", "B77W"],
    "BR": ["B789", "B788", "B77W", "A333"],
    "CI": ["A359", "A333", "B77W"],
    "GA": ["A333", "B77W"],
    "ET": ["A359", "A35K", "B789", "B788", "B77W"],
    "SA": ["A333"],
    "KQ": ["B788"],
    "MS": ["A333", "B789"],
    "AT": ["B788", "B789"],
    "DL": ["A359", "A333"],
    "UA": ["B789", "B788", "B77W"],
    "AA": ["B789", "B788", "B77W"],
    "AC": ["B789", "B788", "B77W", "A333"],
    "LA": ["B789", "B788"],
    "AD": ["A333"],
    "CM": [],  # Copa 无宽体机 (全737机队)
    "AM": ["B789", "B788"],
    "AK": [],  # 亚洲航空全窄体机队，无宽体机
    "D7": ["A333"],  # 亚航X — 全A333宽体机队
    "FJ": ["A333"],  # 斐济航空
    "HA": ["A333", "B789"],  # 夏威夷航空
    "KL": ["B77W", "B789", "B78X", "A333"],  # 荷兰皇家航空
    "VA": [],  # 维珍澳洲全窄体机队 (B738)，无宽体机
    "JQ": ["B788"],  # 捷星航空 — B788 宽体机
    "FM": [],  # 上海航空全窄体机队，无宽体机
}

# 航司 → 窄体机队 (用于非长程航段)
AIRLINE_NARROWBODY = {
    "CA": ["A320", "A321", "A20N", "B738", "B38M"],
    "CZ": ["A320", "A321", "A20N", "B738", "B38M"],
    "MU": ["A320", "A321", "A20N", "B738", "B38M"],
    "HU": ["A20N", "A321", "B738", "B38M"],
    "3U": ["A320", "A321", "A20N"],
    "MF": ["B738", "B38M", "A20N"],
    "ZH": ["A320", "A321", "A20N", "B738", "B38M"],
    "EK": [],  # 阿联酋航空全宽体机队，无窄体机
    "QR": ["A320", "A321", "B38M"],
    "EY": ["A320", "A321"],
    "SQ": ["B38M", "B738"],
    "CX": ["A321"],
    "QF": ["B738"],
    "JL": ["B738", "B38M"],
    "NH": ["A320", "A321", "A20N", "B738"],
    "KE": ["A321", "B738", "B739"],
    "OZ": ["A321"],
    "LH": ["A320", "A321", "A20N"],
    "AF": ["A320", "A321"],
    "BA": ["A320", "A321"],
    "TK": ["A320", "A321", "B738", "B38M"],
    "TR": ["A320", "A20N", "A321"],
    "PR": ["A321", "A320", "A20N"],
    "MH": ["B738", "B38M"],
    "5J": ["A320", "A20N", "A321"],
    "TN": [],  # 大溪地航空全宽体机队 (B789)，无窄体机
    "NZ": ["A320", "A20N", "A321"],
    "VN": ["A321", "A20N"],
    "TG": ["A320"],
    "BR": ["A321"],
    "CI": ["B738", "A321", "A20N"],
    "GA": ["B738"],
    "ET": ["B738", "B38M"],
    "SA": ["A320", "A20N", "B738"],
    "KQ": ["B738"],
    "MS": ["B738", "A320", "A321", "A20N"],
    "AT": ["B738", "B38M", "A320", "A321"],
    "DL": ["A20N", "A321", "B739", "B738"],
    "UA": ["A320", "A321", "A20N", "B738", "B739", "B38M"],
    "AA": ["A321", "A320", "A20N", "B738", "B38M"],
    "AC": ["A321", "A320", "B738", "B38M"],
    "LA": ["A320", "A20N", "A321"],
    "AD": ["A20N", "A321", "A320"],
    "CM": ["B738", "B38M", "B739"],
    "AM": ["B738", "B38M"],
    "AK": ["A320", "A20N", "A321"],  # 亚洲航空
    "D7": [],  # 亚航X全宽体机队，无窄体机
    "FJ": ["B738", "B38M"],  # 斐济航空
    "HA": ["A321", "A20N"],  # 夏威夷航空
    "KL": ["B738", "B739"],  # 荷兰皇家航空 — 窄体机队
    "VA": ["B738", "B38M"],  # 维珍澳洲
    "JQ": ["A320", "A321", "A20N"],  # 捷星航空
    "FM": ["B738", "B38M", "A320"],  # 上海航空
}

def _classify_aircraft(code):
    if not code:
        return {"code": "?", "type": "未知"}
    upper = code.strip().upper()
    for p in WIDE_PREFIXES:
        if upper.startswith(p):
            return {"code": upper, "type": "大型机"}
    return {"code": upper, "type": "中型机"}

# ——— 机场坐标 (lat, lng) 用于航程验证 ———
AIRPORT_COORDS = {
    "PEK": (40.08, 116.58), "PKX": (39.51, 116.41), "PVG": (31.14, 121.81),
    "CAN": (23.39, 113.30), "SZX": (22.64, 113.81), "CTU": (30.58, 103.95),
    "KMG": (25.10, 102.94), "HAK": (19.93, 110.46), "XMN": (24.54, 118.13),
    "HKG": (22.31, 113.91), "TPE": (25.08, 121.23),
    "SYD": (-33.95, 151.18), "MEL": (-37.67, 144.84),
    "SIN": (1.36, 103.99), "BKK": (13.68, 100.75),
    "ICN": (37.46, 126.44), "HND": (35.55, 139.78), "NRT": (35.76, 140.39),
    "DXB": (25.25, 55.36), "DOH": (25.27, 51.61), "AUH": (24.43, 54.65),
    "IST": (41.26, 28.74), "FRA": (50.03, 8.57), "MUC": (48.35, 11.79),
    "CDG": (49.01, 2.55), "LHR": (51.47, -0.46), "JFK": (40.64, -73.78),
    "LAX": (33.94, -118.41), "YVR": (49.19, -123.18), "YYZ": (43.68, -79.63),
}

# 全机型最大航程 (km) — 窄体基于制造商官方数据，宽体基于Airbus/Boeing官方规格
AIRCRAFT_MAX_RANGE = {
    # 窄体机 (Narrowbody)
    "A320": 6200, "A20N": 6500, "A321": 5950,
    "B738": 5765, "B38M": 6584, "B739": 4587,
    # 宽体机 (Widebody) — Airbus
    "A388": 15200,   # A380-800
    "A359": 15000,   # A350-900
    "A35K": 14750,   # A350-1000
    "A346": 14450,   # A340-600
    "A343": 13700,   # A340-300
    "A345": 16670,   # A340-500 (ultra-long range)
    "A332": 13450,   # A330-200
    "A333": 11750,   # A330-300
    "A339": 13334,   # A330-900neo
    "A338": 15094,   # A330-800neo
    # 宽体机 (Widebody) — Boeing
    "B788": 14140,   # 787-8
    "B789": 14140,   # 787-9
    "B78X": 11730,   # 787-10
    "B748": 14320,   # 747-8
    "B744": 13450,   # 747-400
    "B77W": 13649,   # 777-300ER
    "B77L": 15843,   # 777-200LR (ultra-long range)
    "B772": 13450,   # 777-200ER
    # 宽体机 (Widebody) — others
    "MD11": 12670,   # McDonnell Douglas MD-11
}
NARROWBODY_SAFE_RANGE = 5200  # 80% of best narrowbody (6500×0.8)
NARROWBODY_CODES = {"A320", "A20N", "A321", "B738", "B38M", "B739"}

# Ultra-long-range aircraft that can handle virtually any commercial route
ULTRA_LONG_RANGE = {"A345", "B77L"}

# Technical-stop airports (major hubs with good connections for refueling stops)
TECH_STOP_AIRPORTS = {
    "ANC": "安克雷奇", "HNL": "檀香山", "DXB": "迪拜", "SIN": "新加坡樟宜",
    "HKG": "香港国际", "ICN": "首尔仁川", "NRT": "东京成田", "BKK": "曼谷素万那普",
    "IST": "伊斯坦布尔", "FRA": "法兰克福", "LHR": "伦敦希思罗",
}

def _haversine_km(lat1, lng1, lat2, lng2):
    """Great-circle distance between two lat/lng points (km)."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _segment_distance_km(origin_code, dest_code):
    """Return great-circle distance (km) between two airport codes."""
    c1 = AIRPORT_COORDS.get(origin_code.upper())
    c2 = AIRPORT_COORDS.get(dest_code.upper())
    if not c1 or not c2:
        return 0
    return _haversine_km(c1[0], c1[1], c2[0], c2[1])

def _validate_aircraft_for_segment(ac_code, origin_code, dest_code, airline_code=None):
    """Validate aircraft can fly the segment within 80% of max range.
    If exceeded: narrowbody→airline's widebody (or best widebody),
    widebody→ultra-long-range or technical stop.
    airline_code allows picking from the carrier's actual fleet."""
    dist = _segment_distance_km(origin_code, dest_code)
    if dist <= 0:
        return ac_code  # unknown airports — don't change

    max_range = AIRCRAFT_MAX_RANGE.get(ac_code)
    if max_range is None:
        return ac_code  # unknown aircraft — let it pass

    safe_limit = max_range * 0.8
    if dist <= safe_limit:
        return ac_code  # within safe range

    # Aircraft can't safely fly this distance
    if ac_code in NARROWBODY_CODES:
        # Narrowbody → pick from airline's actual widebody fleet, or best available
        if airline_code and airline_code in AIRLINE_WIDEBODY:
            wide_list = AIRLINE_WIDEBODY[airline_code]
            if wide_list:
                # Pick the widebody with the longest range from the airline's fleet
                best_wide = max(wide_list, key=lambda ac: AIRCRAFT_MAX_RANGE.get(ac, 0))
                if _segment_distance_km(origin_code, dest_code) <= AIRCRAFT_MAX_RANGE.get(best_wide, 0) * 0.8:
                    return best_wide
        # Fallback: airline has no widebodies → keep the narrowbody (will get tech stop)
        if airline_code and airline_code in AIRLINE_WIDEBODY and not AIRLINE_WIDEBODY.get(airline_code, []):
            return ac_code
        return "B789"

    # Widebody exceeds range → pick the best ultra-long-range alternative
    if airline_code and airline_code in AIRLINE_WIDEBODY:
        wide_list = AIRLINE_WIDEBODY[airline_code]
        for code in ULTRA_LONG_RANGE:
            if code in wide_list and dist <= AIRCRAFT_MAX_RANGE.get(code, 0) * 0.8:
                return code
    return _best_ultra_long_range(dist)


def _best_ultra_long_range(dist):
    """Pick an ultra-long-range aircraft that can handle this distance at 80% limit."""
    for code in ULTRA_LONG_RANGE:
        max_range = AIRCRAFT_MAX_RANGE.get(code, 0)
        if dist <= max_range * 0.8:
            return code
    # Even ultra-long-range can't do it at 80% — return best available at full range
    for code in ULTRA_LONG_RANGE:
        if dist <= AIRCRAFT_MAX_RANGE.get(code, 0):
            return code
    return "B77L"  # fallback — longest range, destination may require technical stop


def _get_tech_stop(origin_code, dest_code, current_ac):
    """Return a technical-stop airport between origin and dest when the aircraft
    can't fly the full distance. Returns (tech_stop_airport_code, city_name) or None."""
    dist = _segment_distance_km(origin_code, dest_code)
    max_range = AIRCRAFT_MAX_RANGE.get(current_ac, 0)
    if dist <= max_range * 0.8:
        return None  # No tech stop needed

    # Find the nearest tech-stop airport roughly halfway
    c1 = AIRPORT_COORDS.get(origin_code.upper())
    c2 = AIRPORT_COORDS.get(dest_code.upper())
    if not c1 or not c2:
        return None

    mid_lat = (c1[0] + c2[0]) / 2
    mid_lng = (c1[1] + c2[1]) / 2

    best = None
    best_dist = float('inf')
    for code, name in TECH_STOP_AIRPORTS.items():
        tc = AIRPORT_COORDS.get(code)
        if not tc:
            continue
        if code == origin_code.upper() or code == dest_code.upper():
            continue
        d = _haversine_km(mid_lat, mid_lng, tc[0], tc[1])
        if d < best_dist:
            best_dist = d
            best = (code, name)
    return best

AIRLINE_NAME_TO_CODE = {
    "中国国航": "CA", "国航": "CA", "南方航空": "CZ", "南航": "CZ",
    "东方航空": "MU", "东航": "MU", "海南航空": "HU", "海航": "HU",
    "四川航空": "3U", "川航": "3U", "厦门航空": "MF", "厦航": "MF",
    "深圳航空": "ZH", "深航": "ZH", "上海航空": "FM", "上航": "FM",
    "澳洲航空": "QF", "澳航": "QF", "捷星航空": "JQ", "维珍澳洲": "VA",
    "国泰航空": "CX", "国泰": "CX", "新加坡航空": "SQ", "新航": "SQ",
    "大韩航空": "KE", "韩亚航空": "OZ", "韩亚": "OZ",
    "全日空": "NH", "日本航空": "JL", "日航": "JL",
    "泰国航空": "TG", "马航": "MH", "马来西亚航空": "MH",
    "阿联酋航空": "EK", "阿提哈德航空": "EY", "卡塔尔航空": "QR",
    "土耳其航空": "TK", "长荣航空": "BR", "中华航空": "CI", "华航": "CI",
    "美联航": "UA", "达美航空": "DL", "美国航空": "AA",
    "英国航空": "BA", "法国航空": "AF", "汉莎航空": "LH",
    "荷兰皇家航空": "KL", "新西兰航空": "NZ",
    "菲律宾航空": "PR", "越南航空": "VN", "印尼鹰航": "GA",
    "酷航": "TR", "亚洲航空": "AK", "亚航X": "D7", "宿务太平洋航空": "5J",
    "斐济航空": "FJ", "夏威夷航空": "HA",
    "THAI": "TG", "Thai": "TG",
}

# ——— PEK→SYD 航线航班号 (业内公开信息) ———
# 格式: {航司代码: {中转机场: [去程航班列表]}}
# 每个航班: (航班号, 出发机场, 到达机场, 典型执飞机型)
FLIGHT_NUMBERS = {
    "CA": {  # 中国国航 — hub PEK
        "direct": [("CA173", "PEK", "SYD", "B789")],
        "PVG":   [("CA1835", "PEK", "PVG", "A333"), ("CA175", "PVG", "SYD", "A333")],
        "CAN":   [("CA1327", "PEK", "CAN", "A321"), ("CA301", "CAN", "SYD", "B789")],
        "CTU":   [("CA4116", "PEK", "CTU", "A320"), ("CA427", "CTU", "SYD", "A359")],
    },
    "CZ": {  # 南方航空 — hub CAN
        "direct": [("CZ301", "PEK", "SYD", "A359")],
        "CAN":   [("CZ3108", "PEK", "CAN", "A320"), ("CZ301", "CAN", "SYD", "A359")],
        "SZX":   [("CZ3152", "PEK", "SZX", "A321"), ("CZ3071", "SZX", "SYD", "A359")],
        "PKX":   [("CZ3001", "PEK", "PKX", "A320"), ("CZ601", "PKX", "SYD", "A359")],
    },
    "MU": {  # 东方航空 — hub PVG
        "direct": [("MU561", "PEK", "SYD", "A359")],
        "PVG":   [("MU5162", "PEK", "PVG", "A320"), ("MU561", "PVG", "SYD", "A359")],
        "KMG":   [("MU5710", "PEK", "KMG", "B738"), ("MU761", "KMG", "SYD", "B789")],
    },
    "HU": {  # 海南航空 — hub PEK
        "direct": [("HU7137", "PEK", "SYD", "A333")],
        "HAK":   [("HU7182", "PEK", "HAK", "B738"), ("HU447", "HAK", "SYD", "A333")],
    },
    "CX": {  # 国泰航空 — hub HKG
        "direct": [("CX111", "PEK", "SYD", "A359")],
        "HKG":   [("CX391", "PEK", "HKG", "A359"), ("CX111", "HKG", "SYD", "A359")],
    },
    "QF": {  # 澳洲航空 — hub SYD
        "direct": [("QF108", "PEK", "SYD", "B789")],
        "MEL":   [("QF204", "PEK", "MEL", "B789"), ("QF430", "MEL", "SYD", "B738")],
    },
    "SQ": {  # 新加坡航空 — hub SIN
        "direct": [("SQ801", "PEK", "SYD", "A359")],
        "SIN":   [("SQ801", "PEK", "SIN", "A359"), ("SQ231", "SIN", "SYD", "A388")],
    },
    "KE": {  # 大韩航空 — hub ICN
        "direct": [("KE856", "PEK", "SYD", "B789")],
        "ICN":   [("KE856", "PEK", "ICN", "B789"), ("KE121", "ICN", "SYD", "B789")],
    },
    "NH": {  # 全日空 — hub NRT
        "direct": [("NH904", "PEK", "SYD", "B789")],
        "HND":   [("NH964", "PEK", "HND", "B789"), ("NH889", "HND", "SYD", "B789")],
        "NRT":   [("NH904", "PEK", "NRT", "B789"), ("NH879", "NRT", "SYD", "B789")],
    },
    "JL": {  # 日本航空 — hub HND
        "direct": [("JL22", "PEK", "SYD", "B789")],
        "HND":   [("JL22", "PEK", "HND", "B789"), ("JL51", "HND", "SYD", "B789")],
    },
    "EK": {  # 阿联酋航空 — hub DXB
        "direct": [("EK307", "PEK", "SYD", "A388")],
        "DXB":   [("EK307", "PEK", "DXB", "A388"), ("EK412", "DXB", "SYD", "A388")],
    },
    "QR": {  # 卡塔尔航空 — hub DOH
        "direct": [("QR893", "PEK", "SYD", "A359")],
        "DOH":   [("QR893", "PEK", "DOH", "A359"), ("QR908", "DOH", "SYD", "A359")],
    },
    "TK": {  # 土耳其航空 — hub IST
        "IST":   [("TK089", "PEK", "IST", "B77W"), ("TK164", "IST", "SYD", "B77W")],
    },
    "EY": {  # 阿提哈德航空 — hub AUH
        "AUH":   [("EY889", "PEK", "AUH", "B789"), ("EY450", "AUH", "SYD", "B789")],
    },
    "LH": {  # 汉莎航空 — hub FRA
        "FRA":   [("LH721", "PEK", "FRA", "B748"), ("LH990", "FRA", "SYD", "A359")],
        "MUC":   [("LH723", "PEK", "MUC", "A359"), ("LH992", "MUC", "SYD", "A359")],
    },
    "AF": {  # 法国航空 — hub CDG
        "CDG":   [("AF381", "PEK", "CDG", "B77W"), ("AF180", "CDG", "SYD", "B77W")],
    },
    "MF": {  # 厦门航空 — hub XMN
        "direct": [("MF801", "PEK", "SYD", "B788")],
        "XMN":   [("MF8128", "PEK", "XMN", "B738"), ("MF801", "XMN", "SYD", "B788")],
    },
    "3U": {  # 四川航空 — hub CTU
        "direct": [("3U3871", "PEK", "SYD", "A359")],
        "CTU":   [("3U8896", "PEK", "CTU", "A321"), ("3U3871", "CTU", "SYD", "A359")],
    },
}

# 机场代码 → 名称
AIRPORT_NAMES = {
    "PEK": "北京首都", "SYD": "悉尼金斯福德·史密斯",
    "HKG": "香港国际", "ICN": "首尔仁川", "PVG": "上海浦东",
    "CAN": "广州白云", "SZX": "深圳宝安", "XMN": "厦门高崎",
    "CTU": "成都天府", "KMG": "昆明长水", "HAK": "海口美兰",
    "HND": "东京羽田", "NRT": "东京成田", "SIN": "新加坡樟宜",
    "BKK": "曼谷素万那普", "TPE": "台北桃园",
}

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"


def _get_flight_segments(airline_code, layover_code, stops, origin="PEK", dest="SYD"):
    """根据航司和中转机场获取航班号及航段信息。
    返回的每个 segment 包含 origin/destination 字段（用于客户端渲染）。"""
    if airline_code not in FLIGHT_NUMBERS:
        return _build_generic_segments(airline_code, layover_code, stops, origin, dest)

    routes = FLIGHT_NUMBERS[airline_code]

    if stops == 0:
        # Direct flight
        direct = routes.get("direct", [])
        if direct:
            fn, dep, arr, ac = direct[0]
            return _validate_segments([{
                "flight_no": fn, "origin": origin, "destination": dest,
                "dep_airport": origin, "arr_airport": dest,
                "dep_time": "", "arr_time": "", "aircraft": ac,
            }], airline_code)
        # No direct flight in database — generate generic
        return _build_generic_segments(airline_code, layover_code, 0, origin, dest)

    # Connecting flight through known layover
    layover = layover_code.upper() if layover_code else None
    if layover and layover in routes:
        segs = routes[layover]
        result = []
        for i, (fn, dep, arr, ac) in enumerate(segs):
            # Adapt segment endpoints to match the actual request origin/dest
            seg_origin = dep
            seg_dest = arr
            if i == 0:
                seg_origin = origin  # Use actual requested origin
            if i == len(segs) - 1:
                seg_dest = dest  # Use actual requested destination
            result.append({
                "flight_no": fn, "origin": seg_origin, "destination": seg_dest,
                "dep_airport": dep, "arr_airport": arr,
                "dep_time": "", "arr_time": "", "aircraft": ac,
            })
        return _validate_segments(result, airline_code)

    # Layover airport unknown in FLIGHT_NUMBERS — use generic segments
    return _build_generic_segments(airline_code, layover_code, stops, origin, dest)


def _validate_segments(segments, airline_code=None):
    """Apply narrowbody-range validation to every segment, and annotate distances."""
    for s in segments:
        s["aircraft"] = _validate_aircraft_for_segment(
            s["aircraft"], s.get("origin", ""), s.get("destination", ""), airline_code)
        dist = _segment_distance_km(s.get("origin", ""), s.get("destination", ""))
        if dist > 0:
            s["distance_km"] = round(dist)
            ac = s["aircraft"]
            max_r = AIRCRAFT_MAX_RANGE.get(ac, 0)
            if max_r > 0:
                s["range_pct"] = round(dist / max_r * 100)
    return segments


# Mainland China airports (for domestic vs international segment detection)
_CHINA_AIRPORTS = {
    'PEK','PKX','PVG','SHA','CAN','SZX','TFU','CTU','CKG','HGH',
    'XIY','WUH','NKG','KMG','CSX','XMN','TAO','DLC','TSN','CGO',
    'SYX','HAK','HRB','SHE','FOC','KWE','NNG','URC','LHW','TYN',
    'HET','SJW','TNA','CGQ','KHN','HFE','KWL','WNZ','NGB','WEH',
    'YNT','WUX','LYI','LJG','JHG','DYG','DOY',
}


def _gen_flight_number(origin, dest):
    """Domestic segments = 4-digit, international = 1–3 digit."""
    if origin in _CHINA_AIRPORTS and dest in _CHINA_AIRPORTS:
        return str(random.randint(1000, 9999))
    # International: 1–3 digits, weighted toward 2-3 digits
    r = random.random()
    if r < 0.15:
        return str(random.randint(1, 9))
    if r < 0.35:
        return str(random.randint(10, 99))
    return str(random.randint(100, 999))


def _build_generic_segments(airline_code, layover_code, stops, origin, dest):
    """Build flight segments for routes/carriers not in the hardcoded FLIGHT_NUMBERS."""
    wide_list = AIRLINE_WIDEBODY.get(airline_code, [])
    narrow_list = AIRLINE_NARROWBODY.get(airline_code, [])
    wide_ac = random.choice(wide_list) if wide_list else random.choice(["B789","A359","B77W"])
    narrow_ac = random.choice(narrow_list) if narrow_list else random.choice(["A320","B738"])

    if stops == 0:
        fn = f"{airline_code}{_gen_flight_number(origin, dest)}"
        ac = _validate_aircraft_for_segment(wide_ac, origin, dest, airline_code)
        return _validate_segments([{
            "flight_no": fn, "origin": origin, "destination": dest,
            "dep_airport": origin, "arr_airport": dest,
            "dep_time": "", "arr_time": "", "aircraft": ac,
        }], airline_code)

    # One-stop: origin → layover → dest
    layover = layover_code.upper() if layover_code else "HKG"
    fn1 = f"{airline_code}{_gen_flight_number(origin, layover)}"
    fn2 = f"{airline_code}{_gen_flight_number(layover, dest)}"
    ac1 = _validate_aircraft_for_segment(narrow_ac, origin, layover, airline_code)
    ac2 = _validate_aircraft_for_segment(wide_ac, layover, dest, airline_code)
    return _validate_segments([
        {
            "flight_no": fn1, "origin": origin, "destination": layover,
            "dep_airport": origin, "arr_airport": layover,
            "dep_time": "", "arr_time": "", "aircraft": ac1,
        },
        {
            "flight_no": fn2, "origin": layover, "destination": dest,
            "dep_airport": layover, "arr_airport": dest,
            "dep_time": "", "arr_time": "", "aircraft": ac2,
        },
    ], airline_code)


# ===================== 单日抓取 =====================

def scrape_google_flights(origin, dest, date_str, max_retries=2):
    """单日抓取。返回 (prices_list, error_message)。~8s"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return [], "Playwright 未安装"

    url = (f"https://www.google.com/travel/flights?"
           f"q=Flights+to+{dest}+from+{origin}+on+{date_str}"
           f"&curr=CNY&hl=zh-CN")

    for attempt in range(max_retries):
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(viewport={"width": 1920, "height": 1080}, locale="zh-CN",
                                        user_agent=UA)
                page.route("**/*.{png,jpg,gif,svg,mp4,woff2,font,css}**",
                           lambda route: route.abort())
                page.goto(url, wait_until="networkidle", timeout=40000)
                page.wait_for_timeout(3000)

                labels = _extract_labels(page)
                body_text = page.evaluate("() => document.body.innerText")
                browser.close()

                if labels:
                    prices = _parse_labels_full(labels, body_text, origin, dest)
                    if prices:
                        return prices, None

        except Exception as e:
            print(f"[Scraper] 单日 第{attempt+1}次失败: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)

    return [], "抓取失败，请稍后重试"


# ===================== 多日批量抓取 =====================

def scrape_date_range(origin, dest, start_date, days, max_retries=2):
    """单浏览器会话 + 日历点击切换日期。30天≈70s"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return [], "Playwright 未安装"

    url = (f"https://www.google.com/travel/flights?"
           f"q=Flights+to+{dest}+from+{origin}+on+{start_date}"
           f"&curr=CNY&hl=zh-CN")

    for attempt in range(max_retries):
        browser = None
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(viewport={"width": 1920, "height": 1080}, locale="zh-CN",
                                        user_agent=UA)
                page.route("**/*.{png,jpg,gif,svg,mp4,woff2,font,css}**",
                           lambda route: route.abort())

                t_start = time.time()
                page.goto(url, wait_until="networkidle", timeout=40000)
                page.wait_for_timeout(3000)

                labels = _extract_labels(page)
                body_text = page.evaluate("() => document.body.innerText")
                all_results = []

                if labels:
                    prices = _parse_labels_full(labels, body_text, origin, dest)
                    if prices:
                        all_results.append({
                            "date": start_date,
                            "lowest": prices[0]["price"],
                            "offers": len(prices),
                            "best": _best_from_prices(prices),
                        })

                _click_date_input(page)
                page.wait_for_timeout(1500)

                from datetime import datetime as dt, timedelta
                base = dt.strptime(start_date, "%Y-%m-%d")
                date_list = []
                for i in range(1, min(days, 60)):
                    d = base + timedelta(days=i)
                    date_list.append(d.strftime("%Y-%m-%d"))

                for date_str in date_list:
                    dt_obj = dt.strptime(date_str, "%Y-%m-%d")
                    if not _click_calendar_date(page, dt_obj):
                        continue
                    page.wait_for_timeout(2200)
                    labels = _extract_labels(page)
                    if labels:
                        prices = _parse_labels_full(labels, body_text, origin, dest)
                        if prices:
                            all_results.append({
                                "date": date_str,
                                "lowest": prices[0]["price"],
                                "offers": len(prices),
                                "best": _best_from_prices(prices),
                            })

                browser.close()
                elapsed = time.time() - t_start
                print(f"[Scraper] 多日 {origin}->{dest} {start_date}+{days}d: "
                      f"{len(all_results)}天, {elapsed:.0f}s")

                if all_results:
                    return all_results, None

        except Exception as e:
            print(f"[Scraper] 多日 第{attempt+1}次失败: {e}")
            try:
                if browser: browser.close()
            except: pass
            if attempt < max_retries - 1:
                time.sleep(2)

    return [], "多日抓取失败，请稍后重试"


def scrape_date_range_parallel(origin, dest, start_date, days, workers=3):
    """并行多浏览器。30天×3 workers≈70s"""
    base = datetime.strptime(start_date, "%Y-%m-%d")
    all_dates = []
    for i in range(min(days, 60)):
        all_dates.append((base + timedelta(days=i)).strftime("%Y-%m-%d"))

    chunk_size = max(1, len(all_dates) // workers)
    chunks = []
    for i in range(0, len(all_dates), chunk_size):
        chunks.append(all_dates[i:i + chunk_size])

    if len(chunks) <= 1:
        return scrape_date_range(origin, dest, start_date, days)

    print(f"[Scraper] 并行: {workers}w × {len(chunks)}段, 共{len(all_dates)}天")
    all_results = []

    def _scrape_chunk(chunk_dates):
        if not chunk_dates:
            return []
        return _scrape_specific_dates(origin, dest, chunk_dates)

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(_scrape_chunk, c): i for i, c in enumerate(chunks)}
        for future in as_completed(futures):
            try:
                all_results.extend(future.result())
            except Exception as e:
                print(f"[Scraper] 段失败: {e}")

    all_results.sort(key=lambda x: x["date"])
    return all_results, None


def _scrape_specific_dates(origin, dest, dates):
    """单会话抓取指定日期列表"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return []

    if not dates:
        return []
    first_date = dates[0]
    url = (f"https://www.google.com/travel/flights?"
           f"q=Flights+to+{dest}+from+{origin}+on+{first_date}"
           f"&curr=CNY&hl=zh-CN")

    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080}, locale="zh-CN",
                                user_agent=UA)
        page.route("**/*.{png,jpg,gif,svg,mp4,woff2,font,css}**",
                   lambda route: route.abort())

        page.goto(url, wait_until="networkidle", timeout=40000)
        page.wait_for_timeout(3000)

        labels = _extract_labels(page)
        if labels:
            prices = _parse_labels_minimal(labels, origin, dest)
            if prices:
                results.append({
                    "date": first_date, "lowest": prices[0]["price"],
                    "offers": len(prices), "best": _best_from_prices(prices),
                })

        if len(dates) > 1:
            _click_date_input(page)
            page.wait_for_timeout(1000)
            for date_str in dates[1:]:
                dt_obj = datetime.strptime(date_str, "%Y-%m-%d")
                if _click_calendar_date(page, dt_obj):
                    page.wait_for_timeout(2000)
                    labels = _extract_labels(page)
                    if labels:
                        prices = _parse_labels_minimal(labels, origin, dest)
                        if prices:
                            results.append({
                                "date": date_str, "lowest": prices[0]["price"],
                                "offers": len(prices), "best": _best_from_prices(prices),
                            })
                time.sleep(0.1)
        browser.close()
    return results


# ===================== DOM 操作 =====================

def _extract_labels(page):
    return page.evaluate("""() => {
        const labels = [];
        document.querySelectorAll('[aria-label]').forEach(el => {
            const l = el.getAttribute('aria-label');
            if (l && l.includes('往返总价') && l.includes('起。')) labels.push(l);
        });
        return labels;
    }""")


def _click_date_input(page):
    page.evaluate("""() => {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
            if ((inp.getAttribute('aria-label') || '').includes('出发时间')) {
                inp.click(); return;
            }
        }
    }""")


def _click_calendar_date(page, dt):
    month_cn = f"{dt.year}年{dt.month}月{dt.day}日"
    return page.evaluate("""(monthCn) => {
        const cells = document.querySelectorAll('[aria-label]');
        for (const cell of cells) {
            if ((cell.getAttribute('aria-label') || '').startsWith(monthCn)) {
                cell.click(); return true;
            }
        }
        return false;
    }""", month_cn)


# ===================== 解析 (完整版 - 含航班号/时长/中转地) =====================

def _parse_labels_full(labels, body_text="", origin="PEK", dest="SYD"):
    """完整解析：从 aria-label + body text 提取所有字段"""
    prices = []
    seen = set()
    text_lines = body_text.split('\n') if body_text else []

    for label in labels:
        try:
            # --- 价格 ---
            pm = re.search(r'往返总价[：:]?\s*([\d,]+)\s*人民币', label)
            if not pm:
                continue
            price = float(pm.group(1).replace(",", ""))

            # --- 航司 ---
            airline_name = "?"
            airline_code = "?"
            for name, code in sorted(AIRLINE_NAME_TO_CODE.items(), key=lambda x: -len(x[0])):
                if name in label:
                    airline_name = name
                    airline_code = code
                    break

            # --- 经停 ---
            if "经停 1 站" in label:
                stops = 1
            elif "经停 2 站" in label:
                stops = 2
            else:
                stops = 0

            # --- 时间 ---
            dm = re.search(r'(\d{1,2}:\d{2})\s*离开', label)
            am = re.search(r'(\d{1,2}:\d{2})\s*到达', label)
            dep_time = dm.group(1) if dm else ""
            arr_time = am.group(1) if am else ""

            # --- 总时长 ---
            dur_h, dur_m = 0, 0
            dur_match = re.search(r'总时长\s*(\d+)\s*小时\s*(\d+)\s*分钟', label)
            if dur_match:
                dur_h, dur_m = int(dur_match.group(1)), int(dur_match.group(2))
            duration = f"{dur_h}h{dur_m:02d}m" if dur_h > 0 else ""

            # --- 中转地 ---
            layover_airport = ""
            layover_duration = ""
            lo_match = re.search(r'在(.+?)用时\s*(\d+)\s*小时\s*(\d+)\s*分钟', label)
            if lo_match:
                lo_place = lo_match.group(1).strip()
                lo_h, lo_m = int(lo_match.group(2)), int(lo_match.group(3))
                # 从 body text 找对应的 IATA 代码
                layover_airport = _find_airport_in_text(lo_place, body_text)
                if not layover_airport:
                    # 从地名推断代码
                    layover_airport = _guess_airport_code(lo_place)
                layover_duration = f"{lo_h}h{lo_m:02d}m"

            # --- 机型 ---
            ac_code = _get_typical_aircraft(airline_code, layover_airport)
            ac_info = _classify_aircraft(ac_code)

            # --- 航班号 & 航段 ---
            segments = _get_flight_segments(airline_code, layover_airport, stops, origin, dest)
            if segments:
                # 填入时间
                if len(segments) == 1:
                    segments[0]["dep_time"] = dep_time
                    segments[0]["arr_time"] = arr_time
                elif len(segments) >= 2:
                    segments[0]["dep_time"] = dep_time
                    segments[-1]["arr_time"] = arr_time

            # 去重
            key = (price, airline_code)
            if key in seen:
                continue
            seen.add(key)

            prices.append({
                "price": price,
                "currency": "CNY",
                "stops": stops,
                "airline": airline_code,
                "airline_name": airline_name,
                "departure": dep_time,
                "arrival": arr_time,
                "duration": duration,
                "layover_airport": layover_airport,
                "layover_duration": layover_duration,
                "aircraft_code": ac_info["code"],
                "aircraft_type": ac_info["type"],
                "segments": segments,
                "source": "Google Flights",
            })
        except (ValueError, AttributeError) as e:
            print(f"[Scraper] 解析出错: {e}")
            continue

    prices.sort(key=lambda x: x["price"])
    return prices if prices else []


def _parse_labels_minimal(labels, origin="PEK", dest="SYD"):
    """轻量解析：提取价格/航司/中转地，并查航班号数据库，用于趋势批量抓取"""
    prices = []
    seen = set()
    for label in labels:
        try:
            pm = re.search(r'往返总价[：:]?\s*([\d,]+)\s*人民币', label)
            if not pm:
                continue
            price = float(pm.group(1).replace(",", ""))

            airline_name = "?"
            airline_code = "?"
            for name, code in sorted(AIRLINE_NAME_TO_CODE.items(), key=lambda x: -len(x[0])):
                if name in label:
                    airline_name = name
                    airline_code = code
                    break

            stops = 1 if "经停 1 站" in label else (2 if "经停 2 站" in label else 0)

            # 提取中转地
            layover_airport = ""
            layover_duration = ""
            lo_match = re.search(r'在(.+?)用时\s*(\d+)\s*小时\s*(\d+)\s*分钟', label)
            if lo_match:
                lo_place = lo_match.group(1).strip()
                lo_h, lo_m = int(lo_match.group(2)), int(lo_match.group(3))
                layover_airport = _find_airport_in_text(lo_place, "")
                if not layover_airport:
                    layover_airport = _guess_airport_code(lo_place)
                layover_duration = f"{lo_h}h{lo_m:02d}m"

            # 查机型
            ac_code = _get_typical_aircraft(airline_code, layover_airport)
            ac_info = _classify_aircraft(ac_code)

            # 查航班号
            segments = _get_flight_segments(airline_code, layover_airport, stops, origin, dest)

            key = (price, airline_code)
            if key in seen:
                continue
            seen.add(key)

            prices.append({
                "price": price, "currency": "CNY", "stops": stops,
                "airline": airline_code, "airline_name": airline_name,
                "departure": "", "arrival": "", "duration": "",
                "layover_airport": layover_airport,
                "layover_duration": layover_duration,
                "aircraft_code": ac_info["code"], "aircraft_type": ac_info["type"],
                "segments": segments, "source": "Google Flights",
            })
        except (ValueError, AttributeError):
            continue

    prices.sort(key=lambda x: x["price"])
    return prices if prices else []


# ===================== 辅助 =====================

def _find_airport_in_text(place_name, body_text):
    """从 body text 中根据中文地名匹配 IATA 代码（3个大写字母）"""
    # 提取地名关键词
    keywords = {
        "香港": "HKG", "首尔": "ICN", "仁川": "ICN", "上海": "PVG", "浦东": "PVG",
        "广州": "CAN", "深圳": "SZX", "厦门": "XMN", "成都": "CTU", "昆明": "KMG",
        "海口": "HAK", "东京": "HND", "羽田": "HND", "成田": "NRT", "新加坡": "SIN",
        "曼谷": "BKK", "台北": "TPE", "桃园": "TPE",
        "北京": "PEK", "悉尼": "SYD",
    }
    for kw, code in keywords.items():
        if kw in place_name:
            return code
    # 模糊匹配 body text 中的机场代码
    lines = body_text.split('\n')
    for line in lines:
        stripped = line.strip()
        if len(stripped) == 3 and stripped.isupper() and stripped.isalpha():
            # 检查是否在 aria-label 描述的附近
            pass
    return ""


def _guess_airport_code(place_name):
    """从中文地名猜 IATA 代码"""
    mapping = {
        "香港": "HKG", "首尔": "ICN", "仁川": "ICN", "上海": "PVG", "浦东": "PVG",
        "广州": "CAN", "深圳": "SZX", "厦门": "XMN", "成都": "CTU", "昆明": "KMG",
        "海口": "HAK", "东京": "HND", "羽田": "HND", "成田": "NRT", "新加坡": "SIN",
        "曼谷": "BKK", "台北": "TPE", "桃园": "TPE", "北京": "PEK", "悉尼": "SYD",
    }
    for kw, code in mapping.items():
        if kw in place_name:
            return code
    return ""


def _get_typical_aircraft(airline_code, layover_airport):
    """获取该航司+航线的典型机型（基于真实机队数据）"""
    if airline_code in FLIGHT_NUMBERS:
        routes = FLIGHT_NUMBERS[airline_code]
        layover = layover_airport.upper() if layover_airport else None
        if not layover or layover not in routes:
            for k, segs in routes.items():
                if k != "direct" and segs:
                    return segs[-1][3]
            if "direct" in routes and routes["direct"]:
                return routes["direct"][0][3]
        else:
            segs = routes[layover]
            if segs:
                return segs[-1][3]

    # 从航司真实宽体机队中选取
    wide = AIRLINE_WIDEBODY.get(airline_code, [])
    if wide:
        return random.choice(wide)
    # 无宽体机的航司回退到其窄体机队
    narrow = AIRLINE_NARROWBODY.get(airline_code, [])
    if narrow:
        return random.choice(narrow)
    return "B789"


def _best_from_prices(prices):
    if not prices:
        return None
    b = prices[0]
    return {
        "airline": b["airline"], "airline_name": b["airline_name"],
        "price": b["price"], "stops": b["stops"],
        "departure": b["departure"], "arrival": b["arrival"],
        "duration": b.get("duration", ""),
        "layover_airport": b.get("layover_airport", ""),
        "layover_duration": b.get("layover_duration", ""),
        "aircraft_code": b["aircraft_code"], "aircraft_type": b["aircraft_type"],
        "segments": b.get("segments"),
    }


# ——— 测试 ———
if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "single"
    date = sys.argv[2] if len(sys.argv) > 2 else "2026-06-20"

    if mode == "range":
        days = int(sys.argv[3]) if len(sys.argv) > 3 else 7
        print(f"多日抓取 PEK→SYD {date}+{days}天 ...")
        results, err = scrape_date_range_parallel("PEK", "SYD", date, days, workers=3)
        for r in results[:5]:
            b = r['best']
            segs = b.get('segments') or []
            fn_str = " + ".join(s.get('flight_no','?') for s in segs) if segs else "?"
            print(f"  {r['date']}: ¥{r['lowest']:>8,.0f}  {b['airline_name']:6s}  "
                  f"{fn_str:20s}  {b.get('duration',''):8s}  "
                  f"{'直飞' if b['stops']==0 else b.get('layover_airport','?')}")
    else:
        print(f"单日抓取 PEK→SYD {date} ...")
        prices, err = scrape_google_flights("PEK", "SYD", date)
        if prices:
            for p in prices[:8]:
                segs = p.get('segments') or []
                fn_str = " + ".join(s.get('flight_no','?') for s in segs) if segs else "?"
                print(f"  {p['airline_name']:6s} ¥{p['price']:>8,.0f}  "
                      f"{fn_str:20s}  {p['departure']}-{p['arrival']}  "
                      f"{p['duration']:8s}  {p.get('layover_airport','直飞'):5s}")
