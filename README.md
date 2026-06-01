# निवेश Path (Nivesh Path)

A modern, bilingual portfolio tracker for Indian and international investments.

## Features

✅ **Phase 1 & 2 Complete:**
- 🇮🇳 Indian Stocks tracking with live NSE/BSE prices
- 🇺🇸 US Stocks tracking with live prices
- 📊 Mutual Funds with NAV updates via AMFI
- 💰 Other Assets (Gold, Real Estate, FDs, etc.)
- 🔍 Global search across all holdings
- 📈 Live market ticker strip
- 🌓 Dark/Light theme with Groww-inspired design
- 📱 Fully responsive with mobile hamburger menu
- ♿ WCAG accessibility compliant
- 🔒 Security hardened (input validation, rate limiting, CORS)

## Tech Stack

**Frontend:**
- React 18 with Vite
- CSS3 with custom properties
- Modern responsive design

**Backend:**
- Flask (Python)
- yfinance for stock data
- AMFI API proxy for mutual fund NAV
- Flask-Limiter for rate limiting
- CORS protection

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+

### Installation

1. **Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`

2. **Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Project Structure

```
├── backend/
│   ├── app.py              # Flask server with API endpoints
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/          # Utility functions
│   │   ├── hooks/          # Custom React hooks
│   │   ├── config/         # Configuration files
│   │   ├── App.jsx         # Main app component
│   │   └── App.css         # Global styles
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Features in Detail

### Holdings Management
- Add, edit, delete holdings across all asset types
- Automatic price/NAV updates
- Real-time P&L calculations
- Sortable tables with filters
- Bulk import/export via JSON

### UI/UX
- Sticky navbar with breadcrumb navigation
- Animated market ticker strip
- Skeleton loaders for smooth loading states
- Toast notifications for user feedback
- Modal dialogs with focus trapping
- Keyboard shortcuts (Cmd/Ctrl + K for search)

### Accessibility
- ARIA labels and roles throughout
- Keyboard navigation support
- Screen reader friendly
- Focus management in modals
- Skip navigation link

### Security
- Input validation on all endpoints
- Rate limiting (60 req/min)
- CORS restricted to localhost
- No sensitive data in localStorage
- Safe JSON parsing with error handling

## Roadmap

- **Phase 3:** Dashboard with charts and analytics
- **Phase 4:** Transaction history and dividends
- **Phase 5:** Watchlist functionality
- **Phase 6:** Broker import (Zerodha, Groww, Upstox)
- **Phase 7:** Goals and portfolio recommendations

## License

Personal project - All rights reserved

## Author

Built with ❤️ for better investment tracking
