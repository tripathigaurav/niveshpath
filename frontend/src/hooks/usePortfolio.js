import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'
import { api } from '../utils/api'

export function useIndianStocks() {
  const [stocks, setStocks] = useState(() => storage.getIndianStocks())
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const stocksRef = useRef(stocks)
  useEffect(() => { stocksRef.current = stocks }, [stocks])

  const addStock = useCallback((data) => {
    const entry = {
      id: uuidv4(),
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      qty: parseFloat(data.qty),
      buyPrice: parseFloat(data.buyPrice),
      buyDate: data.buyDate,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    }
    setStocks((prev) => {
      const updated = [...prev, entry]
      storage.setIndianStocks(updated)
      return updated
    })
  }, [])

  const removeStock = useCallback((id) => {
    setStocks((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      storage.setIndianStocks(updated)
      return updated
    })
  }, [])

  const updateStock = useCallback((id, data) => {
    setStocks((prev) => {
      const updated = prev.map((s) =>
        s.id === id
          ? {
              ...s,
              symbol: data.symbol.toUpperCase(),
              name: data.name,
              qty: parseFloat(data.qty),
              buyPrice: parseFloat(data.buyPrice),
              buyDate: data.buyDate,
            }
          : s
      )
      storage.setIndianStocks(updated)
      return updated
    })
  }, [])

  const refreshPrices = useCallback(async () => {
    const current = stocksRef.current
    if (!current.length) return
    setLoading(true)
    try {
      const symbols = [...new Set(current.map((s) => s.symbol))]
      const results = await api.getBatchPrices(symbols)
      setStocks((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          currentPrice: results[s.symbol]?.price ?? s.currentPrice,
          dayChange: results[s.symbol]?.dayChange ?? s.dayChange,
          dayChangePct: results[s.symbol]?.dayChangePct ?? s.dayChangePct,
        }))
        storage.setIndianStocks(updated)
        return updated
      })
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  return { stocks, loading, lastUpdated, addStock, removeStock, updateStock, refreshPrices }
}

// ── US Stocks ────────────────────────────────────────────────────────────────

export function useUSStocks() {
  const [stocks, setStocks] = useState(() => storage.getUSStocks())
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [usdInr, setUsdInr] = useState(null)
  const stocksRef = useRef(stocks)
  useEffect(() => { stocksRef.current = stocks }, [stocks])

  const addStock = useCallback((data) => {
    const entry = {
      id: uuidv4(),
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      qty: parseFloat(data.qty),
      buyPrice: parseFloat(data.buyPrice),
      buyDate: data.buyDate,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    }
    setStocks((prev) => {
      const updated = [...prev, entry]
      storage.setUSStocks(updated)
      return updated
    })
  }, [])

  const removeStock = useCallback((id) => {
    setStocks((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      storage.setUSStocks(updated)
      return updated
    })
  }, [])

  const updateStock = useCallback((id, data) => {
    setStocks((prev) => {
      const updated = prev.map((s) =>
        s.id === id
          ? {
              ...s,
              symbol: data.symbol.toUpperCase(),
              name: data.name,
              qty: parseFloat(data.qty),
              buyPrice: parseFloat(data.buyPrice),
              buyDate: data.buyDate,
            }
          : s
      )
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
      const [priceResults, fxResult] = await Promise.all([
        api.getBatchPrices(symbols),
        api.getUsdInr(),
      ])
      if (fxResult?.rate) setUsdInr(fxResult.rate)
      setStocks((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          currentPrice: priceResults[s.symbol]?.price ?? s.currentPrice,
          dayChange: priceResults[s.symbol]?.dayChange ?? s.dayChange,
          dayChangePct: priceResults[s.symbol]?.dayChangePct ?? s.dayChangePct,
        }))
        storage.setUSStocks(updated)
        return updated
      })
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  return { stocks, loading, lastUpdated, usdInr, addStock, removeStock, updateStock, refreshPrices }
}

// ── Mutual Funds ─────────────────────────────────────────────────────────────

export function useMutualFunds() {
  const [funds, setFunds] = useState(() => storage.getMutualFunds())
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const fundsRef = useRef(funds)
  useEffect(() => { fundsRef.current = funds }, [funds])

  const addFund = useCallback((data) => {
    const entry = {
      id: uuidv4(),
      schemeCode: data.schemeCode,
      schemeName: data.schemeName,
      units: parseFloat(data.units),
      buyNAV: parseFloat(data.buyNAV),
      buyDate: data.buyDate,
      currentNAV: null,
      navDate: null,
    }
    setFunds((prev) => {
      const updated = [...prev, entry]
      storage.setMutualFunds(updated)
      return updated
    })
  }, [])

  const removeFund = useCallback((id) => {
    setFunds((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      storage.setMutualFunds(updated)
      return updated
    })
  }, [])

  const updateFund = useCallback((id, data) => {
    setFunds((prev) => {
      const updated = prev.map((f) =>
        f.id === id
          ? {
              ...f,
              schemeCode: data.schemeCode,
              schemeName: data.schemeName,
              units: parseFloat(data.units),
              buyNAV: parseFloat(data.buyNAV),
              buyDate: data.buyDate,
            }
          : f
      )
      storage.setMutualFunds(updated)
      return updated
    })
  }, [])

  const refreshNAVs = useCallback(async () => {
    const current = fundsRef.current
    if (!current.length) return
    setLoading(true)
    try {
      const results = await Promise.all(
        current.map((f) => api.getMfNav(f.schemeCode).catch(() => null))
      )
      setFunds((prev) => {
        const updated = prev.map((f, i) => ({
          ...f,
          currentNAV: results[i]?.nav ?? f.currentNAV,
          navDate: results[i]?.date ?? f.navDate,
        }))
        storage.setMutualFunds(updated)
        return updated
      })
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  return { funds, loading, lastUpdated, addFund, removeFund, updateFund, refreshNAVs }
}

// ── Other Assets ─────────────────────────────────────────────────────────────

export function useOtherAssets() {
  const [assets, setAssets] = useState(() => storage.getOtherAssets())

  const addAsset = useCallback((data) => {
    const entry = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      investedAmount: parseFloat(data.investedAmount),
      currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
      notes: data.notes || '',
      addedDate: data.addedDate || new Date().toISOString().split('T')[0],
    }
    setAssets((prev) => {
      const updated = [...prev, entry]
      storage.setOtherAssets(updated)
      return updated
    })
  }, [])

  const removeAsset = useCallback((id) => {
    setAssets((prev) => {
      const updated = prev.filter((a) => a.id !== id)
      storage.setOtherAssets(updated)
      return updated
    })
  }, [])

  const updateAsset = useCallback((id, data) => {
    setAssets((prev) => {
      const updated = prev.map((a) =>
        a.id === id
          ? {
              ...a,
              name: data.name,
              type: data.type,
              investedAmount: parseFloat(data.investedAmount),
              currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
              notes: data.notes || '',
              addedDate: data.addedDate,
            }
          : a
      )
      storage.setOtherAssets(updated)
      return updated
    })
  }, [])

  return { assets, addAsset, removeAsset, updateAsset }
}
