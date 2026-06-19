import os
import re
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, date, timedelta

import logging

import requests
import yfinance as yf
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from markupsafe import escape

app = Flask(__name__)
log = logging.getLogger(__name__)

def _cors_origins():
    env = os.getenv("CORS_ORIGINS", "").strip()
    if env:
        return [o.strip() for o in env.split(",") if o.strip()]
    flask_env = os.getenv("FLASK_ENV", "development").lower()
    if flask_env == "production":
        log.warning("CORS_ORIGINS not set in production — rejecting cross-origin requests")
        return []
    # Default dev origins (5199 = निवेश Path Vite default; 5173 = stock Vite default)
    ports = (5199, 5174, 5173, 3000)
    origins = []
    for port in ports:
        origins.append(f"http://localhost:{port}")
        origins.append(f"http://127.0.0.1:{port}")
    return origins


CORS(app, origins=_cors_origins())


@app.after_request
def _set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
limiter = Limiter(get_remote_address, app=app, default_limits=["60 per minute"])

# Support correct client IP behind Render/Nginx proxy
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

# ─── Config constants ─────────────────────────────────────────────────────────

MARKET_CACHE_TTL    = 30          # seconds
NAV_CACHE_TTL       = 86_400      # seconds (24 h)
FUNDAMENTALS_CACHE_TTL = 3600     # seconds (1 h)
OVERVIEW_MAX_WORKERS = 8
MIN_SEARCH_LEN      = 2
STOCK_SEARCH_LIMIT  = 8
MF_SEARCH_LIMIT     = 10
BATCH_SYMBOLS_MAX   = 50          # cap for /api/stock/prices
REQUEST_TIMEOUT     = 20          # seconds for external HTTP calls
PORT                = int(os.getenv("PORT", 5000))
DEBUG               = os.getenv("FLASK_DEBUG", "false").lower() == "true"

# ─── Input validation ────────────────────────────────────────────────────────

_SYMBOL_RE    = re.compile(r'^[A-Za-z0-9.\-^=]{1,20}$')
_SCHEME_CODE_RE = re.compile(r'^\d{1,10}$')


def validate_symbol(raw: str):
    """Return (cleaned_symbol, None) on success or (None, error_message) on failure."""
    s = raw.strip().upper()
    if not _SYMBOL_RE.match(s):
        return None, f"Invalid symbol '{raw}'"
    return s, None


# ─── Simple in-memory cache ──────────────────────────────────────────────────

_market_cache: dict = {}
_market_cache_time: float = 0
_nav_cache: dict = {}
_nav_cache_time: float = 0
_fundamentals_cache: dict = {}   # symbol → { data, ts }
_cache_lock = threading.Lock()

# ─── Helpers ─────────────────────────────────────────────────────────────────


def _enrich_ohlc_from_history(sym: str, result: dict) -> dict:
    """Fill open / day range / 52-week range when fast_info is sparse (common after hours)."""
    if result.get("price") is None:
        return result
    need = (
        result.get("open") is None
        or result.get("dayHigh") is None
        or result.get("yearHigh") is None
        or result.get("yearLow") is None
    )
    if not need:
        return result
    try:
        hist = yf.Ticker(sym).history(period="1y", auto_adjust=True)
        if hist is None or hist.empty:
            return result
        if result.get("yearHigh") is None:
            result["yearHigh"] = round(float(hist["High"].max()), 4)
        if result.get("yearLow") is None:
            result["yearLow"] = round(float(hist["Low"].min()), 4)
        last = hist.iloc[-1]
        if result.get("open") is None:
            result["open"] = round(float(last["Open"]), 4)
        if result.get("dayHigh") is None:
            result["dayHigh"] = round(float(last["High"]), 4)
        if result.get("dayLow") is None:
            result["dayLow"] = round(float(last["Low"]), 4)
        if result.get("previousClose") is None and len(hist) >= 2:
            result["previousClose"] = round(float(hist["Close"].iloc[-2]), 4)
            price = result.get("price")
            if price is not None:
                day_change = round(price - result["previousClose"], 4)
                result["dayChange"] = day_change
                if result["previousClose"]:
                    result["dayChangePct"] = round(
                        (day_change / result["previousClose"]) * 100, 2
                    )
    except Exception:
        pass
    return result


