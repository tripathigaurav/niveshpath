import type {
  StockPriceData,
  StockSearchResult,
  MfNavResult,
  MfSearchResult,
  MarketItem,
} from '../types/portfolio'

const BASE: string = import.meta.env['VITE_API_BASE'] ?? '/api'

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      const message = err.error ?? `HTTP ${res.status}`
      const e = Object.assign(new Error(message), { status: res.status })
      throw e
    }
    return res.json() as Promise<T>
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out — please try again')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  // ── Stocks ────────────────────────────────────────────────────────────────
  getStockPrice: (symbol: string): Promise<StockPriceData> =>
    fetchJSON<StockPriceData>(`${BASE}/stock/price?symbol=${encodeURIComponent(symbol)}`),

  getBatchPrices: (symbols: string[]): Promise<Record<string, StockPriceData>> =>
    fetchJSON<Record<string, StockPriceData>>(`${BASE}/stock/prices`, {
      method: 'POST',
      body: JSON.stringify({ symbols }),
    }),

  searchStocks: (q: string): Promise<StockSearchResult[]> =>
    fetchJSON<StockSearchResult[]>(`${BASE}/stock/search?q=${encodeURIComponent(q)}`),

  getStockActions: (symbol: string): Promise<unknown> =>
    fetchJSON<unknown>(`${BASE}/stock/actions?symbol=${encodeURIComponent(symbol)}`),

  getUpcomingEvents: (holdings: unknown, days = 30): Promise<unknown> =>
    fetchJSON<unknown>(`${BASE}/portfolio/upcoming-events`, {
      method: 'POST',
      body: JSON.stringify({ holdings, days }),
    }),

  // ── Market overview ───────────────────────────────────────────────────────
  getMarketOverview: (): Promise<Record<string, MarketItem>> =>
    fetchJSON<Record<string, MarketItem>>(`${BASE}/market/overview`),

  // ── FX ────────────────────────────────────────────────────────────────────
  getUsdInr: (): Promise<{ rate: number | null; dayChange: number | null; dayChangePct: number | null }> =>
    fetchJSON<{ rate: number | null; dayChange: number | null; dayChangePct: number | null }>(`${BASE}/fx/usd-inr`),

  // ── Mutual Funds ──────────────────────────────────────────────────────────
  getMfNav: (schemeCode: string): Promise<MfNavResult> =>
    fetchJSON<MfNavResult>(`${BASE}/mf/nav?scheme_code=${encodeURIComponent(schemeCode)}`),

  searchMf: (q: string): Promise<MfSearchResult[]> =>
    fetchJSON<MfSearchResult[]>(`${BASE}/mf/search?q=${encodeURIComponent(q)}`),

  getHistoricalNav: (schemeCode: string, date: string): Promise<MfNavResult> =>
    fetchJSON<MfNavResult>(
      `${BASE}/mf/historical-nav?scheme_code=${encodeURIComponent(schemeCode)}&date=${date}`,
    ),
}
