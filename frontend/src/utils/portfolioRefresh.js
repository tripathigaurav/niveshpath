/**
 * Shared portfolio market-data refresh (Indian + US + MF).
 */

import { storage } from './storage'
import { isIndianMarketOpen, isUsMarketOpen } from './marketHours'

/** @typedef {'indian' | 'us' | 'mf'} RefreshCategory */

/** @type {Record<string, RefreshCategory | undefined>} */
export const TAB_REFRESH_CATEGORY = {
  indianStocks: 'indian',
  usStocks: 'us',
  mutualFunds: 'mf',
}

export function getCategoryForTab(tab) {
  return TAB_REFRESH_CATEGORY[tab]
}

export function markMarketRefreshed(category) {
  const settings = storage.getSettings()
  const lastMarketRefresh = {
    indian: null,
    us: null,
    mf: null,
    ...settings.lastMarketRefresh,
    [category]: Date.now(),
  }
  storage.setSettings({ ...settings, lastMarketRefresh })
}

export function getMarketRefreshedAt(category) {
  const ts = storage.getSettings().lastMarketRefresh?.[category]
  return ts ? new Date(ts) : null
}

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
 * Categories to refresh on the auto-refresh timer.
 * Stocks refresh during market hours, or while their tab / dashboard is open.
 * MF NAVs refresh while the MF tab or dashboard is open (NAV publishes once daily).
 * @param {{ indianStocks?: unknown[], usStocks?: unknown[], mutualFunds?: unknown[] }} holdings
 * @param {Date} [now]
 * @param {string} [activeTab]
 * @returns {RefreshCategory[]}
 */
export function getScheduledRefreshCategories(holdings, now = new Date(), activeTab = null) {
  /** @type {RefreshCategory[]} */
  const cats = []
  const onDashboard = activeTab === 'dashboard'
  const onIndian = activeTab === 'indianStocks'
  const onUs = activeTab === 'usStocks'
  const onMf = activeTab === 'mutualFunds'

  if (
    holdings.indianStocks?.length &&
    (isIndianMarketOpen(now) || onIndian || onDashboard)
  ) {
    cats.push('indian')
  }
  if (
    holdings.usStocks?.length &&
    (isUsMarketOpen(now) || onUs || onDashboard)
  ) {
    cats.push('us')
  }
  if (holdings.mutualFunds?.length && (onMf || onDashboard)) {
    cats.push('mf')
  }
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
