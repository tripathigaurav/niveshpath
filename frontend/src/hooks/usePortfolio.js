import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'
import { isIndianEtf, normalizeIndianHolding } from '../utils/indianHoldings'
import { US_CATEGORY, isUsEtf, normalizeUsHolding } from '../utils/usHoldings'
import { api } from '../utils/api'
import { logBuy, logSell } from '../utils/transactions'

export function useIndianStocks() {
  const [stocks, setStocks] = useState(() => storage.getIndianStocks().map(normalizeIndianHolding))
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const stocksRef = useRef(stocks)
  useEffect(() => { stocksRef.current = stocks }, [stocks])

  const refreshPricesRef = useRef(null)

  useEffect(() => {
    const getInterval = () => storage.getSettings().autoRefreshInterval ?? 0

    const start = () => {
      const secs = getInterval()
      if (!secs || secs < 10) return null
      return setInterval(() => { refreshPricesRef.current?.() }, secs * 1000)
    }

    let timer = start()

    const onStorage = (e) => {
      if (e.key && !e.key.includes('pt_settings')) return
      clearInterval(timer)
      timer = start()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(timer)
      window.removeEventListener('storage', onStorage)
    }
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
    setStocks((prev) => {
      const removed = prev.find((s) => s.id === id)
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
      const updated = prev.filter((s) => s.id !== id)
      storage.setIndianStocks(updated)
      return updated
    })
  }, [])

  const updateStock = useCallback((id, data) => {
    setStocks((prev) => {
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
        const updated = prev.map((s) =>
          normalizeIndianHolding({
            ...s,
            currentPrice: results[s.symbol]?.price ?? s.currentPrice,
            dayChange: results[s.symbol]?.dayChange ?? s.dayChange,
            dayChangePct: results[s.symbol]?.dayChangePct ?? s.dayChangePct,
          })
        )
        storage.setIndianStocks(updated)
        return updated
      })
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshPricesRef.current = refreshPrices }, [refreshPrices])

  return { stocks, loading, lastUpdated, addStock, removeStock, updateStock, refreshPrices }
}

// ── US Stocks ────────────────────────────────────────────────────────────────

export function useUSStocks() {
  const [stocks, setStocks] = useState(() => storage.getUSStocks().map(normalizeUsHolding))
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [usdInr, setUsdInr] = useState(null)
  const stocksRef = useRef(stocks)
  useEffect(() => { stocksRef.current = stocks }, [stocks])

  const refreshPricesRef = useRef(null)

  useEffect(() => {
    const getInterval = () => storage.getSettings().autoRefreshInterval ?? 0

    const start = () => {
      const secs = getInterval()
      if (!secs || secs < 10) return null
      return setInterval(() => { refreshPricesRef.current?.() }, secs * 1000)
    }

    let timer = start()

    const onStorage = (e) => {
      if (e.key && !e.key.includes('pt_settings')) return
      clearInterval(timer)
      timer = start()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(timer)
      window.removeEventListener('storage', onStorage)
    }
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
    setStocks((prev) => {
      const removed = prev.find((s) => s.id === id)
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
      const updated = prev.filter((s) => s.id !== id)
      storage.setUSStocks(updated)
      return updated
    })
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
      const [priceResults, fxResult] = await Promise.all([
        api.getBatchPrices(symbols),
        api.getUsdInr(),
      ])
      if (fxResult?.rate) setUsdInr(fxResult.rate)
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshPricesRef.current = refreshPrices }, [refreshPrices])

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
    logBuy({
      assetType: 'mutualFund',
      symbol: entry.schemeCode,
      name: entry.schemeName,
      qty: entry.units,
      price: entry.buyNAV,
      date: entry.buyDate,
      holdingId: entry.id,
    })
  }, [])

  const removeFund = useCallback((id) => {
    setFunds((prev) => {
      const removed = prev.find((f) => f.id === id)
      if (removed) {
        logSell({
          assetType: 'mutualFund',
          symbol: removed.schemeCode,
          name: removed.schemeName,
          qty: removed.units,
          price: removed.buyNAV,
          date: removed.buyDate,
          holdingId: removed.id,
        })
      }
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
        const updated = prev.map((f, i) => {
          const newNav = results[i]?.nav ?? f.currentNAV
          const newDate = results[i]?.date ?? f.navDate
          let previousNAV = f.previousNAV
          if (
            newDate &&
            f.navDate &&
            newDate !== f.navDate &&
            f.currentNAV != null
          ) {
            previousNAV = f.currentNAV
          }
          return {
            ...f,
            currentNAV: newNav,
            navDate: newDate,
            previousNAV,
          }
        })
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

// ── Insurance ─────────────────────────────────────────────────────────────────

export function useInsurance() {
  const [policies, setPolicies] = useState(() => storage.getInsurance())

  const addPolicy = useCallback((data) => {
    const entry = {
      id: uuidv4(),
      name: data.name,
      type: data.type,           // 'health' | 'term'
      premium: parseFloat(data.premium),
      coverAmount: data.coverAmount ? parseFloat(data.coverAmount) : null,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      renewalDate: data.renewalDate || null,
      notes: data.notes || '',
    }
    setPolicies((prev) => {
      const updated = [...prev, entry]
      storage.setInsurance(updated)
      return updated
    })
  }, [])

  const removePolicy = useCallback((id) => {
    setPolicies((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      storage.setInsurance(updated)
      return updated
    })
  }, [])

  const updatePolicy = useCallback((id, data) => {
    setPolicies((prev) => {
      const updated = prev.map((p) =>
        p.id === id
          ? {
              ...p,
              name: data.name,
              type: data.type,
              premium: parseFloat(data.premium),
              coverAmount: data.coverAmount ? parseFloat(data.coverAmount) : null,
              startDate: data.startDate,
              renewalDate: data.renewalDate || null,
              notes: data.notes || '',
            }
          : p
      )
      storage.setInsurance(updated)
      return updated
    })
  }, [])

  return { policies, addPolicy, removePolicy, updatePolicy }
}
