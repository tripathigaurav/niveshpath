import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api'
import {
  buildDividendSuggestions,
  computeUSHoldingPnL,
  getTransactionsForHolding,
} from '../utils/holdingLedger'
import { storage } from '../utils/storage'

export function useUSHoldingDetail(stock, { loadSuggestions = false, usdInr = null } = {}) {
  const [txVersion, setTxVersion] = useState(0)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState(null)

  const refresh = useCallback(() => setTxVersion((n) => n + 1), [])

  const transactions = useMemo(() => {
    if (!stock) return []
    return getTransactionsForHolding(stock.symbol, stock.id, 'usStock')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, txVersion])

  const pnl = useMemo(() => {
    if (!stock) return null
    return computeUSHoldingPnL(stock, storage.getTransactions(), usdInr)
  }, [stock, transactions, usdInr])

  useEffect(() => {
    if (!stock || !loadSuggestions) {
      setSuggestions([])
      return
    }
    let cancelled = false
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    api
      .getStockActions(stock.symbol)
      .then((data) => {
        if (cancelled) return
        const allTx = storage.getTransactions()
        setSuggestions(buildDividendSuggestions(data, allTx, stock.symbol))
      })
      .catch((err) => {
        if (!cancelled) setSuggestionsError(err?.message || 'Could not load company events')
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false)
      })
    return () => { cancelled = true }
  }, [stock, loadSuggestions, txVersion])

  return {
    transactions,
    pnl,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    refresh,
  }
}
