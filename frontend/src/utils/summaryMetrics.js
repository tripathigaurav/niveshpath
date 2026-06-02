import { formatINR, formatChange, formatPct } from './formatters'
import { pnlColorClass, sumTodayPnl } from './pnl'
/** @typedef {'indianStock'|'usStock'|'mutualFund'} AssetType */

/**
 * Realized P&L from sell transactions (avg-cost basis per symbol).
 * Sells logged at cost basis today yield ₹0 until sell price reflects market.
 */
export function calcRealizedGain(transactions, assetType) {
  const txs = (transactions || [])
    .filter((t) => t.assetType === assetType)
    .sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))

  const lots = {}
  let realized = 0

  for (const tx of txs) {
    const key = tx.symbol
    if (!lots[key]) lots[key] = { qty: 0, cost: 0 }
    const lot = lots[key]

    if (tx.type === 'buy') {
      lot.qty += tx.qty
      lot.cost += tx.qty * tx.price
      continue
    }

    if (lot.qty <= 0) continue
    const avgCost = lot.cost / lot.qty
    const sellQty = Math.min(tx.qty, lot.qty)
    realized += (tx.price - avgCost) * sellQty
    lot.qty -= sellQty
    lot.cost -= avgCost * sellQty
  }

  return realized
}

export function calcMfTodayPnl(fund) {
  if (
    fund.currentNAV == null ||
    fund.previousNAV == null ||
    fund.units == null
  ) {
    return null
  }
  return fund.units * (fund.currentNAV - fund.previousNAV)
}

export function sumMfTodayPnl(funds) {
  let sum = 0
  let hasAny = false
  for (const f of funds) {
    const today = calcMfTodayPnl(f)
    if (today != null) {
      sum += today
      hasAny = true
    }
  }
  return hasAny ? sum : null
}

function pnlMetric(label, value, { sub, pulse = false } = {}) {
  const colorClass = value != null ? pnlColorClass(value) : ''
  const accent =
    value == null ? null : value > 0 ? 'gain' : value < 0 ? 'loss' : null
  return {
    label,
    value: value != null ? formatINR(value, true) : '—',
    sub: sub ?? (value != null ? formatChange(value) : null),
    colorClass,
    accent,
    pulse,
  }
}

/**
 * Standard holdings summary (Groww-style order & labels).
 * Current Value → Investments → Today's Gain/Loss → Notional → Realized
 */
export function buildHoldingsSummaryMetrics({
  totalCurrent,
  totalInvested,
  todayPnl,
  totalPnl,
  totalPnlPct,
  realizedPnl,
  pulsing = false,
  currentSubHint = null,
}) {
  const notionalSub =
    totalPnl != null
      ? `${formatChange(totalPnl)} (${formatPct(totalPnlPct)})`
      : null

  return [
    {
      label: 'Current Value',
      value: totalCurrent != null ? formatINR(totalCurrent, true) : '—',
      sub: totalCurrent != null ? formatINR(totalCurrent) : currentSubHint,
    },
    {
      label: 'Investments',
      value: formatINR(totalInvested, true),
      sub: formatINR(totalInvested),
    },
    pnlMetric("Today's Gain/Loss", todayPnl),
    {
      label: 'Notional Gain/Loss',
      value: totalPnl != null ? formatINR(totalPnl, true) : '—',
      sub: notionalSub,
      colorClass: totalPnl != null ? pnlColorClass(totalPnl) : '',
      accent:
        totalPnl != null ? (totalPnl >= 0 ? 'gain' : 'loss') : null,
      pulse: pulsing,
    },
    pnlMetric('Total Realized Gain/Loss', realizedPnl, {
      sub: realizedPnl != null ? formatINR(realizedPnl) : null,
    }),
  ]
}

export { sumTodayPnl }
