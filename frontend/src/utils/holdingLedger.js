import { storage } from './storage'
import { calcIndianStockMetrics, calcUsPnl, calcMfPnl, calcOtherPnl } from './pnl'
import { calcHoldingXirr } from './xirrMetrics'

export const TX_TYPES = ['buy', 'sell', 'dividend', 'bonus', 'split']

export function getTransactionsForHolding(symbol, holdingId, assetType = 'indianStock') {
  return storage
    .getTransactions()
    .filter(
      (t) =>
        t.assetType === assetType &&
        t.symbol === symbol &&
        (!holdingId || t.holdingId === holdingId)
    )
    .sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))
}

/** Parse ratio from split tx notes, e.g. "Split 2:1 applied". */
export function parseSplitRatio(tx) {
  if (tx?.ratio != null && tx.ratio > 0) return tx.ratio
  const m = (tx?.notes || '').match(/split\s+([\d.]+)\s*:\s*1/i)
  if (m) {
    const r = parseFloat(m[1])
    return Number.isFinite(r) && r > 0 ? r : null
  }
  return null
}

function applyTxToQty(qty, tx) {
  if (tx.type === 'buy' || tx.type === 'bonus') return qty + (tx.qty || 0)
  if (tx.type === 'sell') return qty - (tx.qty || 0)
  if (tx.type === 'split') {
    const ratio = parseSplitRatio(tx)
    if (ratio != null && ratio > 0) return qty * ratio
    if (tx.qty != null) return qty + tx.qty
  }
  return qty
}

/** Net quantity from transaction list (date order). */
export function netQtyFromTxList(txList) {
  const sorted = [...txList].sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))
  return sorted.reduce((qty, tx) => applyTxToQty(qty, tx), 0)
}

export function qtyOnDate(transactions, symbol, date) {
  const cutoff = `${date}`.slice(0, 10)
  const relevant = transactions.filter(
    (t) => t.symbol === symbol && `${t.date}`.slice(0, 10) <= cutoff
  )
  return netQtyFromTxList(relevant)
}

export function isEligibleForCorporateAction(transactions, symbol, recordDate) {
  return qtyOnDate(transactions, symbol, recordDate) > 0
}

export function filterByDateRange(rows, fromDate, toDate) {
  if (!fromDate && !toDate) return rows
  return rows.filter((r) => {
    const d = `${r.date}`.slice(0, 10)
    if (fromDate && d < fromDate) return false
    if (toDate && d > toDate) return false
    return true
  })
}

export function txDisplayAmount(tx) {
  if (tx.amount != null && !Number.isNaN(tx.amount)) return tx.amount
  if (tx.qty != null && tx.price != null) return tx.qty * tx.price
  return null
}

export function txTypeLabel(type) {
  return String(type || '').toUpperCase()
}

export function calcSymbolRealized(transactions, symbol) {
  const txs = transactions
    .filter((t) => t.symbol === symbol)
    .sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))

  const lots = { qty: 0, cost: 0 }
  let realized = 0

  for (const tx of txs) {
    if (tx.type === 'buy' && tx.qty != null) {
      lots.qty += tx.qty
      lots.cost += tx.qty * (tx.price || 0)
    } else if (tx.type === 'sell' && tx.qty != null) {
      if (lots.qty <= 0) continue
      const avg = lots.cost / lots.qty
      const sq = Math.min(tx.qty, lots.qty)
      realized += (tx.price - avg) * sq
      lots.qty -= sq
      lots.cost -= avg * sq
    } else if (tx.type === 'dividend') {
      realized += txDisplayAmount(tx) || 0
    }
  }
  return realized
}

export function computeIndianHoldingPnL(stock, transactions) {
  const m = calcIndianStockMetrics(stock)
  const symbolTxs = getTransactionsForHolding(stock.symbol, stock.id)
  const realized = calcSymbolRealized(symbolTxs.length ? symbolTxs : transactions, stock.symbol)
  const xirr = calcHoldingXirr(stock, 'indianStock', transactions)

  return {
    ...m,
    realized,
    totalReturn: m.pnl != null ? m.pnl + realized : null,
    xirr,
  }
}

export function exportLedgerCsv(rows) {
  const header = ['Date', 'Type', 'Quantity', 'Unit Price', 'Amount (Rs.)', 'Charges (Rs.)', 'Notes']
  const lines = [header.join(',')]
  for (const r of rows) {
    const amt = txDisplayAmount(r)
    lines.push(
      [
        r.date,
        txTypeLabel(r.type),
        r.qty != null ? r.qty : '',
        r.price != null ? r.price : '',
        amt != null ? amt : '',
        r.charges != null ? r.charges : '',
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    )
  }
  return lines.join('\n')
}

export function downloadLedgerCsv(rows, filename) {
  const csv = exportLedgerCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildDividendSuggestions(apiData, transactions, symbol) {
  if (!apiData?.dividends?.length) return []
  return apiData.dividends.map((d) => {
    const eligible = isEligibleForCorporateAction(transactions, symbol, d.date)
    const perShare = d.amount
    const qty = qtyOnDate(transactions, symbol, d.date)
    const total = qty > 0 ? perShare * qty : null
    return {
      id: `suggest-div-${d.date}`,
      suggested: true,
      type: 'dividend',
      date: d.date,
      price: perShare,
      amount: total,
      qty: null,
      charges: 0,
      notes: `Rs.${perShare} per share`,
      eligible,
    }
  })
}

export function computeUSHoldingPnL(stock, transactions, usdInr = null) {
  const { investedUSD, currentUSD, pnlUSD, pnlPct } = calcUsPnl(stock)
  const symbolTxs = getTransactionsForHolding(stock.symbol, stock.id, 'usStock')
  const realized = calcSymbolRealized(symbolTxs.length ? symbolTxs : transactions, stock.symbol)
  const xirr = calcHoldingXirr(stock, 'usStock', transactions, { usdInr })

  return {
    invested: investedUSD,
    current: currentUSD,
    pnl: pnlUSD,
    pnlPct,
    realized,
    totalReturn: pnlUSD != null ? pnlUSD + realized : null,
    todayPnl: stock.dayChange != null && stock.qty != null ? stock.dayChange * stock.qty : null,
    xirr,
  }
}

export function computeMFHoldingPnL(fund, transactions) {
  const { invested, current, pnl, pnlPct } = calcMfPnl(fund)
  const symbolTxs = getTransactionsForHolding(fund.schemeName, fund.id, 'mutualFund')
  const realized = calcSymbolRealized(symbolTxs.length ? symbolTxs : transactions, fund.schemeName)
  const xirr = calcHoldingXirr(fund, 'mutualFund', transactions)

  const prevNAV = fund.prevNAV ?? fund.currentNAV
  const todayPnl =
    prevNAV != null && fund.currentNAV != null && fund.units != null
      ? (fund.currentNAV - prevNAV) * fund.units
      : null

  return {
    invested,
    current,
    pnl,
    pnlPct,
    realized,
    totalReturn: pnl != null ? pnl + realized : null,
    todayPnl,
    xirr,
  }
}

export function computeOtherAssetPnL(asset, transactions) {
  const { pnl, pnlPct } = calcOtherPnl(asset)
  const symbolTxs = getTransactionsForHolding(asset.name, asset.id, 'otherAsset')
  const realized = calcSymbolRealized(symbolTxs.length ? symbolTxs : transactions, asset.name)

  return {
    invested: asset.investedAmount,
    current: asset.currentValue,
    pnl,
    pnlPct,
    realized,
    totalReturn: pnl != null ? pnl + realized : null,
    todayPnl: null,
    xirr: null,
  }
}
