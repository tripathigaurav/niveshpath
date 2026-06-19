import { api } from './api'
import { calcXirr } from './xirr'
import { calcIndianStockMetrics, calcUsPnl, calcMfPnl } from './pnl'
import { calcHoldingXirr } from './xirrMetrics'
import { qtyOnDate } from './holdingLedger'
import {
  getHistoricalPrice,
  getNearestHistoricalPrice,
  putHistoricalPrice,
} from './priceCache'
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
  const result = calcXirr(flows)
  return result.value
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
    /* try cache fallback below */
  }

  return getNearestHistoricalPrice(symbol, date)
}

async function mapPool(items, mapper, concurrency = 4) {
  const out = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await mapper(items[i])
    }
  }
  const workers = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return out
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

  await mapPool([...uniqueLookups], async (key) => {
    const sep = key.lastIndexOf('|')
    const sym = key.slice(0, sep)
    const date = key.slice(sep + 1)
    const price = await resolveHistoricalPrice(sym, date, assetType)
    priceCache.set(key, price)
  })

  for (const h of holdings || []) {
    const sym = quoteSymbolForExchange(holdingSymbol(h, assetType), assetType, exchange)
    const irrTotalResult = calcHoldingXirr(h, assetType, transactions, { usdInr })
    const irrTotal = irrTotalResult?.value ?? null
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

function readIndianExchangePreference() {
  try {
    return localStorage.getItem('pt_indian_market_exchange') || 'NSE'
  } catch {
    return 'NSE'
  }
}

/**
 * Warm historical price cache after a live quote refresh (helps IRR tab on next open).
 */
export async function prefetchWindowedHistoricalPrices(symbols, assetType, { exchange } = {}) {
  if (!symbols?.length) return
  const windows = getXirrWindowStartDates()
  const dates = [windows.irr90, windows.irr365, windows.irrSinceApr]
  const ex =
    assetType === 'indianStock' ? exchange || readIndianExchangePreference() : exchange
  const lookups = new Set()

  for (const sym of symbols) {
    const q = quoteSymbolForExchange(String(sym), assetType, ex)
    for (const d of dates) lookups.add(`${q}|${d}`)
  }

  await mapPool([...lookups], async (key) => {
    const sep = key.lastIndexOf('|')
    await resolveHistoricalPrice(key.slice(0, sep), key.slice(sep + 1), assetType)
  })
}

/** True when total IRR exists but every windowed column is empty. */
export function isWindowedIrrIncomplete(windowedXirr, holdings) {
  if (!holdings?.length || !windowedXirr?.size) return false
  let anyTotal = false
  let anyWindowed = false
  for (const h of holdings) {
    const irr = windowedXirr.get(h.id)
    if (!irr) continue
    if (irr.irrTotal != null) anyTotal = true
    if (irr.irr90 != null || irr.irr365 != null || irr.irrSinceApr != null) {
      anyWindowed = true
      break
    }
  }
  return anyTotal && !anyWindowed
}
