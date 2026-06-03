import { openDB } from 'idb'
import { estimateSamplePortfolioValueINR } from './demoPortfolioHistory'
import { CHART_RANGES } from './portfolioChartData'

const DB_NAME = 'niveshpath-portfolio'
const STORE = 'dailySnapshots'
const DB_VERSION = 1

/** @deprecated use CHART_RANGES from portfolioChartData */
export const HISTORY_RANGES = CHART_RANGES

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'date' })
      }
    },
  })
}

async function getAllSorted() {
  const db = await getDb()
  const all = await db.getAll(STORE)
  return all
    .filter((r) => r?.date && r.value != null)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function cutoffDateString(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * Record one snapshot per calendar day (overwrites same day).
 * @param {number} valueINR — total portfolio current value in INR
 */
export async function recordDailySnapshot(valueINR) {
  if (valueINR == null || !Number.isFinite(valueINR) || valueINR <= 0) return
  const date = new Date().toISOString().slice(0, 10)
  const db = await getDb()
  await db.put(STORE, {
    date,
    value: Math.round(valueINR * 100) / 100,
    recordedAt: Date.now(),
  })
}

/**
 * @param {number} limitDays — max points to return (most recent); 0 = all
 * @returns {Promise<{ date: string, value: number }[]>}
 */
export async function getPortfolioSnapshots(limitDays = 90) {
  const sorted = await getAllSorted()
  if (limitDays > 0 && sorted.length > limitDays) {
    return sorted.slice(-limitDays)
  }
  return sorted
}

/**
 * @param {string} rangeId — one of HISTORY_RANGES ids
 */
export async function getPortfolioSnapshotsForRange(rangeId = '1Y') {
  const range = CHART_RANGES.find((r) => r.id === rangeId) ||
    CHART_RANGES.find((r) => r.id === 'ALL') ||
    CHART_RANGES[4]
  const sorted = await getAllSorted()
  if (!range.days) return sorted
  const cutoff = cutoffDateString(range.days)
  const filtered = sorted.filter((p) => p.date >= cutoff)
  if (filtered.length >= 2) return filtered
  return sorted.length >= 2 ? sorted.slice(-Math.min(sorted.length, range.days + 1)) : filtered
}

export async function clearPortfolioSnapshots() {
  const db = await getDb()
  await db.clear(STORE)
}

/**
 * @deprecated Synthetic demo curves — use seedLedgerPortfolioHistory instead.
 */
export async function seedDemoPortfolioHistory(endValueINR) {
  return seedLedgerPortfolioHistory({ liveCurrentValue: endValueINR })
}

/**
 * Clear fake history; chart uses in-memory ledger series. Optionally store today's value.
 */
export async function seedLedgerPortfolioHistory({
  liveCurrentValue = null,
} = {}) {
  await clearPortfolioSnapshots()
  if (liveCurrentValue != null && liveCurrentValue > 0) {
    await recordDailySnapshot(liveCurrentValue)
  }
  return 1
}

export async function hasDemoSnapshots() {
  const sorted = await getAllSorted()
  return sorted.some((s) => s.demo)
}

/** Remove synthetic demo points; keep real daily recordings. */
export async function purgeDemoSnapshots() {
  const db = await getDb()
  const all = await db.getAll(STORE)
  const tx = db.transaction(STORE, 'readwrite')
  for (const row of all) {
    if (row.demo) await tx.store.delete(row.date)
  }
  await tx.done
}
