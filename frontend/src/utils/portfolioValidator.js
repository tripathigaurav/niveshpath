import { storage } from './storage'
import { netQtyFromTxList } from './holdingLedger'

function netQtyFromTransactions(transactions, assetType, symbol) {
  return netQtyFromTxList(
    transactions.filter((t) => t.assetType === assetType && t.symbol === symbol)
  )
}

/**
 * @returns {{ healthy: boolean, issues: object[], summary: { errors: number, warnings: number } }}
 */
export function validatePortfolioIntegrity() {
  const transactions = storage.getTransactions()
  const indianStocks = storage.getIndianStocks()
  const usStocks = storage.getUSStocks()
  const mutualFunds = storage.getMutualFunds()
  const issues = []

  const checkQuantity = (holdings, assetType, symbolKey, qtyKey) => {
    const symbolGroups = new Map()
    for (const holding of holdings) {
      const symbol = holding[symbolKey]
      if (!symbolGroups.has(symbol)) symbolGroups.set(symbol, [])
      symbolGroups.get(symbol).push(holding)
    }

    for (const [symbol, group] of symbolGroups) {
      const ledgerQty = netQtyFromTransactions(transactions, assetType, symbol)
      const totalHoldingQty = group.reduce((s, h) => s + (h[qtyKey] || 0), 0)

      // Per-lot check when transactions are linked to a specific holding (e.g. two AAPL rows)
      let perLotOk = true
      for (const holding of group) {
        const linkedTxs = transactions.filter(
          (t) => t.assetType === assetType && t.holdingId === holding.id
        )
        if (!linkedTxs.length) continue
        const lotLedger = netQtyFromTxList(linkedTxs)
        const lotQty = holding[qtyKey] || 0
        if (Math.abs(lotQty - lotLedger) > 0.01) {
          perLotOk = false
          const label = holding.name && holding.name !== symbol ? `${symbol} (${holding.name})` : symbol
          issues.push({
            severity: 'error',
            type: 'quantity_mismatch',
            symbol: label,
            category: assetType,
            expected: lotLedger,
            actual: lotQty,
            diff: Math.abs(lotQty - lotLedger),
            fix: () => {
              const updated = holdings.map((h) =>
                h.id === holding.id ? { ...h, [qtyKey]: lotLedger } : h
              )
              if (assetType === 'indianStock') storage.setIndianStocks(updated)
              else if (assetType === 'usStock') storage.setUSStocks(updated)
              else if (assetType === 'mutualFund') storage.setMutualFunds(updated)
            },
          })
        }
      }

      // Symbol total: sum of all lots must match ledger (skip if per-lot already flagged)
      const aggregateDiff = Math.abs(totalHoldingQty - ledgerQty)
      if (aggregateDiff > 0.01 && group.length === 1) {
        const holding = group[0]
        issues.push({
          severity: 'error',
          type: 'quantity_mismatch',
          symbol,
          category: assetType,
          expected: ledgerQty,
          actual: totalHoldingQty,
          diff: aggregateDiff,
          fix: () => {
            const updated = holdings.map((h) =>
              h.id === holding.id ? { ...h, [qtyKey]: ledgerQty } : h
            )
            if (assetType === 'indianStock') storage.setIndianStocks(updated)
            else if (assetType === 'usStock') storage.setUSStocks(updated)
            else if (assetType === 'mutualFund') storage.setMutualFunds(updated)
          },
        })
      } else if (aggregateDiff > 0.01 && group.length > 1 && perLotOk) {
        issues.push({
          severity: 'error',
          type: 'quantity_mismatch_aggregate',
          symbol,
          category: assetType,
          expected: ledgerQty,
          actual: totalHoldingQty,
          diff: aggregateDiff,
          message: `${symbol}: total across ${group.length} lots is ${totalHoldingQty}, ledger says ${ledgerQty}`,
        })
      }
    }
  }

  checkQuantity(indianStocks, 'indianStock', 'symbol', 'qty')
  checkQuantity(usStocks, 'usStock', 'symbol', 'qty')
  checkQuantity(mutualFunds, 'mutualFund', 'schemeCode', 'units')

  const allHoldingIds = new Set([
    ...indianStocks.map((h) => h.id),
    ...usStocks.map((h) => h.id),
    ...mutualFunds.map((h) => h.id),
  ])

  for (const tx of transactions) {
    if (tx.holdingId && !allHoldingIds.has(tx.holdingId)) {
      issues.push({
        severity: 'warning',
        type: 'orphaned_transaction',
        transactionId: tx.id,
        symbol: tx.symbol,
        holdingId: tx.holdingId,
        fix: () => {
          storage.setTransactions(
            storage.getTransactions().map((t) =>
              t.id === tx.id ? { ...t, holdingId: null } : t
            )
          )
        },
      })
    }
  }

  const sortedTx = [...transactions].sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))
  const runningByKey = new Map()
  for (const tx of sortedTx) {
    const key = `${tx.assetType}:${tx.symbol}`
    if (!runningByKey.has(key)) runningByKey.set(key, [])
    const list = runningByKey.get(key)
    list.push(tx)
    const qty = netQtyFromTxList(list)
    if (qty < -0.01) {
      issues.push({
        severity: 'error',
        type: 'negative_quantity',
        symbol: tx.symbol,
        date: tx.date,
        quantity: qty,
        transactionId: tx.id,
      })
    }
  }

  const checkDates = (holdings, symbolKey) => {
    for (const holding of holdings) {
      if (!holding.buyDate) {
        issues.push({
          severity: 'warning',
          type: 'missing_buy_date',
          symbol: holding[symbolKey],
          holdingId: holding.id,
        })
      }
    }
  }

  checkDates(indianStocks, 'symbol')
  checkDates(usStocks, 'symbol')
  checkDates(mutualFunds, 'schemeCode')

  if (transactions.length === 0 && (indianStocks.length + usStocks.length + mutualFunds.length) > 0) {
    issues.push({
      severity: 'warning',
      type: 'empty_transaction_log',
      message: 'Holdings exist but transaction log is empty — run backfill or add transactions',
    })
  }

  return {
    healthy: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    summary: {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
    },
  }
}

export function autoFixIssues(issues) {
  let fixed = 0
  for (const issue of issues) {
    if (!issue.fix) continue
    try {
      issue.fix()
      fixed++
    } catch (err) {
      console.error('[portfolioValidator] Auto-fix failed:', issue, err)
    }
  }
  return fixed
}
