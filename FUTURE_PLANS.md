# Future Plans — निवेश Path

Phases 1 and 2 are complete. This document tracks everything planned from Phase 3 onward, including specific risks and mitigations that must be addressed during each phase.

---

## ✅ Phase 1 — Foundation
- Indian stocks (NSE/BSE) with live prices via Yahoo Finance
- Add / edit / delete holdings with P&L and day change
- Flask backend with yfinance + AMFI proxy
- LocalStorage persistence

## ✅ Phase 2 — Multi-Asset Support
- US stocks (NASDAQ/NYSE) with USD → INR conversion
- Mutual funds with AMFI NAV lookup
- Other assets (FD, real estate, crypto, etc.) — manual entry
- Market strip ticker (Nifty, Sensex, USD/INR, S&P 500, NASDAQ, Gold, Crude)
- Global search (stocks + MFs)
- निवेश Path branding, dark/light theme, profile modal

---

## 🔜 Phase 3 — Data Safety & Export/Import

> **Urgent.** All data lives in LocalStorage — one browser clear wipes everything. This must ship before any more data features are added.

- [x] One-click export portfolio as JSON (download to disk)
- [x] Import portfolio from JSON backup (full restore)
- [x] Auto-backup reminder toast if no export has been done in 7+ days
- [x] Show last export date in profile/settings
- [x] **Transaction log model** — record each buy/sell as `(date, symbol, qty, price)`. Required now because Phase 4 XIRR cannot work without purchase dates. Existing holdings should prompt user to backfill dates on first use.

### ⚠️ Watch Out

**Privacy on export**
Export file contains the user's complete portfolio. Show a warning toast before download: *"This file contains your complete portfolio data — store it somewhere safe."* Do not silently download without acknowledgement.

**Backfill UX**
Do not block the app if the user skips entering historical purchase dates. Make backfill optional but show a persistent banner — *"XIRR unavailable — add purchase dates to your holdings"* — until all dates are filled in. Skipping must be frictionless; the banner should be dismissible per session.

---

## Phase 4 — Analytics & Dashboard

- [ ] **XIRR calculation** — annualized return per holding and for the overall portfolio. Requires transaction log from Phase 3.
- [ ] **Dashboard page enhancements**
  - Polish and modernize the existing dashboard UI
  - Top 3 gainers / top 3 losers
- [ ] **Portfolio value history chart** — store daily snapshots and render a line graph over time.
  - Use **IndexedDB** (via the `idb` wrapper library) — NOT LocalStorage. LocalStorage has a ~5 MB cap that will overflow with time-series data. Keep holdings and transactions in LocalStorage; use IndexedDB only for snapshots.

### ⚠️ Watch Out

