import { dateKeyInTimezone } from './marketHours'

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

/** Parse AMFI date (DD-Mon-YYYY) or ISO date string. */
export function parseNavDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const amfi = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  if (amfi) {
    const mon = MONTHS[amfi[2].toLowerCase()]
    if (mon == null) return null
    return new Date(Number(amfi[3]), mon, Number(amfi[1]), 12, 0, 0, 0)
  }
  const iso = s.slice(0, 10)
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatNavDate(raw, opts = {}) {
  const d = parseNavDate(raw)
  if (!d) return null
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: opts.shortYear ? '2-digit' : 'numeric',
    ...opts,
  })
}

/**
 * How far the published NAV date is vs today (IST).
 * @returns {'today' | 't1' | 'older' | null}
 */
export function getNavLagKind(navDateRaw, now = new Date()) {
  const d = parseNavDate(navDateRaw)
  if (!d) return null
  const todayKey = dateKeyInTimezone(now, 'Asia/Kolkata')
  const navKey = dateKeyInTimezone(d, 'Asia/Kolkata')
  if (navKey === todayKey) return 'today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (navKey === dateKeyInTimezone(yesterday, 'Asia/Kolkata')) return 't1'
  return 'older'
}

export function describeNavLag(kind) {
  if (kind === 'today') return 'Today'
  if (kind === 't1') return 'T-1'
  return null
}

/** One-line NAV caption for the MF page header (date only — AMFI is not calendar T-1 on weekends). */
export function formatNavStatusLine(summary) {
  if (!summary.hasNav || !summary.dateRangeLabel) {
    return 'Refresh NAV · AMFI'
  }
  const mixed = summary.mixedDates ? ' · per scheme in table' : ''
  return `NAV as of ${summary.dateRangeLabel}${mixed} · AMFI`
}

/**
 * @param {{ navDate?: string | null, currentNAV?: number | null }[]} funds
 */
export function getPortfolioNavSummary(funds, now = new Date()) {
  const dated = funds.filter((f) => f.currentNAV != null && f.navDate)
  if (!dated.length) {
    return {
      hasNav: funds.some((f) => f.currentNAV != null),
      latestDate: null,
      latestFormatted: null,
      dateRangeLabel: null,
      lagKind: null,
      lagLabel: null,
      mixedDates: false,
    }
  }

  const keys = dated.map((f) => ({
    key: dateKeyInTimezone(parseNavDate(f.navDate), 'Asia/Kolkata'),
    raw: f.navDate,
    parsed: parseNavDate(f.navDate),
  }))
  keys.sort((a, b) => a.parsed - b.parsed)
  const uniqueKeys = [...new Set(keys.map((k) => k.key))]
  const latest = keys[keys.length - 1]
  const oldest = keys[0]
  const lagKind = getNavLagKind(latest.raw, now)
  const lagLabel = describeNavLag(lagKind)

  let dateRangeLabel = formatNavDate(latest.raw)
  if (uniqueKeys.length > 1) {
    dateRangeLabel = `${formatNavDate(oldest.raw)} – ${formatNavDate(latest.raw)}`
  }

  return {
    hasNav: true,
    latestDate: latest.raw,
    latestFormatted: formatNavDate(latest.raw),
    dateRangeLabel,
    lagKind,
    lagLabel,
    mixedDates: uniqueKeys.length > 1,
  }
}
