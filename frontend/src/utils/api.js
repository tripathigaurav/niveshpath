const BASE = import.meta.env.VITE_API_BASE || '/api'

async function fetchJSON(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      const message = err.error || `HTTP ${res.status}`
      const e = new Error(message)
      e.status = res.status
      throw e
    }
    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out — please try again')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  // ── Stocks ────────────────────────────────────────────────────────────────
  getStockPrice: (symbol) =>
    fetchJSON(`${BASE}/stock/price?symbol=${encodeURIComponent(symbol)}`),

  getBatchPrices: (symbols) =>
    fetchJSON(`${BASE}/stock/prices`, {
      method: 'POST',
      body: JSON.stringify({ symbols }),
    }),

  searchStocks: (q) =>
    fetchJSON(`${BASE}/stock/search?q=${encodeURIComponent(q)}`),

  getStockActions: (symbol) =>
    fetchJSON(`${BASE}/stock/actions?symbol=${encodeURIComponent(symbol)}`),

  getStockHistoryPrice: (symbol, date) =>
    fetchJSON(
      `${BASE}/stock/history-price?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`
    ),

  getUpcomingEvents: (holdings, days = 30) =>
    fetchJSON(`${BASE}/portfolio/upcoming-events`, {
      method: 'POST',
      body: JSON.stringify({ holdings, days }),
    }),

  // ── Market overview ───────────────────────────────────────────────────────
  getMarketOverview: () => fetchJSON(`${BASE}/market/overview`),

  // ── FX ────────────────────────────────────────────────────────────────────
  getUsdInr: () => fetchJSON(`${BASE}/fx/usd-inr`),

  // ── Mutual Funds ──────────────────────────────────────────────────────────
  getMfNav: (schemeCode) =>
    fetchJSON(`${BASE}/mf/nav?scheme_code=${encodeURIComponent(schemeCode)}`),

  searchMf: (q) =>
    fetchJSON(`${BASE}/mf/search?q=${encodeURIComponent(q)}`),

  getHistoricalNav: (schemeCode, date) =>
    fetchJSON(
      `${BASE}/mf/historical-nav?scheme_code=${encodeURIComponent(schemeCode)}&date=${date}`
    ),
}
