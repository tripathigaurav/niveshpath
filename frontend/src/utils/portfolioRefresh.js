/**
 * Shared portfolio market-data refresh (Indian + US + MF).
 */

import { isIndianMarketOpen, isUsMarketOpen } from './marketHours'

/** @typedef {'indian' | 'us' | 'mf'} RefreshCategory */

export function portfolioNeedsPriceRefresh({ indianStocks = [], usStocks = [], mutualFunds = [] }) {
  return (
    (indianStocks.length > 0 && indianStocks.some((s) => s.currentPrice == null)) ||
    (usStocks.length > 0 && usStocks.some((s) => s.currentPrice == null)) ||
    (mutualFunds.length > 0 && mutualFunds.some((f) => f.currentNAV == null))
  )
}

export function portfolioHasMarketHoldings({ indianStocks = [], usStocks = [], mutualFunds = [] }) {
  return indianStocks.length > 0 || usStocks.length > 0 || mutualFunds.length > 0
}

/**
 * Categories to refresh on the auto-refresh timer (market hours only).
 * @param {{ indianStocks?: unknown[], usStocks?: unknown[] }} holdings
 * @returns {RefreshCategory[]}
 */
export function getScheduledRefreshCategories(holdings, now = new Date()) {
  /** @type {RefreshCategory[]} */
  const cats = []
  if (holdings.indianStocks?.length && isIndianMarketOpen(now)) cats.push('indian')
  if (holdings.usStocks?.length && isUsMarketOpen(now)) cats.push('us')
  return cats
}

/**
 * @param {{ refreshIndian?: () => Promise<void>, refreshUs?: () => Promise<void>, refreshMf?: () => Promise<void> }} refreshers
 * @param {{ categories?: RefreshCategory[] }} opts — default all three
 */
export async function runPortfolioMarketRefresh(
  refreshers,
  { categories = ['indian', 'us', 'mf'] } = {}
) {
  const tasks = []
  if (categories.includes('indian') && refreshers.refreshIndian) {
    tasks.push(refreshers.refreshIndian())
  }
  if (categories.includes('us') && refreshers.refreshUs) {
    tasks.push(refreshers.refreshUs())
  }
  if (categories.includes('mf') && refreshers.refreshMf) {
    tasks.push(refreshers.refreshMf())
  }
  if (!tasks.length) return
  await Promise.all(tasks)
}

/** First load: refresh every held category that still lacks prices/NAV. */
export function getInitialRefreshCategories(holdings) {
  /** @type {RefreshCategory[]} */
  const cats = []
  if (
    holdings.indianStocks?.length &&
    holdings.indianStocks.some((s) => s.currentPrice == null)
  ) {
    cats.push('indian')
  }
  if (holdings.usStocks?.length && holdings.usStocks.some((s) => s.currentPrice == null)) {
    cats.push('us')
  }
  if (holdings.mutualFunds?.length && holdings.mutualFunds.some((f) => f.currentNAV == null)) {
    cats.push('mf')
  }
  return cats
}