def fetch_ticker_data(symbol: str) -> dict:
    """Return price, previousClose, dayChange, dayChangePct for a ticker.

    For Indian NSE symbols (ending .NS), if Yahoo returns no price, falls back
    to the BSE equivalent (.BO suffix) automatically.
    """
    def _query(sym: str) -> dict:
        try:
            ticker = yf.Ticker(sym)
            fi = ticker.fast_info
            price = fi.get("lastPrice") or fi.get("regularMarketPrice")
            prev = fi.get("previousClose") or fi.get("regularMarketPreviousClose")
            day_change = round(price - prev, 4) if price is not None and prev is not None else None
            day_pct = round((day_change / prev) * 100, 2) if day_change is not None and prev else None

            def _round_opt(val):
                if val is None:
                    return None
                try:
                    return round(float(val), 4)
                except (TypeError, ValueError):
                    return None

            open_px = fi.get("open") or fi.get("regularMarketOpen")
            day_high = fi.get("dayHigh") or fi.get("regularMarketDayHigh")
            day_low = fi.get("dayLow") or fi.get("regularMarketDayLow")
            year_high = fi.get("yearHigh") or fi.get("fiftyTwoWeekHigh")
            year_low = fi.get("yearLow") or fi.get("fiftyTwoWeekLow")

            return {
                "symbol": sym,
                "price": _round_opt(price),
                "previousClose": _round_opt(prev),
                "dayChange": day_change,
                "dayChangePct": day_pct,
                "open": _round_opt(open_px),
                "dayHigh": _round_opt(day_high),
                "dayLow": _round_opt(day_low),
                "yearHigh": _round_opt(year_high),
                "yearLow": _round_opt(year_low),
                "error": None,
            }
        except Exception as exc:
            return {
                "symbol": sym,
                "price": None,
                "previousClose": None,
                "dayChange": None,
                "dayChangePct": None,
                "open": None,
                "dayHigh": None,
                "dayLow": None,
                "yearHigh": None,
                "yearLow": None,
                "error": str(exc),
            }

    result = _query(symbol)
    if result["price"] is not None:
        result = _enrich_ohlc_from_history(symbol, result)

    # Fallback: NSE (.NS) → BSE (.BO) when price is missing
    if result["price"] is None and symbol.upper().endswith(".NS"):
        bse_symbol = symbol[:-3] + ".BO"
        fallback = _query(bse_symbol)
        if fallback["price"] is not None:
            # Return the BSE data but keep the originally-requested symbol in the key
            fallback["symbol"] = symbol
            fallback["_source"] = "BSE"
            return _enrich_ohlc_from_history(bse_symbol, fallback)

    return result


# ─── Stock endpoints ─────────────────────────────────────────────────────────


@app.route("/api/stock/price", methods=["GET"])
@limiter.limit("60 per minute")
def get_single_price():
    symbol = request.args.get("symbol", "").strip()
    if not symbol:
        return jsonify({"error": "symbol query param is required"}), 400
    symbol, err = validate_symbol(symbol)
    if err:
        return jsonify({"error": err}), 400
    return jsonify(fetch_ticker_data(symbol))


@app.route("/api/stock/prices", methods=["POST"])
@limiter.limit("30 per minute")
def get_batch_prices():
    body = request.get_json(silent=True) or {}
    symbols = body.get("symbols", [])
    if not symbols:
        return jsonify({"error": "symbols array is required"}), 400
    if len(symbols) > BATCH_SYMBOLS_MAX:
        return jsonify({"error": f"Too many symbols; max {BATCH_SYMBOLS_MAX}"}), 400
    invalid = []
    cleaned = []
    for raw in symbols:
        s, err = validate_symbol(str(raw))
        if err:
            invalid.append(raw)
        else:
            cleaned.append(s)
    if invalid:
        return jsonify({"error": f"Invalid symbols: {invalid}"}), 400
    def _fetch_one(s):
        return s, fetch_ticker_data(s)
    with ThreadPoolExecutor(max_workers=min(len(cleaned), OVERVIEW_MAX_WORKERS)) as pool:
        pairs = list(pool.map(_fetch_one, cleaned))
    return jsonify(dict(pairs))


