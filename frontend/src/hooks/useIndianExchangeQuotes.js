import { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api'
import { indianSymbolForExchange, holdingExchange } from '../utils/indianExchange'
import { mergeQuoteIntoHolding } from '../utils/priceProvider'

/**
 * Overlay live quotes for the selected exchange (NSE/BSE) without mutating stored holdings.
 */
export function useIndianExchangeQuotes(stocks, exchange, enabled) {
  const [quotesById, setQuotesById] = useState({})
  const [loading, setLoading] = useState(false)

  const needsFetch = useMemo(() => {
    if (!enabled || !stocks?.length) return false
    return stocks.some((s) => holdingExchange(s.symbol) !== exchange)
  }, [enabled, stocks, exchange])

  useEffect(() => {
    if (!needsFetch) {
      setQuotesById({})
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    const symbols = stocks.map((s) => indianSymbolForExchange(s.symbol, exchange))

    api
      .getBatchPrices(symbols)
      .then((results) => {
        if (cancelled) return
        const next = {}
        stocks.forEach((s, i) => {
          const sym = symbols[i]
          if (results[sym]) next[s.id] = results[sym]
        })
        setQuotesById(next)
      })
      .catch(() => {
        if (!cancelled) setQuotesById({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [stocks, exchange, needsFetch])

  const displayStocks = useMemo(() => {
    if (!enabled) return stocks
    return stocks.map((s) => {
      if (holdingExchange(s.symbol) === exchange) return s
      const q = quotesById[s.id]
      if (!q) return { ...s, currentPrice: null, dayChange: null, dayChangePct: null }
      return mergeQuoteIntoHolding(s, q)
    })
  }, [stocks, exchange, enabled, quotesById])

  return { displayStocks, loadingQuotes: loading && needsFetch, needsFetch }
}
