# निवेश Path (Nivesh Path)

A modern portfolio tracker for Indian and international investments. Holdings and transactions stay in your browser; the backend only fetches public market prices and NAVs.

**Live app:** [tripathigaurav.github.io/niveshpath](https://tripathigaurav.github.io/niveshpath)

> **Maintainers:** Update this README when you add or change user-facing features, setup steps, or deployment. Other `*.md` notes stay local (gitignored).

---

## Quick start

### Prerequisites

- Python 3.8+
- Node.js 16+

### All-in-one (recommended)

```bash
./deploy-local.sh
# Optional: ./deploy-local.sh --frontend-port 5200 --backend-port 5001
```

Ports are auto-picked if busy and saved to `.local-dev-ports`.

### Backend only

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Runs on `http://localhost:5000`.

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

Default dev URL: `http://localhost:5199` (Vite uses the next free port if busy).

### Tests

```bash
cd frontend
npm test
npm run test:watch
```

### Production frontend build

```bash
cd frontend
cp .env.example .env   # set VITE_API_BASE for static hosting
npm run build          # output: frontend/dist
```

GitHub Pages deploys automatically on push to `main` (see `.github/workflows/deploy.yml`). The static UI degrades gracefully without the Flask API — market strip and upcoming events are hidden, and portfolio P&L uses only assets with a known current value.

To wire a hosted Flask API to the deployed frontend, set `VITE_API_BASE` as a GitHub Actions secret (e.g. `https://your-api.railway.app/api`). The build will embed it automatically.

**Hosting options for the Flask backend:**

| Platform | Free | Always-on | Docker needed |
|----------|------|-----------|---------------|
| Railway | $5 credit/mo | ✅ | No |
| Koyeb | 1 free instance | ✅ | No |
| Render | 750 hrs/mo | ❌ (sleeps) | No |
| Fly.io | 3 shared VMs | ✅ | Auto-detected |

---

## Features

### Asset classes

| Class | Data source | Highlights |
|-------|-------------|------------|
| **Indian stocks** | Yahoo Finance (`.NS` / `.BO`) | NSE/BSE exchange toggle, ETFs, day P&L |
| **US stocks** | Yahoo Finance | USD/INR, ESPP/RSU sections |
| **Mutual funds** | AMFI NAV | Scheme search, NAV refresh |
| **Other assets** | Manual | 9 types (FD, PPF, EPF, NPS, real estate, gold, bonds/SGB, crypto, other); FD/PPF/EPF formula-based P&L, null current-value guard |
| **Insurance** | Manual | 8 policy types, renewal tracking, per-type extra fields |
| **Watchlist** | Live quotes | Price alerts |

### Holdings views (Indian / US / MF)

Each holdings page has four sub-tabs:

| Tab | What it shows |
|-----|----------------|
| **Basic** | Current / past / all holdings, LTP, P&L, XIRR |
| **IRR** | Windowed XIRR (90d, 365d, since Apr, total holding period) |
| **Market data** | OHLC, 52-week range (stocks); NAV history (MF) |
| **P&L trend** | Invested vs value chart from transaction ledger |

Indian stocks: **NSE | BSE** toggle on Basic, IRR, and Market Data (MF uses AMFI only).

### Dashboard

- Category cards with allocation donut
- **Portfolio value chart** — Groww/Zerodha-style area chart with range (1D–ALL), ₹/% toggle, breakdown modal
- Summary bar: invested, current value, today's P&L, notional gain, portfolio XIRR
- Insurance card lists every policy with renewal date (colour-coded urgency), cover + premium footer
- Upcoming events (dividends, earnings) — gracefully hidden on static host
- Tax estimate (current FY), market strip (hidden on static host)

**Portfolio chart behaviour**

- Headline value and today % use **live/latest prices**
- Chart color follows **selected range** performance (green/red)
- History: daily snapshots when you open Dashboard + ledger estimate for earlier dates
- 1D uses previous close → current when intraday snapshots are unavailable

### Analytics & tax

- Per-holding and portfolio **XIRR** (windowed IRR uses historical LTP/NAV at window start)
- STCG/LTCG tax report, FMV grandfathering (Jan 2018), STT summary
- Tax-loss harvesting hints

### Data & import

- Browser **localStorage** + IndexedDB (price cache, daily portfolio snapshots)
- JSON export/import backup
- Broker CSV import (Zerodha, Groww, Upstox, Angel One, MFCentral/CAS)
- Transaction log with global history screen
- SIP tracker, reconciliation

### UI

- Dark / light theme
- Mobile responsive (cards, drawer nav)
- Global search (⌘K / Ctrl+K)
- Hash routing, sortable tables, toast notifications
- Accessibility: focus traps, `aria-pressed` chart controls, keyboard navigation

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 6, Recharts, Vanilla CSS |
| Backend | Flask 3.1, yfinance, Flask-Limiter |
| Storage | localStorage, IndexedDB (`idb`) |
| Deploy | GitHub Actions → GitHub Pages (static); Railway/Koyeb/Render for Flask API |
| Tests | Vitest, Testing Library |

---

## API (backend)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/stock/price` | Single quote |
| `POST /api/stock/prices` | Batch quotes (open, high, low, 52w) |
| `GET /api/stock/history-price` | Historical close for a date |
| `GET /api/stock/search` | Symbol search |
| `GET /api/mf/nav` | Current NAV |
| `GET /api/mf/historical-nav` | NAV on a date |

Symbols are exchange-specific (e.g. `RELIANCE.NS`, `RELIANCE.BO`). No API keys required.

---

## Project structure

```
Portfolio tracker/
├── backend/
│   ├── app.py              Flask price/NAV proxy
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     Pages, modals, charts, holdings sub-tabs
│   │   ├── hooks/          Portfolio data, XIRR, exchange quotes
│   │   ├── utils/          P&L, XIRR, storage, API, ledger history
│   │   └── config/tabs.js
│   ├── package.json
│   └── vite.config.js
├── .github/workflows/      CI deploy to GitHub Pages
├── deploy-local.sh         Local dev launcher
└── README.md               This file (tracked in git)
```

---

## Data privacy

Portfolio data never leaves your browser except when you export it. The backend only receives ticker symbols and scheme codes for price lookups.

Export backups regularly — clearing site data removes localStorage.

---

## Phase progress

- [x] Foundation — Indian stocks, Flask backend
- [x] Multi-asset — US, MF, other assets, dashboard
- [x] Security, responsive UI, accessibility
- [x] Backup, transactions, broker import
- [x] XIRR, portfolio chart, allocation, performers
- [x] Auto-refresh, watchlist, insurance
- [x] Tax reports, mobile polish, share URL
- [x] Holdings sub-tabs, windowed XIRR, NSE/BSE toggle, market data tab
- [x] Other assets: 9 types, type-aware P&L formulas, null current-value guard
- [x] Insurance: 8 types, per-type extra fields, Dashboard policy list with renewal urgency
- [x] GitHub Pages deploy with static-host graceful degradation (no market banner, no events error)
- [x] Dashboard notional P&L fix (pricedInvested denominator, no phantom loss offline)

---

## License

Personal project — all rights reserved.