@app.route("/api/stock/search", methods=["GET"])
@limiter.limit("20 per minute")
def search_stocks():
    query = request.args.get("q", "").strip()[:50]
    if len(query) < MIN_SEARCH_LEN:
        return jsonify([])
    try:
        search = yf.Search(query, max_results=STOCK_SEARCH_LIMIT + 2)
        quotes = search.quotes or []
        results = []
        for q in quotes:
            qtype = q.get("quoteType", "")
            if qtype not in ("EQUITY", "ETF", "MUTUALFUND"):
                continue
            results.append({
                "symbol": q.get("symbol", ""),
                "name": q.get("longname") or q.get("shortname", ""),
                "exchange": q.get("exchange", ""),
                "type": qtype,
            })
        return jsonify(results[:STOCK_SEARCH_LIMIT])
    except Exception as exc:
        log.exception("Stock search failed for q=%s", query)
        return jsonify({"error": "Search failed — please try again"}), 500


@app.route("/api/stock/actions", methods=["GET"])
@limiter.limit("30 per minute")
def get_corporate_actions():
    symbol = request.args.get("symbol", "").strip()
    if not symbol:
        return jsonify({"error": "symbol is required"}), 400
    symbol, err = validate_symbol(symbol)
    if err:
        return jsonify({"error": err}), 400
    try:
        ticker = yf.Ticker(symbol)
        # Dividends
        divs = ticker.dividends
        dividends = []
        if divs is not None and not divs.empty:
            for date_idx, amount in divs.tail(5).items():
                dividends.append({
                    "date": str(date_idx.date()),
                    "amount": round(float(amount), 4),
                })
        # Splits
        splits = ticker.splits
        split_list = []
        if splits is not None and not splits.empty:
            for date_idx, ratio in splits.tail(5).items():
                split_list.append({
                    "date": str(date_idx.date()),
                    "ratio": float(ratio),
                })
        # Upcoming earnings
        cal = ticker.calendar
        earnings_date = None
        if cal is not None and isinstance(cal, dict):
            ed = cal.get("Earnings Date")
            if ed and len(ed) > 0:
                earnings_date = str(ed[0].date()) if hasattr(ed[0], "date") else str(ed[0])
        return jsonify({
            "symbol": symbol,
            "dividends": list(reversed(dividends)),
            "splits": list(reversed(split_list)),
            "nextEarnings": earnings_date,
        })
    except Exception as exc:
        log.exception("Corporate actions failed for %s", symbol)
        return jsonify({"error": "Could not fetch corporate actions"}), 500


@app.route("/api/stock/history-price", methods=["GET"])
@limiter.limit("60 per minute")
def get_stock_history_price():
    """Return the closing price of a stock on a specific date (or nearest available day).
    Used for Section 112A grandfathering (FMV on Jan 31 2018).
    """
    symbol = request.args.get("symbol", "").strip()
    date_str = request.args.get("date", "").strip()
    if not symbol or not date_str:
        return jsonify({"error": "symbol and date are required"}), 400
    symbol, err = validate_symbol(symbol)
    if err:
        return jsonify({"error": err}), 400
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "date must be YYYY-MM-DD"}), 400
    try:
        # Fetch a small window of history around the target date
        start = (target - timedelta(days=5)).strftime("%Y-%m-%d")
        end = (target + timedelta(days=5)).strftime("%Y-%m-%d")
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start, end=end)
        if hist is None or hist.empty:
            return jsonify({"error": f"No price data for {symbol} near {date_str}"}), 404
        # Find closest date
        hist = hist.reset_index()
        hist["_date"] = hist["Date"].apply(lambda d: d.date() if hasattr(d, "date") else d)
        hist["_diff"] = hist["_date"].apply(lambda d: abs((d - target).days))
        row = hist.loc[hist["_diff"].idxmin()]
        close_price = round(float(row["Close"]), 4)
        actual_date = str(row["_date"])
        return jsonify({
            "symbol": symbol,
            "requestedDate": date_str,
            "actualDate": actual_date,
            "price": close_price,
        })
    except Exception as exc:
        log.exception("History price failed for %s on %s", symbol, date_str)
        return jsonify({"error": "Could not fetch historical price"}), 500


