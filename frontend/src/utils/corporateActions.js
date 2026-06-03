import { api } from './api'
import { storage } from './storage'
import { logAudit } from './auditTrail'
import { logBonus, logTransaction } from './transactions'
import { isEligibleForCorporateAction } from './holdingLedger'
import { normalizeIndianHolding } from './indianHoldings'

const APPLIED_KEY = 'pt_appliedCorpActions'
const SKIPPED_KEY = 'pt_skippedCorpActions'

function getApplied() {
  try {
    return JSON.parse(localStorage.getItem(APPLIED_KEY) || '[]')
  } catch {
    return []
  }
}

function getSkipped() {
  try {
    return JSON.parse(localStorage.getItem(SKIPPED_KEY) || '[]')
  } catch {
    return []
  }
}

function markApplied(id) {
  const list = getApplied()
  if (!list.includes(id)) {
    localStorage.setItem(APPLIED_KEY, JSON.stringify([...list, id]))
  }
}

function markSkipped(id) {
  const list = getSkipped()
  if (!list.includes(id)) {
    localStorage.setItem(SKIPPED_KEY, JSON.stringify([...list, id]))
  }
}

function actionId(symbol, type, date) {
  return `${symbol}:${type}:${date}`
}

export function isActionApplied(symbol, type, date) {
  return getApplied().includes(actionId(symbol, type, date))
}

export function isActionSkipped(symbol, type, date) {
  return getSkipped().includes(actionId(symbol, type, date))
}

function isDismissed(symbol, type, date) {
  const id = actionId(symbol, type, date)
  return getApplied().includes(id) || getSkipped().includes(id)
}

/**
 * Pending splits/bonuses for Indian holdings.
 */
export async function fetchPendingCorporateActions(holdings) {
  const pending = []
  const transactions = storage.getTransactions()

  for (const holding of holdings) {
    try {
      const data = await api.getStockActions(holding.symbol)
      const symbol = holding.symbol

      for (const split of data.splits || []) {
        const id = actionId(symbol, 'split', split.date)
        if (isDismissed(symbol, 'split', split.date)) continue
        if (!isEligibleForCorporateAction(transactions, symbol, split.date)) continue
        const ratio = split.ratio
        if (!ratio || ratio <= 0) continue
        pending.push({
          id,
          type: 'split',
          symbol,
          name: holding.name,
          holdingId: holding.id,
          date: split.date,
          ratio,
          detail: `Split ratio ${ratio}:1`,
        })
      }

      // Yahoo dividends handled via suggestions; bonus detection limited without dedicated API
    } catch {
      /* skip symbol */
    }
  }

  return pending.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Apply stock split: qty *= ratio, buyPrice /= ratio
 */
export function applySplit(holding, action) {
  const ratio = action.ratio
  if (!ratio || ratio <= 0) return false

  const stocks = storage.getIndianStocks()
  const before = stocks.find((s) => s.id === holding.id)
  const updated = stocks.map((s) => {
    if (s.id !== holding.id) return s
    return normalizeIndianHolding({
      ...s,
      qty: s.qty * ratio,
      buyPrice: s.buyPrice / ratio,
    })
  })
  storage.setIndianStocks(updated)

  logTransaction({
    type: 'split',
    assetType: 'indianStock',
    symbol: holding.symbol,
    name: holding.name,
    qty: holding.qty * (ratio - 1),
    price: null,
    date: action.date,
    holdingId: holding.id,
    notes: `Split ${ratio}:1 applied`,
    ratio,
  })

  markApplied(actionId(holding.symbol, 'split', action.date))
  logAudit('apply_action', 'corporate_action', action.id, before, { type: 'split', ratio })
  return true
}

/**
 * Apply bonus shares (ratio = bonus shares per held share, e.g. 1:1 bonus → ratio 1)
 */
export function applyBonus(holding, action) {
  const ratio = action.ratio ?? 1
  const bonusQty = holding.qty * ratio
  if (bonusQty <= 0) return false

  const stocks = storage.getIndianStocks()
  const before = stocks.find((s) => s.id === holding.id)
  const updated = stocks.map((s) => {
    if (s.id !== holding.id) return s
    const newQty = s.qty + bonusQty
    const avgPrice = (s.buyPrice * s.qty) / newQty
    return normalizeIndianHolding({
      ...s,
      qty: newQty,
      buyPrice: avgPrice,
    })
  })
  storage.setIndianStocks(updated)

  logBonus({
    assetType: 'indianStock',
    symbol: holding.symbol,
    name: holding.name,
    qty: bonusQty,
    date: action.date,
    holdingId: holding.id,
    notes: action.detail || `Bonus ${ratio}:1`,
  })

  markApplied(actionId(holding.symbol, 'bonus', action.date))
  logAudit('apply_action', 'corporate_action', action.id, before, { type: 'bonus', bonusQty })
  return true
}

export function applyCorporateAction(holding, action) {
  if (action.type === 'split') return applySplit(holding, action)
  if (action.type === 'bonus') return applyBonus(holding, action)
  return false
}

/** Dismiss without changing holdings (won't prompt again). */
export function skipCorporateAction(action) {
  markSkipped(action.id)
  logAudit('skip', 'corporate_action', action.id, null, {
    symbol: action.symbol,
    type: action.type,
    date: action.date,
  })
  return true
}

export function describeCorporateActionConfirm(action, holding) {
  const qty = holding?.qty ?? 0
  const price = holding?.buyPrice ?? 0
  if (action.type === 'split' && action.ratio) {
    const r = action.ratio
    return {
      applyTitle: `Apply ${action.symbol} split?`,
      applyMessage: `${action.detail} (effective ${action.date}). Your holding will update from ${qty} shares @ ${price.toLocaleString('en-IN')} to ${(qty * r).toLocaleString('en-IN')} shares @ ${(price / r).toLocaleString('en-IN')} avg.`,
      skipTitle: `Skip ${action.symbol} split?`,
      skipMessage: `${action.detail} on ${action.date} will be dismissed. Holdings stay unchanged. This won't show again unless you clear skipped actions in browser data.`,
    }
  }
  return {
    applyTitle: `Apply ${action.symbol} ${action.type}?`,
    applyMessage: `${action.detail} on ${action.date}. Holdings and transaction log will be updated.`,
    skipTitle: `Skip ${action.symbol} ${action.type}?`,
    skipMessage: `${action.detail} on ${action.date} will be dismissed. Holdings stay unchanged.`,
  }
}
