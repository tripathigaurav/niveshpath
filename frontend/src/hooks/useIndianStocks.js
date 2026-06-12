import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'
import { isIndianEtf, normalizeIndianHolding } from '../utils/indianHoldings'
import { logBuy, logSell } from '../utils/transactions'
import { logAudit } from '../utils/auditTrail'
import { fetchBatchPricesWithFallback, mergeQuoteIntoHolding } from '../utils/priceProvider'
import { notifyDataChanged, PT_DATA_CHANGED } from './useNotifications'

export function useIndianStocks() {
  const [stocks, setStocks] = useState(() => storage.getIndianStocks().map(normalizeIndianHolding))
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [pricesStale, setPricesStale] = useState(false)
  const stocksRef = useRef(stocks)
  useEffect(() => { stocksRef.current = stocks }, [stocks])

  useEffect(() => {
    const sync = () => setStocks(storage.getIndianStocks().map(normalizeIndianHolding))
    window.addEventListener(PT_DATA_CHANGED, sync)
    return () => window.removeEventListener(PT_DATA_CHANGED, sync)
  }, [])

  const addStock = useCallback((data) => {
    const symbol = data.symbol.toUpperCase()
    const name = data.name
    const entry = normalizeIndianHolding({
      id: uuidv4(),
      symbol,
      name,
      qty: parseFloat(data.qty),
      buyPrice: parseFloat(data.buyPrice),
      buyDate: data.buyDate,
      isEtf: Boolean(data.isEtf ?? isIndianEtf(symbol, name)),
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    })
    setStocks((prev) => {
      const updated = [...prev, entry]
      storage.setIndianStocks(updated)
      return updated
    })
    logBuy({
      assetType: 'indianStock',
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
      storage.setIndianStocks(updated)
      return updated
    })
    if (removed) {
      logSell({
        assetType: 'indianStock',
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
      const before = prev.find((s) => s.id === id)
      const updated = prev.map((s) => {
        if (s.id !== id) return s
        const symbol = data.symbol.toUpperCase()
        const name = data.name
        return normalizeIndianHolding({
          ...s,
          symbol,
          name,
          qty: parseFloat(data.qty),
          buyPrice: parseFloat(data.buyPrice),
          buyDate: data.buyDate,
          isEtf: Boolean(data.isEtf ?? isIndianEtf(symbol, name)),
        })
      })
      storage.setIndianStocks(updated)
      logAudit('update', 'indianStock', id, before, updated.find((s) => s.id === id))
      return updated
    })
  }, [])

  const refreshPrices = useCallback(async () => {
    const current = stocksRef.current
    if (!current.length) return
    setLoading(true)
    try {
      const symbols = [...new Set(current.map((s) => s.symbol))]
      const { quotes, stale } = await fetchBatchPricesWithFallback(symbols)
      setPricesStale(stale)
      setStocks((prev) => {
        const updated = prev.map((s) =>
          normalizeIndianHolding(mergeQuoteIntoHolding(s, quotes[s.symbol]))
        )
        storage.setIndianStocks(updated)
        return updated
      })
      setLastUpdated(new Date())
      notifyDataChanged()
    } finally {
      setLoading(false)
    }
  }, [])

  return { stocks, loading, lastUpdated, pricesStale, addStock, removeStock, updateStock, refreshPrices }
}
