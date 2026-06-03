import { api } from './api'

function parseIsoDate(str) {
  if (!str) return null
  const d = new Date(`${String(str).slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function horizonBounds(days) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + days)
  return { today, end }
}

function inHorizon(d, today, end) {
  return d >= today && d <= end
}

function actionsToEvents(symbol, name, region, data, today, end) {
  const events = []
  if (data?.nextEarnings) {
    const d = parseIsoDate(data.nextEarnings)
    if (d && inHorizon(d, today, end)) {
      events.push({
        symbol,
        name: name || symbol,
        region,
        type: 'earnings',
        date: data.nextEarnings.slice(0, 10),
        detail: 'Earnings',
      })
    }
  }
  for (const div of data?.dividends || []) {
    const d = parseIsoDate(div.date)
    if (d && inHorizon(d, today, end)) {
      events.push({
        symbol,
        name: name || symbol,
        region,
        type: 'dividend',
        date: String(div.date).slice(0, 10),
        detail: div.amount != null ? `Dividend ₹${div.amount}` : 'Dividend',
      })
    }
  }
  return events
}

async function fetchViaPerSymbolActions(holdings, days) {
  const { today, end } = horizonBounds(days)
  const results = await Promise.allSettled(
    holdings.map(async (h) => {
      const data = await api.getStockActions(h.symbol)
      return actionsToEvents(h.symbol, h.name, h.region, data, today, end)
    })
  )
  const events = []
  for (const r of results) {
    if (r.status === 'fulfilled') events.push(...r.value)
  }
  const seen = new Set()
  const unique = []
  for (const ev of events.sort((a, b) => a.date.localeCompare(b.date))) {
    const key = `${ev.symbol}-${ev.date}-${ev.type}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(ev)
  }
  return { events: unique, days }
}

/**
 * Batch upcoming-events API with per-symbol /stock/actions fallback.
 */
export async function fetchUpcomingEvents(holdings, days = 30) {
  try {
    return await api.getUpcomingEvents(holdings, days)
  } catch (batchErr) {
    if (!holdings.length) throw batchErr
    try {
      const fallback = await fetchViaPerSymbolActions(holdings, days)
      if (fallback.events.length > 0) return fallback
    } catch {
      /* use original error */
    }
    throw batchErr
  }
}
