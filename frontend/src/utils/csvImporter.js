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

export function detectBroker(headers) {
  const raw = headers.filter(Boolean)
  for (const [key, profile] of Object.entries(BROKER_PROFILES)) {
    if (profile.detect(raw)) return { key, profile }
  }
  return { key: 'generic', profile: BROKER_PROFILES.zerodha }
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

    let date = colDate ? String(row[colDate]).slice(0, 10) : new Date().toISOString().slice(0, 10)
    if (date.length > 10) date = date.slice(0, 10)

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
