import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import { storage } from './storage'
import { normalizeIndianHolding } from './indianHoldings'
import { logAudit } from './auditTrail'
import { notifyDataChanged } from '../hooks/useNotifications'
import { logBuy } from './transactions'

const BROKER_PROFILES = {
  zerodha: {
    label: 'Zerodha Console',
    detect: (headers) =>
      headers.some((h) => /tradingsymbol/i.test(h)) &&
      headers.some((h) => /quantity|qty/i.test(h)),
    map: {
      symbol: ['tradingsymbol', 'symbol', 'scrip'],
      qty: ['quantity', 'qty'],
      price: ['average price', 'avg price', 'price', 'buy price'],
      date: ['trade date', 'date', 'order execution time'],
      type: ['trade type', 'type', 'transaction type'],
    },
  },
  groww: {
    label: 'Groww',
    detect: (headers) =>
      headers.some((h) => /stock name|symbol/i.test(h)) &&
      headers.some((h) => /quantity/i.test(h)),
    map: {
      symbol: ['symbol', 'stock name', 'scrip'],
      qty: ['quantity', 'qty'],
      price: ['price', 'avg price', 'average price'],
      date: ['date', 'trade date'],
      type: ['type', 'transaction'],
    },
  },
  upstox: {
    label: 'Upstox',
    detect: (headers) =>
      headers.some((h) => /symbol/i.test(h)) &&
      headers.some((h) => /trade date/i.test(h)),
    map: {
      symbol: ['symbol', 'scrip'],
      qty: ['quantity', 'qty'],
      price: ['price', 'rate', 'avg price'],
      date: ['trade date', 'date'],
      type: ['buy/sell', 'type', 'transaction type'],
    },
  },
  angel: {
    label: 'Angel One',
    detect: (headers) =>
      headers.some((h) => /scripname|script name/i.test(h)) &&
      headers.some((h) => /qty|quantity/i.test(h)),
    map: {
      symbol: ['scripname', 'script name', 'symbol', 'scrip'],
      qty: ['qty', 'quantity'],
      price: ['net rate', 'rate', 'price', 'avg price'],
      date: ['trade date', 'date'],
      type: ['buy/sell', 'type', 'transaction type'],
    },
  },
  mfcentral: {
    label: 'MFCentral / CAS',
    detect: (headers) =>
      headers.some((h) => /scheme name|fund name/i.test(h)) &&
      headers.some((h) => /units|nav/i.test(h)),
    map: {
      symbol: ['scheme name', 'fund name', 'scheme'],
      qty: ['units', 'quantity'],
      price: ['nav', 'purchase nav', 'rate', 'price'],
      date: ['transaction date', 'date', 'trade date'],
      type: ['transaction type', 'type'],
    },
    isMF: true,
  },
  icici: {
    label: 'ICICI Direct',
    detect: (headers) =>
      headers.some((h) => /series|isin/i.test(h)) &&
      headers.some((h) => /qty|quantity/i.test(h)) &&
      headers.some((h) => /rate|price/i.test(h)),
    map: {
      symbol: ['symbol', 'stock name', 'scrip', 'isin'],
      qty: ['qty', 'quantity'],
      price: ['rate', 'price', 'average price', 'buy rate'],
      date: ['trade date', 'date', 'order date'],
      type: ['buy/sell', 'transaction type', 'type'],
    },
  },
  paytm: {
    label: 'Paytm Money',
    detect: (headers) =>
      headers.some((h) => /scrip name|company name/i.test(h)) &&
      headers.some((h) => /qty|quantity/i.test(h)),
    map: {
      symbol: ['scrip name', 'company name', 'symbol', 'stock name'],
      qty: ['qty', 'quantity'],
      price: ['price', 'avg price', 'rate', 'average price'],
      date: ['trade date', 'date', 'order date'],
      type: ['buy/sell', 'type', 'trade type'],
    },
  },
}

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase()
}

