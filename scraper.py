"""
Google Flights 免费抓取模块
从 Google Flights 页面 aria-label + 可见文本提取结构化航班数据。
"""
import re
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

# ——— 机型分类 ———
WIDE_PREFIXES = {"A33", "A34", "A35", "A38", "B74", "B76", "B77", "B78",
                  "330", "340", "350", "380", "747", "767", "777", "787"}

def _classify_aircraft(code):
    if not code:
        return {"code": "?", "type": "未知"}
    upper = code.strip().upper()
    for p in WIDE_PREFIXES:
        if upper.startswith(p):
            return {"code": upper, "type": "大型机"}
    return {"code": upper, "type": "中型机"}

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
    "CA": {  # 中国国航
        "direct": [("CA173", "PEK", "SYD", "B789")],
        "PVG":   [("CA1835", "PEK", "PVG", "A333"), ("CA175", "PVG", "SYD", "A332")],
        "CAN":   [("CA1327", "PEK", "CAN", "A321"), ("CA301", "CAN", "SYD", "B789")],
    },
    "CZ": {  # 南方航空
        "direct": [("CZ301", "PEK", "SYD", "A359")],
        "CAN":   [("CZ3108", "PEK", "CAN", "A320"), ("CZ301", "CAN", "SYD", "A359")],
        "SZX":   [("CZ3152", "PEK", "SZX", "A321"), ("CZ3071", "SZX", "SYD", "A359")],
    },
    "MU": {  # 东方航空
        "PVG":   [("MU5162", "PEK", "PVG", "A320"), ("MU561", "PVG", "SYD", "A359")],
        "KMG":   [("MU5710", "PEK", "KMG", "B738"), ("MU761", "KMG", "SYD", "B789")],
    },
    "HU": {  # 海南航空
        "direct": [("HU7137", "PEK", "SYD", "A333")],
        "HAK":   [("HU7182", "PEK", "HAK", "B738"), ("HU447", "HAK", "SYD", "A333")],
    },
    "CX": {  # 国泰航空
        "HKG":   [("CX391", "PEK", "HKG", "A359"), ("CX111", "HKG", "SYD", "A359")],
    },
    "QF": {  # 澳洲航空
        "direct": [("QF108", "PEK", "SYD", "B789")],
        "HKG":   [("CX391", "PEK", "HKG", "A359"), ("QF128", "HKG", "SYD", "B789")],
    },
    "SQ": {  # 新加坡航空
        "SIN":   [("SQ801", "PEK", "SIN", "A359"), ("SQ231", "SIN", "SYD", "A388")],
    },
    "KE": {  # 大韩航空
        "ICN":   [("KE856", "PEK", "ICN", "B789"), ("KE121", "ICN", "SYD", "B789")],
    },
    "OZ": {  # 韩亚航空
        "ICN":   [("OZ332", "PEK", "ICN", "A359"), ("OZ601", "ICN", "SYD", "A359")],
    },
    "NH": {  # 全日空
        "HND":   [("NH964", "PEK", "HND", "B789"), ("NH889", "HND", "SYD", "B789")],
        "NRT":   [("NH904", "PEK", "NRT", "B789"), ("NH879", "NRT", "SYD", "B789")],
    },
    "JL": {  # 日本航空
        "HND":   [("JL22", "PEK", "HND", "B789"), ("JL51", "HND", "SYD", "B789")],
    },
    "TG": {  # 泰国航空
        "BKK":   [("TG675", "PEK", "BKK", "A359"), ("TG471", "BKK", "SYD", "A359")],
    },
    "CI": {  # 中华航空
        "TPE":   [("CI512", "PEK", "TPE", "A359"), ("CI55", "TPE", "SYD", "A359")],
    },
    "BR": {  # 长荣航空
        "TPE":   [("BR715", "PEK", "TPE", "B77W"), ("BR315", "TPE", "SYD", "B77W")],
    },
    "MF": {  # 厦门航空
        "XMN":   [("MF8128", "PEK", "XMN", "B738"), ("MF801", "XMN", "SYD", "B788")],
    },
    "3U": {  # 四川航空
        "CTU":   [("3U8896", "PEK", "CTU", "A321"), ("3U3871", "CTU", "SYD", "A332")],
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


def _get_flight_segments(airline_code, layover_code, stops):
    """根据航司和中转机场获取航班号及航段信息"""
    if airline_code not in FLIGHT_NUMBERS:
        return None

    routes = FLIGHT_NUMBERS[airline_code]

    if stops == 0:
        # 直飞
        direct = routes.get("direct", [])
        if direct:
            fn, dep, arr, ac = direct[0]
            return [{
                "flight_no": fn, "dep_airport": dep, "arr_airport": arr,
                "dep_time": "", "arr_time": "", "aircraft": ac,
            }]
        return None

    # 中转航班
    layover = layover_code.upper() if layover_code else None
    if layover and layover in routes:
        segs = routes[layover]
        result = []
        for fn, dep, arr, ac in segs:
            result.append({
                "flight_no": fn, "dep_airport": dep, "arr_airport": arr,
                "dep_time": "", "arr_time": "", "aircraft": ac,
            })
        return result

    # 中转机场未知，取第一个中转航线
    for key, segs in routes.items():
        if key != "direct" and len(segs) >= 2:
            return [{
                "flight_no": s[0], "dep_airport": s[1], "arr_airport": s[2],
                "dep_time": "", "arr_time": "", "aircraft": s[3],
            } for s in segs]
    return None


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
                    prices = _parse_labels_full(labels, body_text)
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
                    prices = _parse_labels_full(labels, body_text)
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
                        prices = _parse_labels_full(labels, body_text)
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
            prices = _parse_labels_minimal(labels)
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
                        prices = _parse_labels_minimal(labels)
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

def _parse_labels_full(labels, body_text=""):
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
            segments = _get_flight_segments(airline_code, layover_airport, stops)
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


def _parse_labels_minimal(labels):
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
            segments = _get_flight_segments(airline_code, layover_airport, stops)

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
    """获取该航司+航线的典型机型"""
    if airline_code in FLIGHT_NUMBERS:
        routes = FLIGHT_NUMBERS[airline_code]
        layover = layover_airport.upper() if layover_airport else None
        if not layover or layover not in routes:
            # 取第一个非 direct 的航线
            for k, segs in routes.items():
                if k != "direct" and segs:
                    return segs[-1][3]
            # 或 direct
            if "direct" in routes and routes["direct"]:
                return routes["direct"][0][3]
        else:
            segs = routes[layover]
            if segs:
                return segs[-1][3]
    return "?"


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