# ─── Market overview ─────────────────────────────────────────────────────────


_OVERVIEW_SYMBOLS = {
    "nifty50":   ("^NSEI",    "NIFTY 50"),
    "sensex":    ("^BSESN",   "SENSEX"),
    "niftyBank": ("^NSEBANK", "NIFTY BANK"),
    "usdInr":    ("USDINR=X", "USD/INR"),
    "sp500":     ("^GSPC",    "S&P 500"),
    "nasdaq":    ("^IXIC",    "NASDAQ"),
    "gold":      ("GC=F",     "GOLD"),
    "crude":     ("CL=F",     "CRUDE OIL"),
}


@app.route("/api/market/overview", methods=["GET"])
@limiter.limit("30 per minute")
def get_market_overview():
    global _market_cache, _market_cache_time
    with _cache_lock:
        if time.time() - _market_cache_time < MARKET_CACHE_TTL and _market_cache:
            return jsonify(_market_cache)

    def _fetch(item):
        key, (symbol, label) = item
        result = fetch_ticker_data(symbol)
        result["label"] = label
        return key, result

    with ThreadPoolExecutor(max_workers=OVERVIEW_MAX_WORKERS) as pool:
        pairs = list(pool.map(_fetch, _OVERVIEW_SYMBOLS.items()))

    data = {k: v for k, v in pairs}
    with _cache_lock:
        _market_cache = data
        _market_cache_time = time.time()
    return jsonify(data)


# ─── FX ──────────────────────────────────────────────────────────────────────


@app.route("/api/fx/usd-inr", methods=["GET"])
@limiter.limit("30 per minute")
def get_usd_inr():
    result = fetch_ticker_data("USDINR=X")
    return jsonify({"rate": result.get("price"), "dayChange": result.get("dayChange"),
                    "dayChangePct": result.get("dayChangePct")})


# ─── Mutual Fund NAV (AMFI) ──────────────────────────────────────────────────


def _load_amfi_nav() -> dict:
    global _nav_cache, _nav_cache_time
    with _cache_lock:
        if time.time() - _nav_cache_time < NAV_CACHE_TTL and _nav_cache:
            return _nav_cache
    try:
        resp = requests.get(
            "https://www.amfiindia.com/spages/NAVAll.txt", timeout=REQUEST_TIMEOUT
        )
        resp.raise_for_status()
        schemes: dict = {}
        for line in resp.text.splitlines():
            parts = line.strip().split(";")
            if len(parts) >= 6:
                code = parts[0].strip()
                name = parts[3].strip()
                nav_str = parts[4].strip()
                date_str = parts[5].strip()
                try:
                    nav_val = float(nav_str)
                    schemes[code] = {"name": name, "nav": nav_val, "date": date_str}
                except ValueError:
                    pass
        with _cache_lock:
            _nav_cache = schemes
            _nav_cache_time = time.time()
        return schemes
    except Exception:
        return _nav_cache or {}


@app.route("/api/mf/nav", methods=["GET"])
@limiter.limit("30 per minute")
def get_mf_nav():
    code = request.args.get("scheme_code", "").strip()
    if not code:
        return jsonify({"error": "scheme_code is required"}), 400
    if not _SCHEME_CODE_RE.match(code):
        return jsonify({"error": "scheme_code must be numeric (max 10 digits)"}), 400
    schemes = _load_amfi_nav()
    scheme = schemes.get(code)
    if not scheme:
        return jsonify({"error": f"Scheme {code} not found"}), 404
    return jsonify({"schemeCode": code, **scheme})


