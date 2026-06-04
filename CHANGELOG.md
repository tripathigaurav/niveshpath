# Changelog — Portfolio Tracker

## v3.0 — Phases 3–7 Feature Complete (2026-06-04)

### Phase 3 — Data Safety
- **Global transaction history screen** (`TransactionsModal`) — all transactions across every asset type, filterable by asset, type, date range, symbol search, paginated, CSV export

### Phase 5 — Live Data & Watchlist
- **Full Watchlist tab** — add stocks/funds with target prices, visual gap indicator, bell-toggle for per-item price alerts, in-app toast when price crosses target during refresh

### Phase 6 — SIP Tracker & Broker Import
- **SIP Tracker modal** (`SIPTrackerModal`) — add/delete/pause SIPs with frequency (weekly/monthly/quarterly/yearly), overdue & upcoming status badges, "Mark as paid" advances next date and logs a buy transaction
- **MFCentral/CAS CSV profile** added to broker profiles
- **Angel One CSV profile** added
- **Manual column mapper** — CSV wizard now offers a "Manual mapping…" broker option with per-field column-selector dropdowns; auto-guesses column names; falls through to preview

### Phase 7 — Tax Reports & Mobile Polish
- **FMV grandfathering (Section 112A)** — TaxReportModal shows collapsible FMV input section for pre-Jan-31-2018 symbols; cost of acquisition adjusted to `max(actual, min(FMV, salePrice))` when LTCG
- **STT calculation** — 0.1% on equity sell proceeds; shown per row and summed in "Total STT paid" summary card
- **Portfolio share URL** — "Share portfolio" in Profile → copies a base64-encoded URL to clipboard; recipient sees a read-only `SharedPortfolioModal` with holdings, P&L, and snapshot date
- `portfolioShare.js` utility (`generateShareUrl`, `readShareFromUrl`, `expandSnapshot`)

### Audit Trail
- `logAudit` wired to `updateStock` in `useIndianStocks`, `useUSStocks`
- `logAudit` wired to `updateFund` in `useMutualFunds`
- `logAudit` wired to `addAsset`, `removeAsset`, `updateAsset` in `useOtherAssets`
- `logAudit` wired to `addPolicy`, `removePolicy`, `updatePolicy` in `useInsurance`

### Profile Tools
- New buttons in Profile → Tools: **SIP tracker**, **Transaction history**, **Share portfolio**

---

## v2.5 — Security, Accessibility & Code Quality

### Security

- Backend input validation (regex on symbols, numeric scheme codes, search query length caps)
- CORS locked to localhost dev origins (was wide open)
- Flask-Limiter rate limiting (60/min default, 30/min batch prices)
- localStorage `save()` returns boolean, dispatches error event on quota exceeded
- Import validation: top-level schema + per-item required field checks
- API fetch timeout (20s AbortController)

### Accessibility

- Focus trap on all modals (`useFocusTrap` hook)
- ARIA: `role="dialog"`, `aria-modal`, `aria-sort` on sortable columns, `aria-expanded` on search, `role="listbox"` on dropdowns
- Skip navigation link
- Keyboard: Ctrl/Cmd+K for search, Enter/Space on table rows, arrow keys in dropdowns, Escape to close
- `prefers-reduced-motion`: market strip animation paused

### Responsive Design

- 5 CSS breakpoints (640px, 767px, 1024px, 1440px)
- Mobile: hamburger drawer, card layout for holdings, bottom sheet modals, touch-friendly targets (44px min)
- Tablet: condensed navbar, hidden non-essential columns
- Touch device detection via `@media (hover: none)`

### Code Quality

- Extracted shared components: SortTh, SortIcon, FilterBar, LiveBadge, HoldingCards
- Extracted shared hooks: useClickOutside, useFocusTrap, useSortable, useHashRoute
- Unified P&L math in `utils/pnl.js` (`pnlFromValues` base function)
- Zero code duplication across 4 table views
- Functional state updates throughout (no stale closures)
- Fixed: SortTh inside render (React reconciliation bug)
- Fixed: duplicate sort key "invested" for Buy Price column
- Fixed: `schemeCode.trim()` crash on number type
- Fixed: hardcoded confirm dialog ID (`useId()` now)
- Fixed: stale default date in AddOtherAssetModal
- Fixed: GlobalSearch ref anti-pattern (forwardRef + useImperativeHandle)
- Fixed: `logSell` side effect inside state updater (StrictMode double-fire)

### UI Polish

- Hash-based routing with browser back/forward support
- Dynamic page titles per tab
- Tab transition animations
- ThemeToggle moved to navbar
- WelcomeModal skip button (defaults to "Investor")
- Consistent edit/delete button labels (removed emoji mismatch)
- `.env` support for API base URL

## v2.0 — US Stocks, Mutual Funds, Other Assets

- US stock tracking with USD/INR conversion
- Mutual fund tracking with AMFI NAV integration
- Other assets (FD, PPF, EPF, NPS, Real Estate, Gold, etc.)
- Global search across stocks + mutual funds
- Market overview strip (Nifty, Sensex, S&P, Gold, Crude, etc.)
- Dark/light theme with full CSS variable system
- Profile modal with avatar and settings
- Welcome modal for first-time users
- Toast notification system
- Error boundaries
- Skeleton loading states
- Export/import portfolio as JSON

## v1.0 — Foundation

- Indian stock tracking with Yahoo Finance prices
- Add/edit/delete holdings
- Live price refresh with batch API
- P&L calculation per holding + totals
- Day change tracking
- Flask backend as stateless price proxy
- localStorage for all data persistence
