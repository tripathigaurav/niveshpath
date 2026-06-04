# निवेश Path (Nivesh Path)

A modern portfolio tracker for Indian and international investments. All holdings live in your browser; the backend only fetches public market prices.

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5199` by default (`strictPort: false` picks the next free port if busy). `./deploy-local.sh` prints the actual URL.

### All-in-one (repo root)

```bash
./deploy-local.sh
# Optional: ./deploy-local.sh --frontend-port 5200 --backend-port 5001
# See ./deploy-local.sh --help
```

Ports used are saved to `.local-dev-ports` and printed in the terminal.

### Tests

```bash
cd frontend
npm test          # run once
npm run test:watch
```

### Deploying the frontend only (GitHub Pages, etc.)

The UI is static; **prices and market data need the API**. Copy `frontend/.env.example` to `frontend/.env` and set:

```bash
VITE_API_BASE=https://your-flask-host.example.com/api
```

Then `npm run build` and deploy `frontend/dist`.

---

## Features

### Portfolio Tracking

- Indian stocks (NSE/BSE) with live prices via Yahoo Finance
- US stocks with USD/INR conversion
- Mutual funds with NAV from AMFI
- Other assets (FD, PPF, EPF, NPS, Real Estate, Gold, Bonds, Crypto)
- P&L calculation: absolute + percentage, per-holding + totals
- Day change tracking with live badge

### Dashboard

- Total portfolio value across all asset types
- Allocation breakdown
- Today's gain/loss
- Top gainers/losers

### Data Management

- Export portfolio as JSON (one-click backup)
- Import portfolio from JSON (restore/migrate)
- All data stored in browser localStorage — nothing uploaded

### Search & Navigation

- Global search across stocks + mutual funds (⌘K / Ctrl+K)
- Hash-based routing (deep links, browser back/forward)
- Column sorting with persistence per table
- Inline table filtering

### UI/UX

- Dark/light theme with system-quality polish
- Mobile responsive (hamburger menu, card layout, bottom sheets)
- Skeleton loading states
- Toast notifications
- Accessibility: focus traps, ARIA, keyboard navigation, skip-nav, reduced-motion support

### Backend

- Flask proxy for Yahoo Finance + AMFI (no API keys needed)
- Input validation (regex on symbols, length caps on search)
- Rate limiting (Flask-Limiter)
- CORS locked to frontend origin
- Thread-safe caching (30s market data, 24h MF NAV)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, Vanilla CSS |
| Backend | Flask 3.1, yfinance, Flask-Limiter |
| Storage | Browser localStorage (no database) |
| Testing | Vitest, @testing-library/react |

---

## Data Privacy

All portfolio data is stored in browser localStorage only. The backend is a local price-fetching proxy — it never stores or transmits your portfolio data.

**Important:** Export your portfolio regularly — localStorage data does not survive browser resets or clearing site data.

---

## Phase Progress

- [x] Phase 1 — Foundation (Indian Stocks + Backend)
- [x] Phase 2 — US Stocks, Mutual Funds, Other Assets, Dashboard
- [x] Phase 2.5 — Security hardening, responsive design, accessibility, code quality
- [x] Phase 3 — Data Safety (backup reminders, transaction log, global transaction history screen)
- [x] Phase 4 — Analytics (XIRR, portfolio history chart, top gainers/losers, allocation donut)
- [x] Phase 5 — Live Data (auto-refresh, watchlist with price alerts)
- [x] Phase 6 — SIP Tracker & Broker Import (Zerodha, Groww, Upstox, Angel One, MFCentral/CAS, manual mapping)
- [x] Phase 7 — Tax Reports & Mobile Polish (STCG/LTCG, FMV grandfathering, STT, portfolio share URL)

See [FUTURE_PLANS.md](FUTURE_PLANS.md) for detailed roadmap.

---

## Project Structure

```
Portfolio tracker/
├── backend/
│   ├── app.py              Flask server (price proxy + market data)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     React components
│   │   │   ├── IndianStocks.jsx, USStocks.jsx, MutualFunds.jsx
│   │   │   ├── OtherAssets.jsx, Dashboard.jsx
│   │   │   ├── AddStockModal.jsx, AddMFModal.jsx, AddOtherAssetModal.jsx
│   │   │   ├── Navbar.jsx, GlobalSearch.jsx, MarketStrip.jsx
│   │   │   ├── ProfileModal.jsx, WelcomeModal.jsx, ConfirmDialog.jsx
│   │   │   ├── HoldingCards.jsx (mobile card view)
│   │   │   ├── SortTh.jsx, SortIcon.jsx, FilterBar.jsx, LiveBadge.jsx
│   │   │   ├── PnlBadge.jsx, SkeletonRows.jsx, ProgressBar.jsx
│   │   │   ├── ErrorBoundary.jsx, Toast.jsx, ThemeToggle.jsx
│   │   │   └── (shared components used across all pages)
│   │   ├── hooks/
│   │   │   ├── usePortfolio.js   (Indian, US, MF, Other assets)
│   │   │   ├── useSortable.js    (table sorting with persistence)
│   │   │   ├── useFocusTrap.js   (modal accessibility)
│   │   │   ├── useHashRoute.js   (URL routing)
│   │   │   ├── useClickOutside.js
│   │   │   └── useDebounce.js
│   │   ├── utils/
│   │   │   ├── storage.js  (localStorage with export/import/validation)
│   │   │   ├── api.js      (fetch wrapper with timeout)
│   │   │   ├── pnl.js      (P&L calculations for all asset types)
│   │   │   ├── formatters.js (INR/USD/percentage formatting)
│   │   │   └── initials.js
│   │   ├── config/tabs.js
│   │   ├── App.jsx, App.css, main.jsx
│   │   └── test/           Vitest test files
│   ├── package.json
│   ├── vitest.config.js
│   └── vite.config.js
├── CHANGELOG.md
├── FUTURE_PLANS.md
└── README.md
```

---

## License

Personal project — all rights reserved.
