import { useCallback, useEffect, useRef } from 'react'
import { useIndianStocks, useUSStocks, useMutualFunds } from './usePortfolio'
import { storage } from '../utils/storage'
import {
  getInitialRefreshCategories,
  getScheduledRefreshCategories,
  portfolioHasMarketHoldings,
  runPortfolioMarketRefresh,
} from '../utils/portfolioRefresh'

/**
 * Shared refresh on app load; auto-refresh respects Indian vs US market hours separately.
 */
export function usePortfolioMarketRefresh() {
  const { stocks: indianStocks, refreshPrices: refreshIndian } = useIndianStocks()
  const { stocks: usStocks, refreshPrices: refreshUs } = useUSStocks()
  const { funds: mutualFunds, refreshNAVs: refreshMf } = useMutualFunds()

  const holdingsRef = useRef({ indianStocks, usStocks, mutualFunds })
  holdingsRef.current = { indianStocks, usStocks, mutualFunds }

  const refreshersRef = useRef({ refreshIndian, refreshUs, refreshMf })
  refreshersRef.current = { refreshIndian, refreshUs, refreshMf }

  const refreshCategories = useCallback(async (categories) => {
    const h = holdingsRef.current
    if (!categories.length) return
    const r = refreshersRef.current
    await runPortfolioMarketRefresh(
      {
        refreshIndian: h.indianStocks.length ? r.refreshIndian : undefined,
        refreshUs: h.usStocks.length ? r.refreshUs : undefined,
        refreshMf: h.mutualFunds.length ? r.refreshMf : undefined,
      },
      { categories }
    )
  }, [])

  const refreshCategoriesRef = useRef(refreshCategories)
  refreshCategoriesRef.current = refreshCategories

  const refreshAllForced = useCallback(async () => {
    const h = holdingsRef.current
    if (!portfolioHasMarketHoldings(h)) return
    await refreshCategoriesRef.current(['indian', 'us', 'mf'])
  }, [])

  const refreshScheduled = useCallback(async () => {
    const h = holdingsRef.current
    const cats = getScheduledRefreshCategories(h)
    await refreshCategoriesRef.current(cats)
  }, [])

  const refreshScheduledRef = useRef(refreshScheduled)
  refreshScheduledRef.current = refreshScheduled

  useEffect(() => {
    const h = holdingsRef.current
    if (!portfolioHasMarketHoldings(h)) return
    const cats = getInitialRefreshCategories(h)
    if (cats.length) refreshCategoriesRef.current(cats)
  }, [])

  useEffect(() => {
    const getInterval = () => storage.getSettings().autoRefreshInterval ?? 0

    const tick = () => {
      if (document.hidden) return
      refreshScheduledRef.current()
    }

    const start = () => {
      const secs = getInterval()
      if (!secs || secs < 10) return null
      return setInterval(tick, secs * 1000)
    }

    let timer = start()

    const onVisibility = () => {
      if (document.hidden) return
      refreshScheduledRef.current()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onStorage = (e) => {
      if (e.key && !e.key.includes('pt_settings')) return
      clearInterval(timer)
      timer = start()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return { refreshAll: refreshAllForced }
}
