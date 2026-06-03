# Future Plans — Portfolio Tracker

## Phase 3 — Data Safety & Transaction Log

- Auto-backup reminder toast if no export in 7+ days
- Transaction log model: each buy/sell recorded as (date, symbol, qty, price)
- Prompt existing users to backfill purchase dates on first use
- Transaction history screen (view buy/sell log)

### WATCH OUT

- Don't block the app if user skips date entry — show banner "XIRR unavailable — add purchase dates" until complete
- Export file contains full portfolio — show warning toast before download

## Phase 4 — Analytics, Gold & Dashboard Charts

- XIRR calculation (per holding + overall portfolio)  
  Requires transaction log from Phase 3
- Gold tracking: MCX INR/10g + international USD/oz via Yahoo Finance
- Portfolio value history chart (store daily snapshots in IndexedDB — NOT localStorage, 5MB cap will overflow)
- Allocation pie chart by asset type
- Top gainers/losers with sparklines

### WATCH OUT

- Use `idb` wrapper for IndexedDB (async-only API)
- XIRR needs Newton-Raphson solver — handle edge cases: single transaction (undefined), all losses (solver diverges)
- Yahoo Finance is unofficial — cache last-known prices so UI never shows ₹0. Add "price source status" indicator.

## Phase 5 — Live Data & Watchlist

- Auto-refresh prices every 60s during market hours (9:15–15:30 IST for NSE, US hours for US stocks)
- Watchlist tab with target price alerts
- In-app toast as primary alert (browser push as opt-in bonus)

### WATCH OUT

- Batch all symbol requests into one API call
- Pause auto-refresh when tab is hidden (`document.visibilitychange`)
- Don't refresh outside market hours (wastes API calls)

## Phase 6 — SIP Tracker & Broker Import

- SIP tracking: monthly entries, XIRR per SIP vs lump sum
- Import from (priority order):
  1. Zerodha Console CSV
  2. Groww CSV
  3. Upstox CSV
  4. MFCentral CSV (covers all MF platforms in one shot)
- Tier 2 (if demand): Angel One, ICICI Direct, Paytm Money
- Generic CSV mapper with broker presets + manual column mapping
- Duplicate detection on import (match on symbol + date + qty)

### WATCH OUT

- Use column-NAME matching, not position-based
- Always show preview step before import
- CAMS PDF parsing is fragile — offer "paste table text" instead

## Phase 7 — Tax Reports & Mobile Polish

- STCG/LTCG calculation with grandfathering (Jan 31, 2018 FMV for pre-2018 Indian equities)
- Tax harvesting suggestions
- Downloadable tax summary PDF (client-side via jsPDF — NO server-side generation, keeps privacy promise)
- Portfolio sharing via read-only encoded URL (no server storage)

### WATCH OUT

- Pre-fetch Nifty 500 FMV prices for Jan 31 2018
- Add "Tax rules as of FY 2024-25" disclaimer
- PDF generation must be 100% client-side
- Sharing links encode summary only, not raw data

---

*All data always stays in your browser's localStorage. No cloud storage or accounts are planned.*
