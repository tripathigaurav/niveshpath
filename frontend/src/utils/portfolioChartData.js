/**
 * Portfolio chart data layer — filter ranges, derive metrics, chart-ready rows.
 * Keeps calculation separate from Recharts rendering.
 */

/** @typedef {{ date: string, value: number }} PortfolioPoint */

export const CHART_RANGES = [
  { id: '1D', label: '1D', days: 1 },
  { id: '1W', label: '1W', days: 7 },
  { id: '1M', label: '1M', days: 30 },
  { id: '6M', label: '6M', days: 183 },
  { id: '1Y', label: '1Y', days: 365 },
  { id: 'ALL', label: 'ALL', days: 0 },
]

const CHART_GREEN = '#16a34a'
const CHART_RED = '#dc2626'

export function getChartColors(isPositive) {
  return {
    stroke: isPositive ? CHART_GREEN : CHART_RED,
    fillTop: isPositive ? 'rgba(22, 163, 74, 0.28)' : 'rgba(220, 38, 38, 0.28)',
    fillBottom: isPositive ? 'rgba(22, 163, 74, 0)' : 'rgba(220, 38, 38, 0)',
  }
}

function cutoffDateString(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Drop flat middle days so step charts show plateaus + jumps, not fake slopes.
 * @param {PortfolioPoint[]} points
 */
export function compactFlatRuns(points) {
  if (!points?.length) return []
  if (points.length < 3) return [...points]

  const out = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].value
    const cur = points[i].value
    const next = points[i + 1].value
    if (cur !== prev || cur !== next) out.push(points[i])
  }
  out.push(points[points.length - 1])
  return out
}

export function filterPointsByRange(points, rangeId) {
  if (!points?.length) return []
  const range = CHART_RANGES.find((r) => r.id === rangeId) || CHART_RANGES[4]
  if (!range.days) return [...points]
  const cutoff = cutoffDateString(range.days)
  const filtered = points.filter((p) => p.date >= cutoff)
  if (filtered.length >= 2) return filtered
  if (points.length >= 2) return points.slice(-Math.min(points.length, Math.max(2, range.days + 1)))
  return filtered.length ? filtered : points.slice(-1)
}

/**
 * Apply range filter; for 1D without intraday data, synthesize previous close → live current.
 * @param {PortfolioPoint[]} points
 * @param {string} rangeId
 * @param {{ liveCurrentValue?: number | null, todayPnl?: number | null }} opts
 */
export function resolveRangePoints(
  points,
  rangeId,
  { liveCurrentValue = null, todayPnl = null } = {}
) {
  const filtered = filterPointsByRange(points, rangeId)
  if (rangeId !== '1D' || filtered.length >= 2 || liveCurrentValue == null) {
    return filtered
  }

  const today = todayISO()
  const previousClose =
    todayPnl != null
      ? liveCurrentValue - todayPnl
      : filtered[filtered.length - 1]?.value

  if (previousClose == null || previousClose <= 0) return filtered

  const yesterday = cutoffDateString(1)
  return [
    {
      date: yesterday,
      value: Math.round(previousClose * 100) / 100,
      source: 'synthetic',
    },
    {
      date: today,
      value: Math.round(liveCurrentValue * 100) / 100,
      source: 'snapshot',
    },
  ]
}

export function formatChartAxisDate(iso, rangeId) {
  const d = new Date(`${iso}T12:00:00`)
  if (rangeId === '1D' || rangeId === '1W') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }
  if (rangeId === '1M' || rangeId === '6M') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

export function formatTooltipDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * @param {PortfolioPoint[]} points
 * @param {{ investedValue?: number | null, viewMode?: 'value' | 'percent' }} opts
 */
export function buildChartRows(points, { investedValue = null, viewMode = 'value' } = {}) {
  if (!points.length) return []
  const base = points[0].value
  return points.map((p) => {
    const pctFromStart = base ? ((p.value - base) / base) * 100 : 0
    const pctFromInvested =
      investedValue != null && investedValue > 0
        ? ((p.value - investedValue) / investedValue) * 100
        : null
    return {
      date: p.date,
      value: p.value,
      chartY: viewMode === 'percent' ? pctFromStart : p.value,
      pctFromStart,
      pctFromInvested,
    }
  })
}

/**
 * @param {PortfolioPoint[]} points
 * @param {{ investedValue?: number | null, todayPnl?: number | null }} opts
 */
export function computeChartSummary(
  points,
  { investedValue = null, todayPnl = null, liveCurrentValue = null } = {}
) {
  if (!points.length) {
    return {
      currentValue: liveCurrentValue ?? null,
      periodChange: null,
      periodChangePct: null,
      todayChange: todayPnl ?? null,
      todayChangePct: null,
      snapshotTodayChange: null,
      snapshotTodayChangePct: null,
      prevSnapshotDate: null,
      historySource: null,
      isPeriodPositive: true,
    }
  }

  const first = points[0]
  const last = points[points.length - 1]
  const prev = points.length > 1 ? points[points.length - 2] : null

  const periodChange = last.value - first.value
  const periodChangePct = first.value ? (periodChange / first.value) * 100 : 0

  let snapshotTodayChange = null
  let snapshotTodayChangePct = null
  if (prev && last.date === todayISO()) {
    snapshotTodayChange = last.value - prev.value
    snapshotTodayChangePct = prev.value ? (snapshotTodayChange / prev.value) * 100 : 0
  }

  const todayChange = todayPnl ?? snapshotTodayChange
  let todayChangePct = null
  if (todayChange != null) {
    // todayPct = todayPnl / previousCloseValue × 100
    const previousCloseValue =
      liveCurrentValue != null
        ? liveCurrentValue - todayChange
        : prev?.value ?? (last.value - todayChange)
    todayChangePct =
      previousCloseValue > 0 ? (todayChange / previousCloseValue) * 100 : 0
  }

  const displayValue = liveCurrentValue ?? last.value

  return {
    currentValue: displayValue,
    periodChange,
    periodChangePct,
    todayChange,
    todayChangePct,
    snapshotTodayChange,
    snapshotTodayChangePct,
    prevSnapshotDate: prev?.date ?? null,
    historySource: null,
    /** Chart stroke/fill: selected range end vs start (not all-time vs invested). */
    isPeriodPositive: periodChange >= 0,
  }
}

export function compactAxisValue(value, viewMode) {
  if (viewMode === 'percent') return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  const abs = Math.abs(value)
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(0)}K`
  return `₹${Math.round(value)}`
}