function findColumn(headers, aliases) {
  const norm = headers.map(normalizeHeader)
  for (const alias of aliases) {
    const idx = norm.findIndex((h) => h === alias.toLowerCase() || h.includes(alias.toLowerCase()))
    if (idx >= 0) return headers[idx]
  }
  return null
}

export { BROKER_PROFILES }

export function detectBroker(headers) {
  const raw = headers.filter(Boolean)
  for (const [key, profile] of Object.entries(BROKER_PROFILES)) {
    if (profile.detect(raw)) return { key, profile }
  }
  return { key: 'manual', profile: null }
}

/**
 * Map rows using an explicit column-name map (manual mode).
 * columnMap: { symbol, qty, price?, date?, type? } — values are raw CSV header strings.
 */
export function mapRowsToHoldingsManual(rows, columnMap) {
  if (!rows.length) return { holdings: [], skipped: 0, broker: 'Manual' }
  const { symbol: colSymbol, qty: colQty, price: colPrice, date: colDate, type: colType } = columnMap
  if (!colSymbol || !colQty) throw new Error('Symbol and Qty columns are required')

  const todayStr = new Date().toISOString().slice(0, 10)
  const aggregated = new Map()
  let skipped = 0
  for (const row of rows) {
    const typeVal = colType ? String(row[colType] || '').toLowerCase() : 'buy'
    if (colType && typeVal.includes('sell')) { skipped++; continue }
    const symbol = String(row[colSymbol] || '').trim().toUpperCase()
    const qty = parseFloat(row[colQty])
    const price = colPrice ? parseFloat(row[colPrice]) : NaN
    if (!symbol || !Number.isFinite(qty) || qty <= 0) { skipped++; continue }
    let date = colDate ? String(row[colDate]).slice(0, 10) : todayStr
    if (date.length > 10) date = date.slice(0, 10)
    if (date > todayStr || isNaN(new Date(date).getTime())) date = todayStr
    const prev = aggregated.get(symbol)
    if (prev) {
      const totalQty = prev.qty + qty
      const avgPrice = (prev.buyPrice * prev.qty + (Number.isFinite(price) ? price : prev.buyPrice) * qty) / totalQty
      aggregated.set(symbol, { ...prev, qty: totalQty, buyPrice: avgPrice, buyDate: date < prev.buyDate ? date : prev.buyDate })
    } else {
      aggregated.set(symbol, { symbol, name: symbol, qty, buyPrice: Number.isFinite(price) ? price : 0, buyDate: date })
    }
  }
  return { holdings: [...aggregated.values()], skipped, broker: 'Manual' }
}

export function parseCsvText(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (result.errors?.length) {
    const fatal = result.errors.find((e) => e.type === 'Quotes')
    if (fatal) throw new Error(`CSV parse error: ${fatal.message}`)
  }
  return result.data
}

export function mapRowsToHoldings(rows, brokerKey = 'zerodha') {
  const profile = BROKER_PROFILES[brokerKey] || BROKER_PROFILES.zerodha
  if (!rows.length) return { holdings: [], skipped: 0, broker: profile.label }

  const headers = Object.keys(rows[0])
  const colSymbol = findColumn(headers, profile.map.symbol)
  const colQty = findColumn(headers, profile.map.qty)
  const colPrice = findColumn(headers, profile.map.price)
  const colDate = findColumn(headers, profile.map.date)
  const colType = findColumn(headers, profile.map.type)

  if (!colSymbol || !colQty) {
    throw new Error('Could not map Symbol and Quantity columns — check CSV format')
  }

  const aggregated = new Map()
  const todayStr = new Date().toISOString().slice(0, 10)
  let skipped = 0

  for (const row of rows) {
    const typeVal = colType ? String(row[colType] || '').toLowerCase() : 'buy'
    if (colType && typeVal.includes('sell')) {
      skipped++
      continue
    }

    const symbol = String(row[colSymbol] || '').trim().toUpperCase()
    const qty = parseFloat(row[colQty])
    const price = colPrice ? parseFloat(row[colPrice]) : NaN
    if (!symbol || !Number.isFinite(qty) || qty <= 0) {
      skipped++
      continue
    }

    let date = colDate ? String(row[colDate]).slice(0, 10) : todayStr
    if (date.length > 10) date = date.slice(0, 10)
    if (date > todayStr || isNaN(new Date(date).getTime())) date = todayStr

    const key = symbol
    const prev = aggregated.get(key)
    if (prev) {
      const totalQty = prev.qty + qty
      const avgPrice = (prev.buyPrice * prev.qty + (Number.isFinite(price) ? price : prev.buyPrice) * qty) / totalQty
      aggregated.set(key, { ...prev, qty: totalQty, buyPrice: avgPrice, buyDate: date < prev.buyDate ? date : prev.buyDate })
    } else {
      aggregated.set(key, {
        symbol,
        name: symbol,
        qty,
        buyPrice: Number.isFinite(price) ? price : 0,
        buyDate: date,
      })
    }
  }

  return {
    holdings: [...aggregated.values()],
    skipped,
    broker: profile.label,
    columnMap: { colSymbol, colQty, colPrice, colDate, colType },
  }
}