@app.route("/api/mf/search", methods=["GET"])
@limiter.limit("20 per minute")
def search_mf():
    query = request.args.get("q", "").strip()[:100].lower()
    if len(query) < MIN_SEARCH_LEN:
        return jsonify([])
    schemes = _load_amfi_nav()
    results = []
    for code, info in schemes.items():
        if query in info["name"].lower():
            results.append({"schemeCode": code, "schemeName": info["name"],
                            "nav": info["nav"], "date": info["date"]})
        if len(results) >= MF_SEARCH_LIMIT:
            break
    return jsonify(results)


def _amfi_nav_on_day(code, day):
    """Return scheme NAV from AMFI history report for one calendar day."""
    amfi_date = day.strftime("%d-%b-%Y")
    url = (
        f"https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx"
        f"?mf=0&tp=1&frmdt={amfi_date}&todt={amfi_date}"
    )
    resp = requests.get(url, timeout=REQUEST_TIMEOUT)
    for line in resp.text.splitlines():
        parts = line.strip().split(";")
        if len(parts) >= 6 and parts[0].strip() == code:
            try:
                return round(float(parts[4].strip()), 4)
            except ValueError:
                continue
    return None


@app.route("/api/mf/historical-nav", methods=["GET"])
@limiter.limit("30 per minute")
def get_historical_nav():
    code = request.args.get("scheme_code", "").strip()
    date_str = request.args.get("date", "").strip()
    if not code or not date_str:
        return jsonify({"error": "scheme_code and date are required"}), 400
    if not _SCHEME_CODE_RE.match(code):
        return jsonify({"error": "scheme_code must be numeric (max 10 digits)"}), 400
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "date must be YYYY-MM-DD"}), 400

    try:
        # Exact day, then nearest trading day within ±14 days (weekends / AMFI gaps).
        for offset in [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -7, 7, -10, 10, -14, 14]:
            try_day = target + timedelta(days=offset)
            nav_val = _amfi_nav_on_day(code, try_day)
            if nav_val is not None:
                actual = try_day.isoformat()
                return jsonify({
                    "schemeCode": code,
                    "nav": nav_val,
                    "date": actual,
                    "requestedDate": date_str,
                    "actualDate": actual,
                })
        return jsonify({"error": "NAV not found for that date"}), 404
    except Exception as exc:
        log.exception("Historical NAV failed for %s on %s", code, date_str)
        return jsonify({"error": "Could not fetch historical NAV"}), 500


# ─── Portfolio upcoming events ───────────────────────────────────────────────


def _coerce_date(val):
    """Return a date object or None from yfinance / pandas values."""
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if hasattr(val, "date") and callable(val.date):
        try:
            return val.date()
        except Exception:
            pass
    try:
        return datetime.fromisoformat(str(val)[:10]).date()
    except Exception:
        return None


def _upcoming_events_for_symbol(symbol: str, name: str, region: str, today: date, horizon_end: date) -> list:
    events = []
    try:
        ticker = yf.Ticker(symbol)
        cal = ticker.calendar

        def _add_event(ev_date, ev_type, detail):
            if ev_date is None or ev_date < today or ev_date > horizon_end:
                return
            events.append({
                "symbol": symbol,
                "name": name or symbol,
                "region": region,
                "type": ev_type,
                "date": str(ev_date),
                "detail": detail,
            })

        if cal is not None:
            if isinstance(cal, dict):
                earnings = cal.get("Earnings Date")
                if earnings is not None:
                    items = earnings if isinstance(earnings, (list, tuple)) else [earnings]
                    for item in items:
                        _add_event(_coerce_date(item), "earnings", "Earnings")
                for key, ev_type, label in (
                    ("Ex-Dividend Date", "dividend", "Ex-dividend"),
                    ("Dividend Date", "dividend", "Dividend"),
                ):
                    raw = cal.get(key)
                    if raw is not None:
                        items = raw if isinstance(raw, (list, tuple)) else [raw]
                        for item in items:
                            _add_event(_coerce_date(item), ev_type, label)
            elif hasattr(cal, "index"):
                for idx in cal.index:
                    label = str(idx)
                    row = cal.loc[idx]
                    val = row.iloc[0] if hasattr(row, "iloc") else row
                    if "Earnings" in label:
                        _add_event(_coerce_date(val), "earnings", "Earnings")
                    elif "Dividend" in label or "Ex-Dividend" in label:
                        _add_event(_coerce_date(val), "dividend", label)

        info = getattr(ticker, "info", None) or {}
        if isinstance(info, dict):
            ex_div = info.get("exDividendDate")
            if ex_div:
                ts = ex_div
                if isinstance(ts, (int, float)):
                    ev_d = datetime.utcfromtimestamp(ts).date()
                else:
                    ev_d = _coerce_date(ts)
                _add_event(ev_d, "dividend", "Ex-dividend")
    except Exception:
        pass
    return events


