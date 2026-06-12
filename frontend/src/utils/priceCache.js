import { openDB } from 'idb'

const DB_NAME = 'niveshpath-prices'
const STORE = 'quotes'
const HISTORICAL_STORE = 'historicalLTP'
const DB_VERSION = 2

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'symbol' })
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(HISTORICAL_STORE)) {
        const hist = db.createObjectStore(HISTORICAL_STORE, { keyPath: 'id' })
        hist.createIndex('symbol', 'symbol')
        hist.createIndex('date', 'date')
      }
    },
  })
}

function histId(symbol, date) {
  return `${symbol}|${date}`
}

/**
 * @param {Record<string, { price?: number, dayChange?: number, dayChangePct?: number }>} quotes
 */
export async function cachePrices(quotes) {
  if (!quotes || typeof quotes !== 'object') return
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  const at = Date.now()
  for (const [symbol, data] of Object.entries(quotes)) {
    if (data?.price == null) continue
    await tx.store.put({
      symbol,
      price: data.price,
      dayChange: data.dayChange ?? null,
      dayChangePct: data.dayChangePct ?? null,
      open: data.open ?? null,
      dayHigh: data.dayHigh ?? null,
      dayLow: data.dayLow ?? null,
      yearHigh: data.yearHigh ?? null,
      yearLow: data.yearLow ?? null,
      cachedAt: at,
    })
  }
  await tx.done
  await recordHistoricalPrices(quotes)
}

export async function getCachedPrice(symbol) {
  const db = await getDb()
  return db.get(STORE, symbol)
}

export async function getCachedPrices(symbols) {
  const db = await getDb()
  const out = {}
  for (const sym of symbols) {
    const row = await db.get(STORE, sym)
    if (row) out[sym] = row
  }
  return out
}

/** Persist today's LTP per symbol for windowed XIRR lookups. */
export async function recordHistoricalPrices(quotes) {
  if (!quotes || typeof quotes !== 'object') return
  const date = new Date().toISOString().slice(0, 10)
  const db = await getDb()
  const tx = db.transaction(HISTORICAL_STORE, 'readwrite')
  for (const [symbol, data] of Object.entries(quotes)) {
    if (data?.price == null) continue
    await tx.store.put({
      id: histId(symbol, date),
      symbol,
      date,
      price: data.price,
      recordedAt: Date.now(),
    })
  }
  await tx.done
}

export async function getHistoricalPrice(symbol, date) {
  const db = await getDb()
  return db.get(HISTORICAL_STORE, histId(symbol, date))
}

export async function putHistoricalPrice(symbol, date, price) {
  if (price == null || !Number.isFinite(price)) return
  const db = await getDb()
  await db.put(HISTORICAL_STORE, {
    id: histId(symbol, date),
    symbol,
    date,
    price,
    recordedAt: Date.now(),
  })
}

export async function getHistoricalPricesForSymbol(symbol) {
  const db = await getDb()
  const all = await db.getAllFromIndex(HISTORICAL_STORE, 'symbol', symbol)
  return all.sort((a, b) => a.date.localeCompare(b.date))
}
