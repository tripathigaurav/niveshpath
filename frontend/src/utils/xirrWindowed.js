import { api } from './api'
import { calcXirr } from './xirr'
import { calcIndianStockMetrics, calcUsPnl, calcMfPnl } from './pnl'
import { calcHoldingXirr } from './xirrMetrics'
import { qtyOnDate } from './holdingLedger'
import { getHistoricalPrice, putHistoricalPrice } from './priceCache'
import { indianSymbolForExchange } from './indianExchange'

const TODAY = () => new Date().toISOString().slice(0, 10)

function isoDate(d) {
  return `${d}`.slice(0, 10)
}

function addDaysFromToday(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function getXirrWindowStartDates() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const fyStartYear = month >= 4 ? year : year - 1
  return {
    irr90: addDaysFromToday(90),
    irr365: addDaysFromToday(365),
    irrSinceApr: `${fyStartYear}-04-01`,
  }
}

function holdingSymbol(holding, assetType) {
  if (assetType === 'mutualFund') return String(holding.schemeCode)
  return holding.symbol
}

function terminalValueForHolding(holding, assetType, usdInr) {
  if (assetType === 'indianStock') {
    return calcIndianStockMetrics(holding).current
  }
  if (assetType === 'usStock') {
    const { currentUSD } = calcUsPnl(holding)
    if (currentUSD == null) return null
    return usdInr ? currentUSD * usdInr : currentUSD
  }
  if (assetType === 'mutualFund') {
    return calcMfPnl(holding).current
  }
  return null
}

function txsForSymbol(transactions, symbol, assetType) {
  return transactions.filter((t) => t.assetType === assetType && t.symbol === symbol)
}

function txFlow(tx, mult = 1) {
  const amt = (tx.qty || 0) * (tx.price || 0) * mult
  return { date: isoDate(tx.date), amount: tx.type === 'buy' ? -amt : amt }
}

/**
 * Windowed XIRR using market value at window start.
 * @param {number|null} priceAtStart — LTP/NAV at windowStartDate (same currency as terminal)
 */
export function calcWindowedXirr(holding, assetType, transactions, windowStartDate, priceAtStart, { usdInr } = {}) {
  if (!holding || !transactions?.length || !windowStartDate) return null

  const symbol = holdingSymbol(holding, assetType)
  const mult = assetType === 'usStock' && usdInr ? usdInr : 1
  const terminal = terminalValueForHolding(holding, assetType, usdInr)
  if (terminal == null || terminal <= 0) return null

  const start = isoDate(windowStartDate)
  const symbolTxs = txsForSymbol(transactions, symbol, assetType)
  const openingQty = qtyOnDate(
    symbolTxs.filter((t) => t.assetType === assetType),
    symbol,
    start
  )

  const flows = []

  if (openingQty > 0) {
    if (priceAtStart == null || priceAtStart <= 0) return null
    flows.push({ date: start, amount: -(openingQty * priceAtStart * mult) })
  }

  for (const tx of symbolTxs) {
    if (isoDate(tx.date) <= start) continue
    if (tx.type !== 'buy' && tx.type !== 'sell') continue
    if (tx.qty == null || tx.price == null) continue
    flows.push(txFlow(tx, mult))
  }

  flows.push({ date: TODAY(), amount: terminal })

  if (flows.length < 2) return null
  return calcXirr(flows)
}

function quoteSymbolForExchange(symbol, assetType, exchange) {
  if (assetType === 'indianStock' && exchange) {
    return indianSymbolForExchange(symbol, exchange)
  }
  return symbol
}

async function resolveHistoricalPrice(symbol, date, assetType) {
  const cached = await getHistoricalPrice(symbol, date)
  if (cached?.price != null) return cached.price

  try {
    if (assetType === 'mutualFund') {
      const res = await api.getHistoricalNav(symbol, date)
      if (res?.nav != null) {
        await putHistoricalPrice(symbol, date, res.nav)
        return res.nav
      }
    } else {
      const res = await api.getStockHistoryPrice(symbol, date)
      if (res?.price != null) {
        await putHistoricalPrice(symbol, date, res.price)
        return res.price
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Fetch windowed XIRR for all holdings. Returns Map holdingId → { irr90, irr365, irrSinceApr, irrTotal }.
 */
export async function fetchWindowedXirrData(holdings, assetType, transactions, { usdInr, exchange } = {}) {
  const windows = getXirrWindowStartDates()
  const map = new Map()

  const priceCache = new Map()
  const uniqueLookups = new Set()

  for (const h of holdings || []) {
    const sym = quoteSymbolForExchange(holdingSymbol(h, assetType), assetType, exchange)
    for (const key of ['irr90', 'irr365', 'irrSinceApr']) {
      uniqueLookups.add(`${sym}|${windows[key]}`)
    }
  }

  await Promise.all(
    [...uniqueLookups].map(async (key) => {
      const [sym, date] = key.split('|')
      const price = await resolveHistoricalPrice(sym, date, assetType)
      priceCache.set(key, price)
    })
  )

  for (const h of holdings || []) {
    const sym = quoteSymbolForExchange(holdingSymbol(h, assetType), assetType, exchange)
    const irrTotal = calcHoldingXirr(h, assetType, transactions, { usdInr })
    const entry = { irr90: null, irr365: null, irrSinceApr: null, irrTotal }

    for (const winKey of ['irr90', 'irr365', 'irrSinceApr']) {
      const startDate = windows[winKey]
      const price = priceCache.get(`${sym}|${startDate}`)
      entry[winKey] = calcWindowedXirr(h, assetType, transactions, startDate, price, { usdInr })
    }

    entry.irrTotal = irrTotal
    map.set(h.id, entry)
  }

  return map
}
