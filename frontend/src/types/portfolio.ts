export interface StockHolding {
  id: string
  symbol: string
  name: string
  qty: number
  buyPrice: number
  buyDate?: string
  currentPrice: number | null
  previousClose?: number | null
  dayChange: number | null
  dayChangePct: number | null
}

export interface MutualFundHolding {
  id: string
  schemeCode: string
  schemeName: string
  units: number
  buyNAV: number
  buyDate?: string
  currentNAV: number | null
  previousNAV?: number | null
  navDate: string | null
}

export interface OtherAssetHolding {
  id: string
  name: string
  type: string
  investedAmount: number
  currentValue: number | null
  notes: string
  addedDate: string
  // Type-specific optional fields (FD / Bonds / PPF / EPF)
  interestRate?: number | null   // FD rate, PPF/EPF rate, bond coupon rate
  maturityDate?: string | null   // FD / bond maturity
  couponRate?: number | null     // alternate field name used by some entries
}

export interface AppSettings {
  userName: string
  theme: 'light' | 'dark'
  showUsdInInr: boolean
  autoRefreshInterval: number
  avatarColor: string
  hasSeenWelcome: boolean
  lastExportAt?: string | null
  lastUsdInr?: number | null
}

export interface PortfolioExport {
  indianStocks: StockHolding[]
  usStocks: StockHolding[]
  mutualFunds: MutualFundHolding[]
  sips: unknown[]
  otherAssets: OtherAssetHolding[]
  insurance: unknown[]
  watchlist: unknown[]
  transactions: unknown[]
  settings: AppSettings
  exportedAt: string
}

export interface PnlResult {
  invested: number
  current: number | null
  pnl: number | null
  pnlPct: number | null
}

export interface UsPnlResult {
  investedUSD: number
  currentUSD: number | null
  pnlUSD: number | null
  pnlPct: number | null
}

export interface TotalsResult {
  totalInvested: number
  totalCurrent: number | null
  totalPnl: number | null
  totalPnlPct: number | null
}

export interface ImportResult {
  imported: number
  skipped: number
}

export interface StockPriceData {
  symbol: string
  price: number | null
  previousClose: number | null
  dayChange: number | null
  dayChangePct: number | null
  error: string | null
}

export interface StockSearchResult {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

export interface MfNavResult {
  schemeCode: string
  schemeName: string
  nav: number | null
  date: string | null
}

export interface MfSearchResult {
  schemeCode: string
  schemeName: string
}

export interface MarketItem {
  price: number | null
  change: number | null
  changePct: number | null
  label?: string
}
