import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'
import { api } from '../utils/api'
import { logBuy, logSell } from '../utils/transactions'
import { logAudit } from '../utils/auditTrail'
import { notifyDataChanged, PT_DATA_CHANGED } from './useNotifications'

export function useMutualFunds() {
  const [funds, setFunds] = useState(() => storage.getMutualFunds())
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const fundsRef = useRef(funds)
  useEffect(() => { fundsRef.current = funds }, [funds])

  useEffect(() => {
    const sync = () => setFunds(storage.getMutualFunds())
    window.addEventListener(PT_DATA_CHANGED, sync)
    return () => window.removeEventListener(PT_DATA_CHANGED, sync)
  }, [])

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
    const removed = fundsRef.current.find((f) => f.id === id)
    setFunds((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      storage.setMutualFunds(updated)
      return updated
    })
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
  }, [])

  const updateFund = useCallback((id, data) => {
    setFunds((prev) => {
      const before = prev.find((f) => f.id === id)
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
      logAudit('update', 'mutualFund', id, before, updated.find((f) => f.id === id))
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
      notifyDataChanged()
    } finally {
      setLoading(false)
    }
  }, [])

  return { funds, loading, lastUpdated, addFund, removeFund, updateFund, refreshNAVs }
}
