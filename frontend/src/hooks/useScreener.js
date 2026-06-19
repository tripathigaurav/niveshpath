import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api'
import { storage } from '../utils/storage'
import { calcIndianStockMetrics, calcUsPnl } from '../utils/pnl'

/**
 * Fetches fundamentals for all stock holdings and merges with portfolio data.
 * Returns { data, loading, error, refresh, filters, setFilters }
 */
export function useScreener() {
  const [fundamentals, setFundamentals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState({
    peMin: '',
    peMax: '',
    divYieldMin: '',
    marketCap: '',
    sector: '',
    exchange: 'all',
  })

  useEffect(() => {
    const indStocks = storage.getIndianStocks()
    const usStocks = storage.getUSStocks()
    const allSymbols = [
      ...indStocks.map((s) => ({ ...s, _assetType: 'indianStock' })),
      ...usStocks.map((s) => ({ ...s, _assetType: 'usStock' })),
    ]
    if (!allSymbols.length) {
      setFundamentals([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const symbols = allSymbols.map((s) => {
      if (s._assetType === 'indianStock') {
        return s.symbol.includes('.') ? s.symbol : `${s.symbol}.NS`
      }
      return s.symbol
    })

    api.getBatchFundamentals(symbols)
      .then((res) => {
        if (cancelled) return
        const results = res.results || []
        const merged = allSymbols.map((stock, i) => {
          const fund = results[i] || {}
          const pnl =
            stock._assetType === 'indianStock'
              ? calcIndianStockMetrics(stock)
              : calcUsPnl(stock)
          return {
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            assetType: stock._assetType,
            ltp: pnl.ltp ?? pnl.currentUSD ?? stock.currentPrice ?? null,
            pnlPct: pnl.pnlPct ?? null,
            pe: fund.pe ?? null,
            forwardPe: fund.forwardPe ?? null,
            eps: fund.eps ?? null,
            dividendYield: fund.dividendYield != null ? fund.dividendYield * 100 : null,
            marketCap: fund.marketCap ?? null,
            sector: fund.sector ?? null,
            industry: fund.industry ?? null,
            beta: fund.beta ?? null,
            yearHigh: fund.yearHigh ?? null,
            yearLow: fund.yearLow ?? null,
            pb: fund.pb ?? null,
          }
        })
        setFundamentals(merged)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load fundamentals')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const sectors = useMemo(
    () => [...new Set(fundamentals.map((d) => d.sector).filter(Boolean))].sort(),
    [fundamentals]
  )

  const filtered = useMemo(() => {
    return fundamentals.filter((d) => {
      if (filters.exchange === 'indian' && d.assetType !== 'indianStock') return false
      if (filters.exchange === 'us' && d.assetType !== 'usStock') return false
      if (filters.peMin && (d.pe == null || d.pe < Number(filters.peMin))) return false
      if (filters.peMax && (d.pe == null || d.pe > Number(filters.peMax))) return false
      if (filters.divYieldMin && (d.dividendYield == null || d.dividendYield < Number(filters.divYieldMin)))
        return false
      if (filters.sector && d.sector !== filters.sector) return false
      if (filters.marketCap === 'large' && (d.marketCap == null || d.marketCap < 200_000_000_000)) return false
      if (filters.marketCap === 'mid' && (d.marketCap == null || d.marketCap < 50_000_000_000 || d.marketCap >= 200_000_000_000)) return false
      if (filters.marketCap === 'small' && (d.marketCap == null || d.marketCap >= 50_000_000_000)) return false
      return true
    })
  }, [fundamentals, filters])

  return { data: filtered, allData: fundamentals, loading, error, refresh, filters, setFilters, sectors }
}
