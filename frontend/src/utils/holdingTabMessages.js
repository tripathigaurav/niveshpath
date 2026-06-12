/**
 * User-facing copy for holdings sub-tabs — one source of truth per asset type.
 * Avoids showing AMFI/NAV text on stocks or "refresh prices" on mutual funds.
 */

/** @typedef {'indianStock'|'usStock'|'mutualFund'} AssetType */

export function xirrUnavailableHint(assetType) {
  if (assetType === 'mutualFund') return 'Add buy dates or refresh NAVs'
  if (assetType === 'usStock') return 'Add buy dates or refresh prices'
  return 'Add buy dates or refresh prices'
}

export function currentValueHint(assetType) {
  if (assetType === 'mutualFund') return 'Refresh NAV to see value'
  return 'Refresh prices to see value'
}

export function pricesUnavailableLabel(assetType) {
  return assetType === 'mutualFund' ? 'NAVs unavailable' : 'Prices unavailable'
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
  return assetType === 'mutualFund'
    ? 'Insufficient NAV history for this period'
    : 'Insufficient price history for this period'
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

export function marketDataFootnote(assetType, exchange = 'NSE') {
  if (assetType === 'mutualFund') {
    return 'Last NAV from AMFI. Historical NAVs (1M / 3M / 6M) load when you open this tab.'
  }
  if (assetType === 'usStock') {
    return 'Market data from live USD quotes. Refresh prices to update open, high, and 52-week range.'
  }
  if (exchange === 'BSE') {
    return 'Showing BSE (.BO) quotes from Yahoo Finance. NSE and BSE prices can differ — use the toggle to compare.'
  }
  return 'Showing NSE (.NS) quotes from Yahoo Finance. Switch to BSE to compare exchange prices.'
}
