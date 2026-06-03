import { storage } from './storage'

/** Tax rules — FY 2024-25 style (not tax advice). */
export const TAX_RULES = {
  equity: {
    ltcgThresholdDays: 365,
    ltcgRate: 0.1,
    ltcgExemption: 100000,
    stcgRate: 0.15,
    grandfatheringDate: '2018-01-31',
  },
}

export function daysBetween(dateA, dateB) {
  const a = new Date(`${dateA}T12:00:00`)
  const b = new Date(`${dateB}T12:00:00`)
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

function fifoLots(buys) {
  return buys.map((b) => ({ ...b, remaining: b.qty }))
}

function consumeLots(lots, sellQty) {
  let left = sellQty
  const consumed = []
  for (const lot of lots) {
    if (left <= 0) break
    if (lot.remaining <= 0) continue
    const take = Math.min(lot.remaining, left)
    consumed.push({ ...lot, qty: take, price: lot.price, date: lot.date })
    lot.remaining -= take
    left -= take
  }
  return consumed
}

/**
 * Realized gains from sell transactions (Indian equities).
 * @param {object} options
 * @param {number} [options.fyStartYear] — e.g. 2024 for FY 2024-25 (Apr 2024 – Mar 2025)
 */
export function calculateEquityTaxReport(options = {}) {
  const { fyStartYear } = options
  const transactions = storage
    .getTransactions()
    .filter((t) => t.assetType === 'indianStock')
    .sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))

  const fyStart = fyStartYear != null ? `${fyStartYear}-04-01` : null
  const fyEnd = fyStartYear != null ? `${fyStartYear + 1}-03-31` : null

  const lotsBySymbol = {}
  const rows = []
  let totalStcg = 0
  let totalLtcg = 0

  for (const tx of transactions) {
    const sym = tx.symbol
    if (!lotsBySymbol[sym]) lotsBySymbol[sym] = fifoLots([])

    if (tx.type === 'buy' && tx.qty > 0) {
      lotsBySymbol[sym].push({ qty: tx.qty, price: tx.price || 0, date: tx.date })
    } else if (tx.type === 'bonus' && tx.qty > 0) {
      lotsBySymbol[sym].push({ qty: tx.qty, price: 0, date: tx.date })
    } else if (tx.type === 'sell' && tx.qty > 0) {
      if (fyStart && (tx.date < fyStart || tx.date > fyEnd)) continue

      const consumed = consumeLots(lotsBySymbol[sym], tx.qty)
      const saleValue = tx.qty * (tx.price || 0)
      let costBasis = 0
      let weightedDays = 0
      let totalConsumed = 0

      for (const lot of consumed) {
        costBasis += lot.qty * lot.price
        weightedDays += daysBetween(lot.date, tx.date) * lot.qty
        totalConsumed += lot.qty
      }

      const avgHoldingDays = totalConsumed > 0 ? weightedDays / totalConsumed : 0
      const isLongTerm = avgHoldingDays >= TAX_RULES.equity.ltcgThresholdDays
      const gain = saleValue - costBasis
      const taxType = isLongTerm ? 'LTCG' : 'STCG'
      const taxRate = isLongTerm ? TAX_RULES.equity.ltcgRate : TAX_RULES.equity.stcgRate
      let taxDue = gain > 0 ? gain * taxRate : 0

      if (isLongTerm) totalLtcg += gain
      else totalStcg += gain

      rows.push({
        saleDate: tx.date,
        symbol: sym,
        name: tx.name,
        qty: tx.qty,
        salePrice: tx.price,
        costBasis,
        proceeds: saleValue,
        gain,
        holdingDays: Math.round(avgHoldingDays),
        taxType,
        taxRate,
        taxDue,
      })
    }
  }

  const ltcgTaxable = Math.max(0, totalLtcg - TAX_RULES.equity.ltcgExemption)
  const estimatedTax =
    Math.max(0, totalStcg) * TAX_RULES.equity.stcgRate +
    ltcgTaxable * TAX_RULES.equity.ltcgRate

  return {
    rows,
    summary: {
      totalStcg,
      totalLtcg,
      ltcgExemption: TAX_RULES.equity.ltcgExemption,
      ltcgTaxable,
      estimatedTax,
      saleCount: rows.length,
    },
    disclaimer:
      'Tax calculations use FIFO and rules as of FY 2024-25. This is not tax advice — consult a CA.',
  }
}

export function getAvailableFinancialYears() {
  const txs = storage.getTransactions().filter((t) => t.type === 'sell' && t.assetType === 'indianStock')
  const years = new Set()
  for (const tx of txs) {
    const y = parseInt(`${tx.date}`.slice(0, 4), 10)
    const m = parseInt(`${tx.date}`.slice(5, 7), 10)
    years.add(m >= 4 ? y : y - 1)
  }
  const current = new Date()
  const cy = current.getMonth() >= 3 ? current.getFullYear() : current.getFullYear() - 1
  years.add(cy)
  return [...years].sort((a, b) => b - a)
}