@app.route("/api/portfolio/upcoming-events", methods=["POST"])
@limiter.limit("10 per minute")
def portfolio_upcoming_events():
    body = request.get_json(silent=True) or {}
    holdings = body.get("holdings", [])
    if not holdings:
        return jsonify({"events": [], "days": 30})
    try:
        days = int(body.get("days", 30))
    except (TypeError, ValueError):
        days = 30
    if days < 1 or days > 365:
        return jsonify({"error": "days must be between 1 and 365"}), 400

    today = date.today()
    horizon_end = today + timedelta(days=days)
    cleaned = []
    for h in holdings[:BATCH_SYMBOLS_MAX]:
        sym = str(h.get("symbol", "")).strip()
        if not sym:
            continue
        sym, err = validate_symbol(sym)
        if err:
            continue
        cleaned.append({
            "symbol": sym,
            "name": str(h.get("name", sym))[:80],
            "region": str(h.get("region", "IN"))[:4],
        })

    def _fetch(h):
        return _upcoming_events_for_symbol(
            h["symbol"], h["name"], h["region"], today, horizon_end
        )

    all_events = []
    if not cleaned:
        return jsonify({"events": [], "days": days})
    with ThreadPoolExecutor(max_workers=min(len(cleaned), OVERVIEW_MAX_WORKERS)) as pool:
        for batch in pool.map(_fetch, cleaned):
            all_events.extend(batch)

    seen = set()
    unique = []
    for ev in sorted(all_events, key=lambda e: e["date"]):
        key = (ev["symbol"], ev["date"], ev["type"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(ev)

    return jsonify({"events": unique, "days": days})


# ─── Fundamentals ────────────────────────────────────────────────────────────

_FUNDAMENTALS_FIELDS = (
    "trailingPE", "forwardPE", "trailingEps", "dividendYield",
    "marketCap", "sector", "industry", "beta",
    "fiftyTwoWeekHigh", "fiftyTwoWeekLow", "bookValue", "priceToBook",
)

FUNDAMENTALS_BATCH_MAX = 20


def _fetch_fundamentals(symbol):
    """Return fundamentals dict for a single symbol, using cache."""
    now = time.time()
    with _cache_lock:
        cached = _fundamentals_cache.get(symbol)
        if cached and now - cached["ts"] < FUNDAMENTALS_CACHE_TTL:
            return cached["data"]

    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}
        data = {"symbol": symbol, "error": None}
        for field in _FUNDAMENTALS_FIELDS:
            data[field] = info.get(field)
        # Rename for cleaner API
        data["pe"] = data.pop("trailingPE", None)
        data["forwardPe"] = data.pop("forwardPE", None)
        data["eps"] = data.pop("trailingEps", None)
        data["yearHigh"] = data.pop("fiftyTwoWeekHigh", None)
        data["yearLow"] = data.pop("fiftyTwoWeekLow", None)
        data["pb"] = data.pop("priceToBook", None)
    except Exception:
        log.exception("Fundamentals fetch error for %s", symbol)
        data = {"symbol": symbol, "error": "Fetch failed"}

    with _cache_lock:
        _fundamentals_cache[symbol] = {"data": data, "ts": now}
    return data


@app.route("/api/stock/fundamentals", methods=["GET"])
@limiter.limit("10 per minute")
def stock_fundamentals_single():
    raw = request.args.get("symbol", "")
    symbol, err = validate_symbol(raw)
    if err:
        return jsonify({"error": err}), 400
    return jsonify(_fetch_fundamentals(symbol))


@app.route("/api/stock/fundamentals", methods=["POST"])
@limiter.limit("5 per minute")
def stock_fundamentals_batch():
    body = request.get_json(silent=True) or {}
    symbols = body.get("symbols", [])
    if not isinstance(symbols, list) or len(symbols) == 0:
        return jsonify({"error": "symbols array is required"}), 400
    if len(symbols) > FUNDAMENTALS_BATCH_MAX:
        return jsonify({"error": f"Max {FUNDAMENTALS_BATCH_MAX} symbols per request"}), 400

    cleaned = []
    for raw in symbols:
        sym, err = validate_symbol(str(raw))
        if sym:
            cleaned.append(sym)

    results = []
    if cleaned:
        with ThreadPoolExecutor(max_workers=min(len(cleaned), 8)) as pool:
            results = list(pool.map(_fetch_fundamentals, cleaned))

    return jsonify({"results": results})


# ─── Upcoming IPOs ───────────────────────────────────────────────────────────

_ipo_cache = {"data": None, "ts": 0}
_IPO_CACHE_TTL = 3600  # 1 hour

def _fetch_upcoming_ipos():
    """Fetch current/upcoming IPOs from NSE India API."""
    now = time.time()
    with _cache_lock:
        if _ipo_cache["data"] is not None and now - _ipo_cache["ts"] < _IPO_CACHE_TTL:
            return _ipo_cache["data"]

    ipos = []

    # ── Indian IPOs from NSE current-issue API ──
    try:
        session = requests.Session()
        # NSE requires a session cookie — hit the main page first
        session.get(
            "https://www.nseindia.com",
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
            timeout=8,
        )
        resp = session.get(
            "https://www.nseindia.com/api/ipo-current-issue",
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                "Accept": "application/json",
                "Referer": "https://www.nseindia.com/market-data/all-upcoming-issues-ipo",
            },
            timeout=10,
        )
        if resp.ok:
            data = resp.json()
            if isinstance(data, list):
                for item in data[:20]:
                    name = item.get("companyName", "")
                    if not name:
                        continue
                    symbol = item.get("symbol", "")
                    series = item.get("series", "")
                    ipo_type = "SME" if series == "SME" else "Mainboard"

                    # Subscription times
                    subs = ""
                    times = item.get("noOfTime")
                    if times:
                        try:
                            t = float(times)
                            subs = f"{t:.2f}x"
                        except (ValueError, TypeError):
                            pass

                    ipos.append({
                        "name": str(name)[:100],
                        "symbol": str(symbol)[:20],
                        "market": "IN",
                        "openDate": item.get("issueStartDate", ""),
                        "closeDate": item.get("issueEndDate", ""),
                        "price": item.get("issuePrice", ""),
                        "subscription": subs,
                        "type": ipo_type,
                        "status": item.get("status", ""),
                    })
    except Exception:
        log.exception("Failed to fetch NSE IPO data")

    with _cache_lock:
        _ipo_cache["data"] = ipos
        _ipo_cache["ts"] = now

    return ipos


@app.route("/api/ipos/upcoming", methods=["GET"])
@limiter.limit("10 per minute")
def upcoming_ipos():
    try:
        data = _fetch_upcoming_ipos()
        return jsonify({"ipos": data})
    except Exception:
        log.exception("IPO fetch error")
        return jsonify({"ipos": [], "error": "Failed to fetch IPO data"})


# ─── Run ─────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    app.run(debug=DEBUG, port=PORT, threaded=True)
