import { v4 as uuidv4 } from 'uuid'
import { storage } from './storage'
import { logAudit } from './auditTrail'
import { notifyDataChanged } from '../hooks/useNotifications'

/**
 * @typedef {'buy'|'sell'|'dividend'|'bonus'|'split'} TxType
 * @typedef {'indianStock'|'usStock'|'mutualFund'} AssetType
 */

export function logTransaction({
  type,
  assetType,
  symbol,
  name,
  qty,
  price,
  amount,
  charges,
  notes,
  date,
  holdingId,
  ratio,
}) {
  const tx = {
    id: uuidv4(),
    type,
    assetType,
    symbol: String(symbol),
    name: name || '',
    qty: qty != null && qty !== '' && !Number.isNaN(parseFloat(qty)) ? parseFloat(qty) : null,
    price:
      price != null && price !== '' && !Number.isNaN(parseFloat(price)) ? parseFloat(price) : null,
    amount:
      amount != null && amount !== '' && !Number.isNaN(parseFloat(amount))
        ? parseFloat(amount)
        : null,
    charges:
      charges != null && charges !== '' && !Number.isNaN(parseFloat(charges))
        ? parseFloat(charges)
        : 0,
    notes: notes || '',
    date: date || new Date().toISOString().split('T')[0],
    holdingId,
    recordedAt: new Date().toISOString(),
  }
  if (type === 'split' && ratio != null && !Number.isNaN(parseFloat(ratio))) {
    tx.ratio = parseFloat(ratio)
  }

  if (tx.amount == null && tx.qty != null && tx.price != null) {
    tx.amount = tx.qty * tx.price
  }

  storage.setTransactions([...storage.getTransactions(), tx])
  logAudit('create', 'transaction', tx.id, null, tx)
  notifyDataChanged()
  return tx
}

export function updateTransaction(id, patch) {
  const all = storage.getTransactions()
  const before = all.find((t) => t.id === id)
  const next = all.map((t) => {
    if (t.id !== id) return t
    const merged = { ...t, ...patch }
    if (merged.amount == null && merged.qty != null && merged.price != null) {
      merged.amount = merged.qty * merged.price
    }
    return merged
  })
  storage.setTransactions(next)
  const after = next.find((t) => t.id === id)
  if (before) logAudit('update', 'transaction', id, before, after)
  notifyDataChanged()
  return after
}

export function deleteTransaction(id) {
  const before = storage.getTransactions().find((t) => t.id === id)
  storage.setTransactions(storage.getTransactions().filter((t) => t.id !== id))
  if (before) logAudit('delete', 'transaction', id, before, null)
  notifyDataChanged()
}

export function deleteTransactions(ids) {
  const set = new Set(ids)
  storage.setTransactions(storage.getTransactions().filter((t) => !set.has(t.id)))
}

export function logBuy(params) {
  return logTransaction({ ...params, type: 'buy' })
}

export function logSell(params) {
  return logTransaction({ ...params, type: 'sell' })
}

export function logDividend(params) {
  return logTransaction({ ...params, type: 'dividend', qty: null })
}

export function logBonus(params) {
  return logTransaction({ ...params, type: 'bonus', price: null, amount: null })
}

/** One-time migration: create buy rows from existing holdings when log is empty. */
export function backfillTransactionsFromHoldings() {
  if (storage.getTransactions().length > 0) return 0

  const txs = []
  const pushBuy = (assetType, item, symbolKey, priceKey, qtyKey, nameKey) => {
    txs.push({
      id: uuidv4(),
      type: 'buy',
      assetType,
      symbol: String(item[symbolKey]),
      name: item[nameKey] || '',
      qty: item[qtyKey],
      price: item[priceKey],
      amount: item[qtyKey] * item[priceKey],
      charges: 0,
      notes: '',
      date: item.buyDate || new Date().toISOString().split('T')[0],
      holdingId: item.id,
      recordedAt: new Date().toISOString(),
    })
  }

  for (const s of storage.getIndianStocks()) {
    pushBuy('indianStock', s, 'symbol', 'buyPrice', 'qty', 'name')
  }
  for (const s of storage.getUSStocks()) {
    pushBuy('usStock', s, 'symbol', 'buyPrice', 'qty', 'name')
  }
  for (const f of storage.getMutualFunds()) {
    pushBuy('mutualFund', f, 'schemeCode', 'buyNAV', 'units', 'schemeName')
  }

  if (txs.length) storage.setTransactions(txs)
  return txs.length
}
