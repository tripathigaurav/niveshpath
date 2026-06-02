export const MAIN_TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: null, // SVG rendered inline in Navbar
  },
  { id: 'indianStocks', label: 'Indian Stocks', icon: '🇮🇳' },
  { id: 'usStocks',     label: 'US Stocks',     icon: '🇺🇸' },
  { id: 'mutualFunds',  label: 'Mutual Funds',  icon: '📋' },
]

export const MORE_TABS = [
  { id: 'insights',    label: 'Insights',     icon: '💡' },
  { id: 'otherAssets', label: 'Other Assets', icon: '🏦' },
  { id: 'insurance',   label: 'Insurance',    icon: '🛡️' },
  { id: 'watchlist',   label: 'Watchlist',    icon: '⭐' },
]

export const ALL_TAB_IDS = [...MAIN_TABS, ...MORE_TABS].map((t) => t.id)

export const DEFAULT_TAB = 'indianStocks'
