import { api } from './api'
import { getHistoricalPrice, getNearestHistoricalPrice, putHistoricalPrice } from './priceCache'

function addDaysFromToday(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function mapPool(items, mapper, concurrency = 3) {
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

/** NAV on or nearest to a calendar date (cached + AMFI API). */
export async function resolveNavOnDate(schemeCode, date) {
  const code = String(schemeCode)
  const cached = await getHistoricalPrice(code, date)
  if (cached?.price != null) return cached.price

  try {
    const res = await api.getHistoricalNav(schemeCode, date)
    if (res?.nav != null) {
      const storeDate = `${res.date || date}`.slice(0, 10)
      await putHistoricalPrice(code, storeDate, res.nav)
      return res.nav
    }
  } catch {
    /* try nearest cache below */
  }
  return getNearestHistoricalPrice(code, date)
}

export async function fetchMfNavHistory(schemeCode) {
  const dates = [
    ['nav1m', addDaysFromToday(30)],
    ['nav3m', addDaysFromToday(90)],
    ['nav6m', addDaysFromToday(180)],
  ]
  const out = { nav1m: null, nav3m: null, nav6m: null }
  await mapPool(dates, async ([key, date]) => {
    out[key] = await resolveNavOnDate(schemeCode, date)
  }, 2)
  return out
}

/** Warm 1M / 3M / 6M NAV cache after a live NAV refresh. */
export async function prefetchMfMarketNavHistory(schemeCodes) {
  const unique = [...new Set((schemeCodes || []).map(String).filter(Boolean))]
  if (!unique.length) return
  const dates = [addDaysFromToday(30), addDaysFromToday(90), addDaysFromToday(180)]
  const lookups = []
  for (const code of unique) {
    for (const date of dates) lookups.push([code, date])
  }
  await mapPool(lookups, async ([code, date]) => {
    await resolveNavOnDate(code, date)
  }, 3)
}
