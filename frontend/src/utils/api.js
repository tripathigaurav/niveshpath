const BASE = import.meta.env.VITE_API_BASE || '/api'

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
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
