/**
 * Fictional sample holdings for demos. Not real portfolio data.
 * Symbols use Yahoo Finance format (.NS) for live price refresh.
 */

import { US_CATEGORY } from '../utils/usHoldings'

/** ISO date string N days before today (demo buys within the last year). */
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const TX = (id, type, assetType, symbol, name, qty, price, date, holdingId) => ({
  id,
  type,
  assetType,
  symbol: String(symbol),
  name,
  qty,
  price,
  date,
  holdingId,
  recordedAt: '2024-01-01T00:00:00.000Z',
})

export function getSamplePortfolio() {
  const indianStocks = [
    {
      id: 'sample-in-1',
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries Ltd',
      qty: 10,
      buyPrice: 2450,
      buyDate: daysAgo(320),
      isEtf: false,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
    {
      id: 'sample-in-2',
      symbol: 'TCS.NS',
      name: 'Tata Consultancy Services Ltd',
      qty: 5,
      buyPrice: 3800,
      buyDate: daysAgo(180),
      isEtf: false,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
    {
      id: 'sample-in-3',
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank Ltd',
      qty: 20,
      buyPrice: 1650,
      buyDate: daysAgo(350),
      isEtf: false,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
    {
      id: 'sample-in-4',
      symbol: 'NIFTYBEES.NS',
      name: 'Nippon India ETF Nifty 50 BeES',
      qty: 50,
      buyPrice: 245,
      buyDate: daysAgo(260),
      isEtf: true,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
    {
      id: 'sample-in-5',
      symbol: 'GOLDBEES.NS',
      name: 'Nippon India ETF Gold BeES',
      qty: 40,
      buyPrice: 54,
      buyDate: daysAgo(140),
      isEtf: true,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
  ]

  const usStocks = [
    {
      id: 'sample-us-1',
      symbol: 'AAPL',
      name: 'Apple Inc',
      qty: 15,
      buyPrice: 175,
      buyDate: daysAgo(290),
      category: US_CATEGORY.STOCK,
      isEtf: false,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
    {
      id: 'sample-us-2',
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      qty: 8,
      buyPrice: 380,
      buyDate: daysAgo(120),
      category: US_CATEGORY.STOCK,
      isEtf: false,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
    {
      id: 'sample-us-etf',
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust ETF',
      qty: 12,
      buyPrice: 420,
      buyDate: daysAgo(240),
      category: US_CATEGORY.STOCK,
      isEtf: true,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
    {
      id: 'sample-us-espp',
      symbol: 'AAPL',
      name: 'Apple Inc (ESPP)',
      qty: 25,
      buyPrice: 142,
      buyDate: daysAgo(90),
      category: US_CATEGORY.ESPP,
      isEtf: false,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
    {
      id: 'sample-us-rsu',
      symbol: 'MSFT',
      name: 'Microsoft Corporation (RSU)',
      qty: 30,
      buyPrice: 0,
      buyDate: daysAgo(45),
      category: US_CATEGORY.RSU,
      isEtf: false,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    },
  ]

  const mutualFunds = [
    {
      id: 'sample-mf-1',
      schemeCode: '122639',
      schemeName: 'Parag Parikh ELSS Tax Saver Fund Direct Growth',
      units: 120.5,
      buyNAV: 68.25,
      buyDate: daysAgo(340),
      currentNAV: null,
      navDate: null,
    },
    {
      id: 'sample-mf-2',
      schemeCode: '120716',
      schemeName: 'SBI Blue Chip Fund Direct Plan Growth',
      units: 85.2,
      buyNAV: 82.1,
      buyDate: daysAgo(300),
      currentNAV: null,
      navDate: null,
    },
  ]

  const transactions = [
    TX('sample-tx-1', 'buy', 'indianStock', 'RELIANCE.NS', 'Reliance Industries Ltd', 10, 2450, daysAgo(320), 'sample-in-1'),
    TX('sample-tx-2', 'buy', 'indianStock', 'TCS.NS', 'Tata Consultancy Services Ltd', 5, 3800, daysAgo(180), 'sample-in-2'),
    TX('sample-tx-3', 'buy', 'indianStock', 'HDFCBANK.NS', 'HDFC Bank Ltd', 20, 1650, daysAgo(350), 'sample-in-3'),
    TX('sample-tx-4', 'buy', 'indianStock', 'NIFTYBEES.NS', 'Nippon India ETF Nifty 50 BeES', 50, 245, daysAgo(260), 'sample-in-4'),
    TX('sample-tx-4b', 'buy', 'indianStock', 'GOLDBEES.NS', 'Nippon India ETF Gold BeES', 40, 54, daysAgo(140), 'sample-in-5'),
    TX('sample-tx-5', 'buy', 'usStock', 'AAPL', 'Apple Inc', 15, 175, daysAgo(290), 'sample-us-1'),
    TX('sample-tx-6', 'buy', 'usStock', 'MSFT', 'Microsoft Corporation', 8, 380, daysAgo(120), 'sample-us-2'),
    TX('sample-tx-7', 'buy', 'usStock', 'QQQ', 'Invesco QQQ Trust ETF', 12, 420, daysAgo(240), 'sample-us-etf'),
    TX('sample-tx-8', 'buy', 'usStock', 'AAPL', 'Apple Inc (ESPP)', 25, 142, daysAgo(90), 'sample-us-espp'),
    TX('sample-tx-9', 'buy', 'usStock', 'MSFT', 'Microsoft Corporation (RSU)', 30, 0, daysAgo(45), 'sample-us-rsu'),
    TX('sample-tx-10', 'buy', 'mutualFund', '122639', 'Parag Parikh ELSS Tax Saver Fund Direct Growth', 120.5, 68.25, daysAgo(340), 'sample-mf-1'),
    TX('sample-tx-11', 'buy', 'mutualFund', '120716', 'SBI Blue Chip Fund Direct Plan Growth', 85.2, 82.1, daysAgo(300), 'sample-mf-2'),
  ]

  return {
    version: 1,
    app: 'niveshpath',
    indianStocks,
    usStocks,
    mutualFunds,
    sips: [],
    otherAssets: [
      {
        id: 'sample-oa-1',
        name: 'Fixed Deposit — Demo Bank',
        type: 'FD',
        investedAmount: 500000,
        currentValue: 525000,
        notes: 'Sample FD for demo only',
        addedDate: daysAgo(400),
      },
    ],
    insurance: [
      {
        id: 'sample-ins-health',
        name: 'HDFC ERGO Optima Secure — Family Floater',
        type: 'health',
        premium: 18500,
        coverAmount: 1000000,
        startDate: daysAgo(200),
        renewalDate: daysAgo(-200),
        notes: 'Family floater, Policy #HE2024XXXX',
      },
      {
        id: 'sample-ins-term',
        name: 'LIC Tech Term — Pure Protection',
        type: 'term',
        premium: 12800,
        coverAmount: 10000000,
        startDate: daysAgo(450),
        renewalDate: daysAgo(-280),
        notes: '₹1 Cr cover, 30-year term, Policy #LT2024YYYY',
      },
    ],
    watchlist: [],
    transactions,
    settings: {
      userName: 'Sample Investor',
      theme: 'light',
      showUsdInInr: false,
      autoRefreshInterval: 30,
      avatarColor: '#2563eb',
      hasSeenWelcome: true,
      lastExportAt: null,
    },
    exportedAt: new Date().toISOString(),
  }
}
