import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'
import { US_CATEGORY, isUsEtf, normalizeUsHolding } from '../utils/usHoldings'
import { api } from '../utils/api'
import { logBuy, logSell } from '../utils/transactions'
import { fetchBatchPricesWithFallback } from '../utils/priceProvider'
import { notifyDataChanged, PT_DATA_CHANGED } from './useNotifications'

export function useUSStocks() {
  const [stocks, setStocks] = useState(() => storage.getUSStocks().map(normalizeUsHolding))
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [pricesStale, setPricesStale] = useState(false)
  const [usdInr, setUsdInr] = useState(() => storage.getSettings().lastUsdInr ?? null)
  const stocksRef = useRef(stocks)
  useEffect(() => { stocksRef.current = stocks }, [stocks])

  useEffect(() => {
    const sync = () => {
      setStocks(storage.getUSStocks().map(normalizeUsHolding))
      const rate = storage.getSettings().lastUsdInr
      if (rate) setUsdInr(rate)
    }
    window.addEventListener(PT_DATA_CHANGED, sync)
    return () => window.removeEventListener(PT_DATA_CHANGED, sync)
  }, [])

  const addStock = useCallback((data) => {
    const category = data.category || US_CATEGORY.STOCK
    const symbol = data.symbol.toUpperCase()
    const name = data.name
    const isEtf =
      category === US_CATEGORY.STOCK
        ? Boolean(data.isEtf ?? isUsEtf(symbol, name))
        : false
    const entry = normalizeUsHolding({
      id: uuidv4(),
      symbol,
      name,
      qty: parseFloat(data.qty),
      buyPrice: parseFloat(data.buyPrice),
      buyDate: data.buyDate,
      category,
      isEtf,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    })
    setStocks((prev) => {
      const updated = [...prev, entry]
      storage.setUSStocks(updated)
      return updated
    })
    logBuy({
      assetType: 'usStock',
      symbol: entry.symbol,
      name: entry.name,
      qty: entry.qty,
      price: entry.buyPrice,
      date: entry.buyDate,
      holdingId: entry.id,
    })
  }, [])

  const removeStock = useCallback((id) => {
    const removed = stocksRef.current.find((s) => s.id === id)
    setStocks((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      storage.setUSStocks(updated)
      return updated
    })
    if (removed) {
      logSell({
        assetType: 'usStock',
        symbol: removed.symbol,
        name: removed.name,
        qty: removed.qty,
        price: removed.buyPrice,
        date: removed.buyDate,
        holdingId: removed.id,
      })
    }
  }, [])

  const updateStock = useCallback((id, data) => {
    setStocks((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s
        const category = data.category || s.category || US_CATEGORY.STOCK
        const symbol = data.symbol.toUpperCase()
        const name = data.name
        const isEtf =
          category === US_CATEGORY.STOCK
            ? Boolean(data.isEtf ?? isUsEtf(symbol, name))
            : false
        return normalizeUsHolding({
          ...s,
          symbol,
          name,
          qty: parseFloat(data.qty),
          buyPrice: parseFloat(data.buyPrice),
          buyDate: data.buyDate,
          category,
          isEtf,
        })
      })
      storage.setUSStocks(updated)
      return updated
    })
  }, [])

  const refreshPrices = useCallback(async () => {
    const current = stocksRef.current
    if (!current.length) return
    setLoading(true)
    try {
      const symbols = [...new Set(current.map((s) => s.symbol))]
      const [priceBundle, fxResult] = await Promise.all([
        fetchBatchPricesWithFallback(symbols),
        api.getUsdInr().catch(() => null),
      ])
      setPricesStale(priceBundle.stale)
      if (fxResult?.rate) {
        setUsdInr(fxResult.rate)
        storage.setSettings({ ...storage.getSettings(), lastUsdInr: fxResult.rate })
      }
      const priceResults = priceBundle.quotes
      setStocks((prev) => {
        const updated = prev.map((s) =>
          normalizeUsHolding({
            ...s,
            currentPrice: priceResults[s.symbol]?.price ?? s.currentPrice,
            dayChange: priceResults[s.symbol]?.dayChange ?? s.dayChange,
            dayChangePct: priceResults[s.symbol]?.dayChangePct ?? s.dayChangePct,
          })
        )
        storage.setUSStocks(updated)
        return updated
      })
      setLastUpdated(new Date())
      notifyDataChanged()
    } finally {
      setLoading(false)
    }
  }, [])

  return { stocks, loading, lastUpdated, pricesStale, usdInr, addStock, removeStock, updateStock, refreshPrices }
}
