import { v4 as uuidv4 } from 'uuid'
import { storage } from './storage'

/**
 * @typedef {'buy'|'sell'} TxType
 * @typedef {'indianStock'|'usStock'|'mutualFund'} AssetType
 */

export function logTransaction({ type, assetType, symbol, name, qty, price, date, holdingId }) {
  const tx = {
    id: uuidv4(),
    type,
    assetType,
    symbol: String(symbol),
    name: name || '',
    qty: parseFloat(qty),
    price: parseFloat(price),
    date: date || new Date().toISOString().split('T')[0],
    holdingId,
    recordedAt: new Date().toISOString(),
  }
  storage.setTransactions([...storage.getTransactions(), tx])
  return tx
}

export function logBuy(params) {
  return logTransaction({ ...params, type: 'buy' })
}

export function logSell(params) {
  return logTransaction({ ...params, type: 'sell' })
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
