import { openDB } from 'idb'

const DB_NAME = 'niveshpath-prices'
const STORE = 'quotes'
const DB_VERSION = 1

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'symbol' })
      }
    },
  })
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
      cachedAt: at,
    })
  }
  await tx.done
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
