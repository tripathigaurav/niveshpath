import os
import re
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, date, timedelta

import requests
import yfinance as yf
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)

def _cors_origins():
    env = os.getenv("CORS_ORIGINS", "").strip()
    if env:
        return [o.strip() for o in env.split(",") if o.strip()]
    # Default dev origins (5199 = निवेश Path Vite default; 5173 = stock Vite default)
    ports = (5199, 5174, 5173, 3000)
    origins = []
    for port in ports:
        origins.append(f"http://localhost:{port}")
        origins.append(f"http://127.0.0.1:{port}")
    return origins


CORS(app, origins=_cors_origins())
limiter = Limiter(get_remote_address, app=app, default_limits=["60 per minute"])

# ─── Config constants ─────────────────────────────────────────────────────────

MARKET_CACHE_TTL    = 30          # seconds
NAV_CACHE_TTL       = 86_400      # seconds (24 h)
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
_cache_lock = threading.Lock()

# ─── Helpers ─────────────────────────────────────────────────────────────────


def fetch_ticker_data(symbol: str) -> dict:
    """Return price, previousClose, dayChange, dayChangePct for a ticker."""
    try:
        ticker = yf.Ticker(symbol)
        fi = ticker.fast_info
        price = fi.get("lastPrice") or fi.get("regularMarketPrice")
        prev = fi.get("previousClose") or fi.get("regularMarketPreviousClose")
        day_change = round(price - prev, 4) if price is not None and prev is not None else None
        day_pct = round((day_change / prev) * 100, 2) if day_change is not None and prev else None
        return {
            "symbol": symbol,
            "price": round(float(price), 4) if price is not None else None,
            "previousClose": round(float(prev), 4) if prev is not None else None,
            "dayChange": day_change,
            "dayChangePct": day_pct,
            "error": None,
        }
    except Exception as exc:
        return {"symbol": symbol, "price": None, "previousClose": None,
                "dayChange": None, "dayChangePct": None, "error": str(exc)}


# ─── Stock endpoints ─────────────────────────────────────────────────────────


@app.route("/api/stock/price", methods=["GET"])
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
        return jsonify({"error": str(exc)}), 500


@app.route("/api/stock/actions", methods=["GET"])
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
        return jsonify({"error": str(exc)}), 500


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


@app.route("/api/mf/historical-nav", methods=["GET"])
def get_historical_nav():
    code = request.args.get("scheme_code", "").strip()
    date_str = request.args.get("date", "").strip()
    if not code or not date_str:
        return jsonify({"error": "scheme_code and date are required"}), 400
    if not _SCHEME_CODE_RE.match(code):
        return jsonify({"error": "scheme_code must be numeric (max 10 digits)"}), 400
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        amfi_date = dt.strftime("%d-%b-%Y")
        url = (
            f"https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx"
            f"?mf=0&tp=1&frmdt={amfi_date}&todt={amfi_date}"
        )
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        for line in resp.text.splitlines():
            parts = line.strip().split(";")
            if len(parts) >= 6 and parts[0].strip() == code:
                try:
                    nav_val = float(parts[4].strip())
                    return jsonify({"schemeCode": code, "nav": nav_val, "date": date_str})
                except ValueError:
                    pass
        return jsonify({"error": "NAV not found for that date"}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


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
    days = min(max(days, 1), 90)

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


# ─── Run ─────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    app.run(debug=DEBUG, port=PORT, threaded=True)