/**
 * Import parsed holdings into Indian stocks storage.
 */
export function importIndianHoldingsFromCsv(holdings, { merge = true } = {}) {
  const existing = merge ? storage.getIndianStocks() : []
  const existingSymbols = new Set(existing.map((s) => s.symbol))
  let added = 0
  let duplicates = 0
  const next = [...existing]

  for (const h of holdings) {
    if (existingSymbols.has(h.symbol)) {
      duplicates++
      continue
    }
    const entry = normalizeIndianHolding({
      id: uuidv4(),
      symbol: h.symbol,
      name: h.name || h.symbol,
      qty: h.qty,
      buyPrice: h.buyPrice,
      buyDate: h.buyDate,
      currentPrice: null,
      dayChange: null,
      dayChangePct: null,
    })
    next.push(entry)
    existingSymbols.add(h.symbol)
    logBuy({
      assetType: 'indianStock',
      symbol: entry.symbol,
      name: entry.name,
      qty: entry.qty,
      price: entry.buyPrice,
      date: entry.buyDate,
      holdingId: entry.id,
      notes: 'CSV import',
    })
    added++
  }

  storage.setIndianStocks(next)
  logAudit('import', 'csv', null, null, { added, duplicates, count: holdings.length })
  notifyDataChanged()
  return { added, duplicates, total: next.length }
}

/**
 * Import CAMS-parsed MF holdings into mutual fund storage.
 * @param {Array<{schemeName, units, avgNavCost, latestDate}>} holdings
 * @param {{ merge?: boolean }} opts
 */
export function importMFHoldingsFromCams(holdings, { merge = true } = {}) {
  const existing = merge ? storage.getMutualFunds() : []
  const existingNames = new Set(existing.map((f) => f.schemeName?.toLowerCase()))
  let added = 0
  let duplicates = 0
  const next = [...existing]

  for (const h of holdings) {
    if (existingNames.has(h.schemeName.toLowerCase())) {
      duplicates++
      continue
    }
    const entry = {
      id: uuidv4(),
      schemeCode: h.schemeName.slice(0, 20).replace(/\s+/g, '_').toUpperCase(),
      schemeName: h.schemeName,
      units: h.units,
      buyNAV: h.avgNavCost,
      buyDate: h.latestDate,
      currentNAV: null,
      previousNAV: null,
      navDate: null,
    }
    next.push(entry)
    existingNames.add(h.schemeName.toLowerCase())
    logBuy({
      assetType: 'mutualFund',
      symbol: entry.schemeCode,
      name: entry.schemeName,
      qty: entry.units,
      price: entry.buyNAV,
      date: entry.buyDate,
      holdingId: entry.id,
      notes: 'CAMS import',
    })
    added++
  }

  storage.setMutualFunds(next)
  logAudit('import', 'cams', null, null, { added, duplicates, count: holdings.length })
  notifyDataChanged()
  return { added, duplicates, total: next.length }
}
