/**
 * User-facing copy for holdings sub-tabs — one source of truth per asset type.
 * Avoids showing AMFI/NAV text on stocks or "refresh prices" on mutual funds.
 */

/** @typedef {'indianStock'|'usStock'|'mutualFund'} AssetType */

export function xirrUnavailableHint(assetType) {
  if (assetType === 'mutualFund') return 'Add buy dates — NAVs update automatically'
  if (assetType === 'usStock') return 'Add buy dates — prices update automatically'
  return 'Add buy dates — prices update automatically'
}

export function currentValueHint(assetType) {
  if (assetType === 'mutualFund') return 'Fetching latest NAV…'
  return 'Fetching latest prices…'
}

export function pricesUnavailableLabel(assetType) {
  return assetType === 'mutualFund' ? 'NAVs unavailable' : 'Prices unavailable'
}

const RETRY_HINT =
  'Check your internet connection and tap Retry — live data loads automatically when available.'

function priceNoun(assetType, { plural = false } = {}) {
  if (assetType === 'mutualFund') return plural ? 'NAVs' : 'NAV'
  return plural ? 'prices' : 'price'
}

/**
 * @param {import('./marketDataStatus').AssetType} assetType
 * @param {{ code?: string|null, missingCount?: number, totalCount?: number }} status
 * @param {'holdings'|'pnl'|'irr'|'market'|'portfolio'} [context]
 */
export function marketDataIssueTitle(assetType, status, context = 'holdings') {
  if (status?.code === 'usd_inr_missing') return 'USD/INR rate unavailable'
  if (status?.code === 'partial_missing') {
    return `Some ${priceNoun(assetType, { plural: true })} missing`
  }
  if (context === 'pnl') return `P&L trend unavailable`
  if (context === 'portfolio') return 'Portfolio chart unavailable'
  return pricesUnavailableLabel(assetType)
}

/**
 * @param {import('./marketDataStatus').AssetType} assetType
 * @param {{ code?: string|null, missingCount?: number, totalCount?: number }} status
 * @param {'holdings'|'pnl'|'irr'|'market'|'portfolio'} [context]
 */
export function marketDataIssueMessage(assetType, status, context = 'holdings') {
  if (status?.code === 'usd_inr_missing') {
    return `Today's USD/INR rate didn't load, so INR totals are paused for US holdings. ${RETRY_HINT}`
  }

  if (status?.code === 'all_missing') {
    if (context === 'pnl') {
      return `Live ${priceNoun(assetType, { plural: true })} are needed to compare current value with what you invested. Without them, the chart would look like zero gain or loss. ${RETRY_HINT}`
    }
    if (context === 'portfolio') {
      return `Live ${priceNoun(assetType, { plural: true })} didn't load in time. The portfolio chart needs them to show gain or loss correctly. ${RETRY_HINT}`
    }
    if (context === 'irr' || context === 'market') {
      return `Live ${priceNoun(assetType, { plural: true })} didn't load. Some columns need recent market history before they can fill in. ${RETRY_HINT}`
    }
    return `Couldn't fetch live ${priceNoun(assetType, { plural: true })}. Current value and P&L stay hidden until they load. ${RETRY_HINT}`
  }

  if (status?.code === 'partial_missing') {
    const n = status.missingCount ?? 0
    const t = status.totalCount ?? 0
    if (context === 'pnl') {
      return `${n} of ${t} holdings are still missing a live ${priceNoun(assetType)}. P&L trend needs all holdings — otherwise profit or loss would look too low. ${RETRY_HINT}`
    }
    return `${n} of ${t} holdings are still missing a live ${priceNoun(assetType)}. Totals and P&L may be low until everything loads. ${RETRY_HINT}`
  }

  return `Market data couldn't be loaded right now. ${RETRY_HINT}`
}

const CATEGORY_LABELS = {
  indian: 'Indian stocks',
  us: 'US stocks',
  mf: 'Mutual funds',
}

/**
 * @param {Array<{ category?: string, assetType?: string, code?: string }>} issues
 */
export function portfolioMarketDataIssueTitle(issues) {
  if (!issues?.length) return 'Portfolio chart unavailable'
  if (issues.length === 1) {
    return marketDataIssueTitle(issues[0].assetType || 'indianStock', issues[0], 'portfolio')
  }
  return 'Portfolio chart unavailable'
}

