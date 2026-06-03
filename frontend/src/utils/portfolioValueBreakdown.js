import {
  calcIndianStockMetrics,
  calcMfPnl,
  calcUsPnl,
  sumPortfolioTodayPnl,
  sumTodayPnl,
  sumTodayPnlMF,
  sumTodayPnlUS,
} from './pnl'

const TOLERANCE = 1

function nearEqual(a, b) {
  if (a == null || b == null) return false
  return Math.abs(a - b) <= TOLERANCE
}

/**
 * Same aggregation as Dashboard useAllTotals — for a consistent breakdown.
 */
export function buildPortfolioValueBreakdown({
  indianStocks = [],
  usStocks = [],
  mutualFunds = [],
  otherAssets = [],
  usdInr = null,
  grandInvested = 0,
  grandCurrent = null,
  portfolioTodayPnl = null,
}) {
  let inCurrent = 0
  let inCurrentKnown = false
  for (const s of indianStocks) {
    const m = calcIndianStockMetrics(s)
    if (m.current != null) {
      inCurrent += m.current
      inCurrentKnown = true
    }
  }
  const inToday = sumTodayPnl(indianStocks)

  let usCurrentINR = null
  let usCurrentKnown = false
  let usInvestedINR = null
  for (const s of usStocks) {
    const { investedUSD, currentUSD } = calcUsPnl(s)
    if (usdInr) {
      usInvestedINR = (usInvestedINR ?? 0) + investedUSD * usdInr
      if (currentUSD != null) {
        usCurrentINR = (usCurrentINR ?? 0) + currentUSD * usdInr
        usCurrentKnown = true
      }
    }
  }
  const usToday = sumTodayPnlUS(usStocks, usdInr)

  let mfCurrent = null
  let mfCurrentKnown = false
  let mfInvested = 0
  for (const f of mutualFunds) {
    const { invested, current } = calcMfPnl(f)
    mfInvested += invested
    if (current != null) {
      mfCurrent = (mfCurrent ?? 0) + current
      mfCurrentKnown = true
    }
  }
  const mfToday = sumTodayPnlMF(mutualFunds)

  let otCurrent = null
  let otCurrentKnown = false
  for (const a of otherAssets) {
    if (a.currentValue != null) {
      otCurrent = (otCurrent ?? 0) + a.currentValue
      otCurrentKnown = true
    }
  }

  const computedToday =
    portfolioTodayPnl ??
    sumPortfolioTodayPnl({ indianStocks, usStocks, mutualFunds, usdInr })

  const categories = [
    {
      id: 'indian',
      label: 'Indian stocks',
      count: indianStocks.length,
      current: inCurrentKnown ? inCurrent : null,
      todayPnl: inToday,
      inTotal: inCurrentKnown,
      hint:
        indianStocks.length && !inCurrentKnown
          ? 'Refresh prices'
          : null,
    },
    {
      id: 'us',
      label: 'US stocks',
      count: usStocks.length,
      current: usCurrentKnown ? usCurrentINR : null,
      todayPnl: usToday,
      inTotal: usCurrentKnown,
      hint: !usStocks.length
        ? null
        : !usdInr
          ? 'Set USD/INR'
          : !usCurrentKnown
            ? 'Refresh US prices'
            : null,
    },
    {
      id: 'mf',
      label: 'Mutual funds',
      count: mutualFunds.length,
      current: mfCurrentKnown ? mfCurrent : null,
      todayPnl: mfToday,
      inTotal: mfCurrentKnown,
      hint:
        mutualFunds.length && !mfCurrentKnown
          ? 'Refresh NAV'
          : null,
    },
    {
      id: 'other',
      label: 'Other assets',
      count: otherAssets.length,
      current: otCurrentKnown ? otCurrent : null,
      todayPnl: null,
      inTotal: otCurrentKnown,
      hint: otherAssets.length ? 'Manual value · no day change' : null,
    },
  ]

  const sumCategoryCurrent = categories
    .filter((c) => c.inTotal)
    .reduce((s, c) => s + (c.current ?? 0), 0)

  const sumCategoryToday = categories
    .map((c) => c.todayPnl)
    .filter((v) => v != null)
    .reduce((a, b) => a + b, 0)

  const hasTodayParts = categories.some((c) => c.todayPnl != null)

  let todayPct = null
  if (computedToday != null && grandCurrent != null) {
    const base = grandCurrent - computedToday
    todayPct = base > 0 ? (computedToday / base) * 100 : null
  }

  const grandPnl = grandCurrent != null ? grandCurrent - grandInvested : null
  const grandPnlPct =
    grandPnl != null && grandInvested > 0 ? (grandPnl / grandInvested) * 100 : null

  const excluded = categories.filter((c) => c.count > 0 && !c.inTotal)
  const excludedLabels = excluded.map((c) => c.label)

  return {
    grandCurrent,
    grandInvested,
    grandPnl,
    grandPnlPct,
    portfolioTodayPnl: computedToday,
    portfolioTodayPct: todayPct,
    categories,
    totalsCheck: {
      sumCurrent: sumCategoryCurrent,
      matchesValue: nearEqual(sumCategoryCurrent, grandCurrent),
      sumToday: hasTodayParts ? sumCategoryToday : null,
      matchesToday:
        computedToday == null
          ? true
          : hasTodayParts
            ? nearEqual(sumCategoryToday, computedToday)
            : false,
    },
    excludedNote:
      excludedLabels.length > 0
        ? `${excludedLabels.join(', ')} held but not in total until priced.`
        : null,
  }
}
