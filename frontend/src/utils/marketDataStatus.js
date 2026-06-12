/**
 * Detect when live prices/NAVs are missing — avoid showing misleading P&L or charts.
 */

/** @typedef {'indianStock'|'usStock'|'mutualFund'} AssetType */

/** @typedef {'all_missing'|'partial_missing'|'usd_inr_missing'} MarketDataIssueCode */

/**
 * @typedef {object} HoldingsMarketDataStatus
 * @property {boolean} ready
 * @property {'error'|'warning'|null} level
 * @property {MarketDataIssueCode|null} code
 * @property {number} [missingCount]
 * @property {number} [totalCount]
 * @property {AssetType} [assetType]
 */

function liveQuote(holding, assetType) {
  if (assetType === 'mutualFund') return holding.currentNAV
  return holding.currentPrice
}

/**
 * @param {unknown[]} holdings
 * @param {AssetType} assetType
 * @returns {HoldingsMarketDataStatus}
 */
export function getHoldingsMarketDataStatus(holdings, assetType) {
  const current = (holdings || []).filter((h) => !h?.isPast)
  if (!current.length) {
    return { ready: true, level: null, code: null, assetType }
  }

  const missing = current.filter((h) => liveQuote(h, assetType) == null)
  if (missing.length === 0) {
    return { ready: true, level: null, code: null, assetType }
  }

  const allMissing = missing.length === current.length
  return {
    ready: false,
    level: allMissing ? 'error' : 'warning',
    code: allMissing ? 'all_missing' : 'partial_missing',
    missingCount: missing.length,
    totalCount: current.length,
    assetType,
  }
}

/** @returns {boolean} */
export function canShowValueBasedChart(status) {
  return Boolean(status?.ready)
}

/**
 * @param {{ indianStocks?: unknown[], usStocks?: unknown[], mutualFunds?: unknown[], usdInr?: number|null }} holdings
 */
export function getPortfolioMarketDataStatus({
  indianStocks = [],
  usStocks = [],
  mutualFunds = [],
  usdInr = null,
} = {}) {
  /** @type {Array<HoldingsMarketDataStatus & { category: string }>} */
  const issues = []

  const indian = getHoldingsMarketDataStatus(indianStocks, 'indianStock')
  if (!indian.ready) issues.push({ ...indian, category: 'indian' })

  const us = getHoldingsMarketDataStatus(usStocks, 'usStock')
  if (!us.ready) issues.push({ ...us, category: 'us' })

  const mf = getHoldingsMarketDataStatus(mutualFunds, 'mutualFund')
  if (!mf.ready) issues.push({ ...mf, category: 'mf' })

  if (usStocks.length > 0 && !usdInr) {
    issues.push({
      ready: false,
      level: 'error',
      code: 'usd_inr_missing',
      assetType: 'usStock',
      category: 'us',
    })
  }

  return {
    ready: issues.length === 0,
    issues,
    hasBlockingError: issues.some((i) => i.level === 'error'),
  }
}

/** Stock market tab: open / high / 52-week missing on every row. */
export function isExtendedStockMarketDataMissing(rows) {
  if (!rows?.length) return false
  return rows.every(
    (h) =>
      h.open == null &&
      h.dayHigh == null &&
      h.yearHigh == null &&
      h.yearLow == null
  )
}

/** MF market tab: historical NAV columns missing on every row. */
export function isMfNavHistoryMissing(holdings, navHistoryById = {}) {
  if (!holdings?.length) return false
  return holdings.every((f) => {
    const hist = navHistoryById[f.id] || {}
    return hist.nav1m == null && hist.nav3m == null && hist.nav6m == null
  })
}

export function portfolioHasMarketHoldings({
  indianStocks = [],
  usStocks = [],
  mutualFunds = [],
} = {}) {
  return indianStocks.length > 0 || usStocks.length > 0 || mutualFunds.length > 0
}