/**
 * @param {Array<{ category?: string, assetType?: string, code?: string, missingCount?: number, totalCount?: number }>} issues
 */
export function portfolioMarketDataIssueMessage(issues) {
  if (!issues?.length) {
    return `Live market data is needed for an accurate portfolio chart. ${RETRY_HINT}`
  }
  if (issues.length === 1) {
    return marketDataIssueMessage(issues[0].assetType || 'indianStock', issues[0], 'portfolio')
  }
  const names = issues
    .map((i) => CATEGORY_LABELS[i.category] || i.assetType)
    .filter(Boolean)
    .join(', ')
  return `Live prices or NAVs didn't load for: ${names}. Showing a chart now would misstate your gain or loss. ${RETRY_HINT}`
}

export function refreshButtonLabel(assetType, loading = false) {
  if (loading) return 'Refreshing...'
  return assetType === 'mutualFund' ? '↻ Refresh NAVs' : '↻ Refresh Prices'
}

export function irrFootnote(assetType, { usdInr } = {}) {
  if (assetType === 'mutualFund') {
    return 'IRR is annualized. Windowed IRR uses AMFI historical NAV at each period start.'
  }
  if (assetType === 'usStock') {
    return usdInr
      ? 'IRR is annualized in INR. Windowed IRR uses historical USD price at period start (converted at current USD/INR).'
      : 'IRR is annualized. Refresh prices and USD/INR rate for windowed IRR.'
  }
  return 'IRR is annualized. Windowed IRR uses historical NSE/BSE price at each period start.'
}

export function irrInsufficientTooltip(assetType) {
  if (assetType === 'mutualFund') {
    return 'Needs the NAV on that period’s start date — historical NAV did not load'
  }
  return 'Needs the share price on that period’s start date — historical price did not load'
}

/** Shown when Total Holding Period works but all windowed columns are N/A. */
export function irrWindowedUnavailableMessage(assetType) {
  const noun = priceNoun(assetType, { plural: true })
  return `The Last 90 Days, Last 365 Days, and Since 1st April columns need the ${noun} on each period’s start date. Those historical ${noun} didn’t load, so we show N/A instead of a wrong number. Total Holding Period only uses your buy/sell history and today’s ${priceNoun(assetType)}. ${RETRY_HINT}`
}

export function irrWindowedColumnsHint(assetType) {
  if (assetType === 'mutualFund') {
    return 'Windowed columns use NAV on each period’s start date. Total Holding Period uses your full transaction history.'
  }
  return 'Windowed columns use the share price on each period’s start date. Total Holding Period uses your full transaction history.'
}

export function pnlChartNote(assetType, { currency = 'INR' } = {}) {
  if (assetType === 'mutualFund') {
    return "Invested cost from your transaction ledger. Current value uses today's live NAVs."
  }
  if (assetType === 'usStock') {
    return currency === 'USD'
      ? "Invested cost from your transaction ledger. Current value uses today's live USD prices."
      : "Invested cost from your transaction ledger. Current value uses today's USD prices converted at current USD/INR."
  }
  return "Invested cost from your transaction ledger. Current value uses today's live NSE/BSE prices."
}

export function marketDataExtendedUnavailableMessage(assetType) {
  if (assetType === 'mutualFund') {
    return `1-month, 3-month, and 6-month NAVs didn't load. Last NAV may still show from your holdings. ${RETRY_HINT}`
  }
  return `Open, day high, and 52-week range didn't load. Prev. close may still show from today's price change — we hide guessing on the other columns. ${RETRY_HINT}`
}

export function marketDataColumnsHint(assetType) {
  if (assetType === 'mutualFund') {
    return 'Last NAV from AMFI. Older NAVs load when this tab opens.'
  }
  return "Today's open, high, and 52-week range from live exchange quotes."
}

export function marketDataFootnote(assetType, exchange = 'NSE') {
  if (assetType === 'mutualFund') {
    return 'Last NAV from AMFI. Historical NAVs (1M / 3M / 6M) load when you open this tab.'
  }
  if (assetType === 'usStock') {
    return 'Market data from live USD quotes. Updates automatically when prices refresh.'
  }
  if (exchange === 'BSE') {
    return 'Showing BSE (.BO) quotes from Yahoo Finance. NSE and BSE prices can differ — use the toggle to compare.'
  }
  return 'Showing NSE (.NS) quotes from Yahoo Finance. Switch to BSE to compare exchange prices.'
}
