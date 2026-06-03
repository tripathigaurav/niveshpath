/**
 * Portfolio value history from holdings + transaction ledger (not synthetic demo curves).
 */

function isoDate(d) {
  return `${d}`.slice(0, 10)
}

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function costBasisOnDate(transactions, assetType, date) {
  const cutoff = isoDate(date)
  const bySymbol = new Map()
  const sorted = transactions
    .filter((t) => t.assetType === assetType)
    .filter((t) => isoDate(t.date) <= cutoff)
    .sort((a, b) => isoDate(a.date).localeCompare(isoDate(b.date)))

  for (const tx of sorted) {
    const sym = tx.symbol
    let lot = bySymbol.get(sym) || { qty: 0, cost: 0 }
    if (tx.type === 'buy' && tx.qty != null) {
      lot.qty += tx.qty
      lot.cost += tx.qty * (tx.price || 0)
    } else if (tx.type === 'sell' && tx.qty != null) {
      if (lot.qty <= 0) continue
      const avg = lot.cost / lot.qty
      const sq = Math.min(tx.qty, lot.qty)
      lot.qty -= sq
      lot.cost -= avg * sq
    } else if (tx.type === 'bonus' && tx.qty != null) {
      lot.qty += tx.qty
    }
    bySymbol.set(sym, lot)
  }
  return [...bySymbol.values()].reduce((s, l) => s + l.cost, 0)
}

function otherAssetsValueOnDate(assets, date) {
  const cutoff = isoDate(date)
  let sum = 0
  for (const a of assets) {
    const added = isoDate(a.buyDate || a.purchaseDate || '1970-01-01')
    if (added > cutoff) continue
    sum += a.currentValue ?? a.investedAmount ?? 0
  }
  return sum
}

function investedOnDate(date, { transactions, otherAssets, usdInr }) {
  const inr = usdInr || 83
  const indian = costBasisOnDate(transactions, 'indianStock', date)
  const us = costBasisOnDate(transactions, 'usStock', date) * inr
  const mf = costBasisOnDate(transactions, 'mutualFund', date)
  const other = otherAssetsValueOnDate(otherAssets, date)
  return indian + us + mf + other
}

function collectEventDates({
  transactions,
  indianStocks,
  usStocks,
  mutualFunds,
  otherAssets,
}) {
  const dates = new Set()
  const today = new Date().toISOString().slice(0, 10)
  dates.add(today)

  for (const tx of transactions) {
    if (tx.date) dates.add(isoDate(tx.date))
  }
  for (const a of otherAssets) {
    const d = a.buyDate || a.purchaseDate
    if (d) dates.add(isoDate(d))
  }
  if (!transactions.length) {
    for (const s of indianStocks) {
      if (s.buyDate) dates.add(isoDate(s.buyDate))
    }
    for (const s of usStocks) {
      if (s.buyDate) dates.add(isoDate(s.buyDate))
    }
    for (const f of mutualFunds) {
      if (f.buyDate) dates.add(isoDate(f.buyDate))
    }
  }
  return [...dates].sort()
}

function expandToDaily(eventPoints) {
  if (!eventPoints.length) return []
  const out = []
  let idx = 0
  const end = eventPoints[eventPoints.length - 1].date
  let d = eventPoints[0].date
  while (d <= end) {
    while (idx < eventPoints.length - 1 && eventPoints[idx + 1].date <= d) idx++
    out.push({
      date: d,
      value: eventPoints[idx].value,
      source: 'ledger',
    })
    if (d === end) break
    d = addDays(d, 1)
  }
  return out
}

/**
 * Build daily portfolio value series from buys/sells/removals and manual assets.
 * Historical points scale invested cost to today's live value ratio when provided.
 *
 * @returns {{ date: string, value: number, source?: string }[]}
 */
export function buildPortfolioHistoryFromLedger({
  transactions = [],
  indianStocks = [],
  usStocks = [],
  mutualFunds = [],
  otherAssets = [],
  usdInr = null,
  liveCurrentValue = null,
  liveInvestedValue = null,
}) {
  const eventDates = collectEventDates({
    transactions,
    indianStocks,
    usStocks,
    mutualFunds,
    otherAssets,
  })
  if (!eventDates.length) return []

  const eventPoints = eventDates.map((date) => ({
    date,
    value: investedOnDate(date, { transactions, otherAssets, usdInr }),
  }))

  let points = expandToDaily(eventPoints)

  if (liveInvestedValue != null && liveInvestedValue > 0 && liveCurrentValue != null) {
    const scale = liveCurrentValue / liveInvestedValue
    points = points.map((p) => ({
      ...p,
      value: Math.round(p.value * scale * 100) / 100,
      source: 'ledger',
    }))
    const last = points[points.length - 1]
    if (last) last.value = Math.round(liveCurrentValue * 100) / 100
  } else if (liveCurrentValue != null && points.length) {
    points[points.length - 1].value = Math.round(liveCurrentValue * 100) / 100
  }

  return points
}

export function snapshotsLookUnreliable(snapshots, liveCurrentValue) {
  if (!snapshots?.length || liveCurrentValue == null || liveCurrentValue <= 0) {
    return false
  }
  if (snapshots.some((s) => s.demo)) return true
  if (snapshots.length < 2) return false
  const prev = snapshots[snapshots.length - 2]
  const last = snapshots[snapshots.length - 1]
  const today = new Date().toISOString().slice(0, 10)
  if (last.date !== today) return false
  const drift = Math.abs(prev.value - liveCurrentValue) / liveCurrentValue
  return drift > 0.25
}

/**
 * Prefer real daily snapshots; fall back to ledger when demo/stale.
 */
export function resolvePortfolioChartPoints(snapshots, ledgerPoints, liveCurrentValue = null) {
  const realOnly = (snapshots || []).filter((s) => !s.demo)
  const live = liveCurrentValue ?? ledgerPoints[ledgerPoints.length - 1]?.value
  if (realOnly.length >= 2 && !snapshotsLookUnreliable(snapshots, live)) {
    return realOnly.map(({ date, value }) => ({ date, value, source: 'snapshot' }))
  }
  return ledgerPoints
}