**IndexedDB is async-only**
Use the [`idb`](https://github.com/jakearchibald/idb) wrapper library (tiny, well-maintained). All reads and writes are Promises. Do not mix sync LocalStorage patterns with IndexedDB patterns in the same hook — keep them in separate utils.

**XIRR edge cases**
XIRR requires a numerical solver (Newton-Raphson). Handle these gracefully — never crash:
- Single transaction: XIRR is undefined (show "N/A")
- All-loss portfolio: solver may not converge (show "N/A" with tooltip)
- Very short holding period (<7 days): XIRR is misleadingly large (consider a minimum period before showing)

**Yahoo Finance reliability**
Yahoo Finance is unofficial — no SLA, endpoints change without notice. Mitigate:
1. Cache last-known prices in LocalStorage so the UI never shows ₹0 on fetch failure
2. Add a "price source status" indicator (green/amber/red dot in the market strip)
3. Log fetch failures silently; display *"prices as of HH:MM"* timestamp, not a broken state
4. Future fallback: NSE direct API for Indian stocks

---

## Phase 5 — Live Data & Watchlist

- [ ] **Smart auto-refresh** — refresh prices every 60 s during market hours only
  - NSE/BSE: 09:15–15:30 IST on weekdays
  - US markets: NYSE/NASDAQ hours (ET), converted to IST for scheduling
  - No background polling outside market hours — stale "live" badge is misleading
- [ ] **Watchlist tab** — add any stock/MF with a target price
- [ ] **In-app toast alerts** when a watchlist target is hit (primary mechanism)
- [ ] **Browser push notifications** as opt-in bonus only

### ⚠️ Watch Out

**Rate limiting**
Batch all symbol requests into a single API call — not one-per-symbol. Yahoo Finance allows ~2000 symbols in a single query. The backend `/api/stock/prices` already supports batch; use it for auto-refresh too.

**Battery and performance**
Pause auto-refresh when the tab is hidden (`document.visibilitychange` event). Resume immediately on focus. This avoids burning CPU and network when the user switches tabs.

**Browser push notifications**
Require HTTPS and explicit user permission. Most users deny on first prompt. Do NOT depend on push as the primary alert mechanism — in-app toast must work independently and without any permission.

**Market hours detection**
Derive IST from the user's local clock (`Intl` API), not from a hardcoded UTC offset. Check public holidays for NSE — avoid refreshing on exchange holidays (pre-populate a holiday list or check the NSE holiday API).

---

## Phase 6 — SIP Tracker & Broker Import

- [ ] **SIP tracking** — record monthly SIP entries per fund; show XIRR per SIP vs lump sum comparison
- [ ] Auto-detect and map CSV columns to internal schema
- [ ] Preview + confirm step before importing (show what will change)

#### Tier 1 — Ship these (covers ~80% of Indian retail investors)

- [ ] **Zerodha Console CSV** — equities + MF
- [ ] **Groww CSV** — equities + MF
- [ ] **Upstox CSV** — equities
- [ ] **MFCentral CSV** — consolidated MF across all platforms (one file covers every MF holding regardless of originating broker)

#### Tier 2 — Stretch goals

- [ ] **CAMS / Karvy MF statement** — PDF parse *(fragile, see Watch Out below)*
- [ ] Additional broker CSVs (Angel One, HDFC Securities, ICICI Direct) as demand warrants

### ⚠️ Watch Out

**CSV format drift**
Zerodha, Groww, and Upstox change their CSV column names occasionally. Use **column-name matching** (not position-based indexing). Always show a mapping preview step so the user can verify columns before committing the import.

**MFCentral is the MF priority**
MFCentral's consolidated statement covers holdings across Zerodha Coin, Groww, Paytm Money, and any AMFI-registered platform in a single CSV. Import this before worrying about individual broker MF exports — one importer replaces many.

**CAMS PDF parsing**
Table layouts and fonts vary between CAMS statements. Mark as Tier 2 stretch goal. A simpler, equally useful alternative: a *"paste table text"* input — user copies the table from PDF, pastes it in, app parses it. Much more reliable than PDF upload.

**Duplicate detection**
If the user imports the same CSV twice, do not double-count holdings. Match on `(symbol + date + qty)` to detect duplicates. Show a summary after import: *"12 holdings added, 3 skipped as duplicates."*

---

## Phase 7 — Tax Reports & Sharing

- [ ] **STCG / LTCG calculation** with grandfathering rule (Jan 31, 2018 FMV as cost basis for Indian equities held before that date)
- [ ] **Tax harvesting suggestions** — identify holdings with unrealized losses that can offset realized gains
- [ ] **Downloadable tax summary PDF** — generated fully client-side using `jsPDF` + `jsPDF-AutoTable`
- [ ] **Portfolio sharing via read-only encoded URL** — no server storage; encode portfolio summary (aggregates only, no personal data) into URL params or a client-side hash

---

## Future Enhancements (Beyond Phase 7)

### Mobile Optimization
- [ ] **Mobile responsive layout**
  - Hamburger / bottom-nav for phones and tablets
  - Card-based holdings instead of tables on small screens
  - Bottom sheet modals on mobile
  - Touch-friendly tap targets, `inputmode="decimal"` on numeric inputs

### Additional Features
- [ ] **Gold tracking** — MCX INR/10g (Indian) + international USD/oz via Yahoo Finance. Add as an asset type in Other Assets with auto price fetch.
- [ ] **Crypto tracking** — integrate with CoinGecko or similar API for cryptocurrency prices
- [ ] **Multi-currency support** — support portfolios in multiple base currencies beyond INR
- [ ] **Portfolio comparison** — compare performance against benchmark indices (Nifty 50, Sensex, S&P 500)
- [ ] **Dividend tracking** — record dividend income and show yield calculations
- [ ] **Corporate actions** — handle stock splits, bonus issues, mergers automatically

### ⚠️ Watch Out

**Grandfathering FMV data**
Jan 31, 2018 closing prices may not be available via Yahoo Finance for all Indian stocks. Pre-fetch and cache Nifty 500 FMV prices where possible. For unlisted or missing stocks, let the user manually enter the FMV with a helper link to a historical price lookup tool.

**Tax calculation disclaimer**
Tax rules are jurisdiction-specific and change with each Union Budget. Always display: *"Tax calculations are based on rules as of FY 2024–25. This is not tax advice."* Do NOT position the tool as tax advice or a substitute for a CA.

**PDF generation must stay client-side**
Use `jsPDF` + `jsPDF-AutoTable` — 100% in-browser, no server call. The moment you introduce server-side PDF generation, portfolio data leaves the browser and the "no cloud" promise is broken.


**Sharing links**
Encode only portfolio summary (totals, allocation percentages, top gainers) — never raw data, names, or account details. Show a clear preview of what will be shared before generating the link. Keep links read-only with no way to import or modify from a shared link.

---

*All data always stays in your browser. No accounts, no cloud storage, no tracking.*
