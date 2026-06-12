import { api } from './api'
import { cachePrices, getCachedPrices } from './priceCache'

/**
 * Fetch batch prices with IndexedDB fallback when API fails.
 * @param {string[]} symbols
 * @returns {Promise<{ quotes: Record<string, object>, stale: boolean, fetchedAt: number|null }>}
 */
export async function fetchBatchPricesWithFallback(symbols) {
  const unique = [...new Set(symbols.filter(Boolean))]
  if (!unique.length) return { quotes: {}, stale: false, fetchedAt: null }

  try {
    const results = await api.getBatchPrices(unique)
    await cachePrices(results)
    return { quotes: results, stale: false, fetchedAt: Date.now() }
  } catch {
    const cached = await getCachedPrices(unique)
    const quotes = {}
    let any = false
    for (const sym of unique) {
      const row = cached[sym]
      if (row?.price != null) {
        any = true
        quotes[sym] = {
          price: row.price,
          previousClose: row.previousClose,
          dayChange: row.dayChange,
          dayChangePct: row.dayChangePct,
          open: row.open,
          dayHigh: row.dayHigh,
          dayLow: row.dayLow,
          yearHigh: row.yearHigh,
          yearLow: row.yearLow,
          stale: true,
          cachedAt: row.cachedAt,
        }
      }
    }
    return { quotes, stale: any, fetchedAt: any ? Math.max(...Object.values(cached).map((r) => r.cachedAt || 0)) : null }
  }
}

export function mergeQuoteIntoHolding(holding, quote, priceKey = 'currentPrice') {
  if (quote?.price == null) return holding
  return {
    ...holding,
    [priceKey]: quote.price ?? holding[priceKey],
    dayChange: quote.dayChange ?? holding.dayChange,
    dayChangePct: quote.dayChangePct ?? holding.dayChangePct,
    previousClose: quote.previousClose ?? holding.previousClose,
    open: quote.open ?? holding.open,
    dayHigh: quote.dayHigh ?? holding.dayHigh,
    dayLow: quote.dayLow ?? holding.dayLow,
    yearHigh: quote.yearHigh ?? holding.yearHigh,
    yearLow: quote.yearLow ?? holding.yearLow,
    priceStale: Boolean(quote.stale),
  }
}
