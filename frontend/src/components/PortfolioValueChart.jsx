import { useId, useMemo, useState } from 'react'
import PortfolioValueBreakdownModal from './PortfolioValueBreakdownModal'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatINR, formatPct, formatChange } from '../utils/formatters'
import {
  CHART_RANGES,
  buildChartRows,
  compactAxisValue,
  formatChartAxisDate,
  formatTooltipDate,
  getChartColors,
} from '../utils/portfolioChartData'
import HoldingsDataIssue from './HoldingsDataIssue'
import './PortfolioValueChart.css'

function ChartTooltip({ active, payload, viewMode }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="pvc-tooltip">
      <div className="pvc-tooltip-date">{formatTooltipDate(row.date)}</div>
      <div className="pvc-tooltip-value">
        {viewMode === 'percent'
          ? formatPct(row.pctFromStart)
          : formatINR(row.value, true)}
      </div>
      {viewMode === 'value' && row.pctFromStart != null && (
        <div className={`pvc-tooltip-sub ${row.pctFromStart >= 0 ? 'pos' : 'neg'}`}>
          {formatPct(row.pctFromStart)} in range
        </div>
      )}
    </div>
  )
}

/**
 * Presentational portfolio value chart (Groww / Zerodha style).
 *
 * Breakdown trigger is the left summary block only — range and ₹/% controls are separate.
 */
export default function PortfolioValueChart({
  points = [],
  summary,
  breakdown = null,
  range,
  onRangeChange,
  viewMode = 'value',
  onViewModeChange,
  loading = false,
  emptyMessage,
  showViewToggle = true,
  pricesStale = false,
  dataWarning = null,
}) {
  const gradientId = useId().replace(/:/g, '')
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const colors = useMemo(
    () => getChartColors(summary?.isPeriodPositive ?? true),
    [summary?.isPeriodPositive]
  )

  const chartRows = useMemo(
    () => buildChartRows(points, { viewMode }),
    [points, viewMode]
  )

  const historySource = summary?.historySource ?? 'ledger'
  const hasSynthetic1D = points.some((p) => p.source === 'synthetic')
  const chartLineType =
    historySource === 'snapshot' || hasSynthetic1D ? 'linear' : 'stepAfter'
  const historyHint =
    historySource === 'ledger'
      ? 'Estimated from your buys & sells — open daily to build a market-based chart.'
      : historySource === 'merged'
        ? 'Earlier: estimated from transactions · recent: daily live snapshots.'
        : null

  const priceHint = pricesStale ? 'latest prices' : 'live prices'

  const rangeButtons = (
    <div className="pvc-ranges" role="group" aria-label="Portfolio history range">
      {CHART_RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          aria-pressed={range === r.id}
          className={`pvc-range-btn${range === r.id ? ' is-active' : ''}`}
          onClick={() => onRangeChange(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>
  )

  const viewToggle = showViewToggle && onViewModeChange && (
    <div className="pvc-view-toggle" role="group" aria-label="Chart value mode">
      <button
        type="button"
        aria-pressed={viewMode === 'value'}
        className={`pvc-view-btn${viewMode === 'value' ? ' is-active' : ''}`}
        onClick={() => onViewModeChange('value')}
      >
        ₹
      </button>
      <button
        type="button"
        aria-pressed={viewMode === 'percent'}
        className={`pvc-view-btn${viewMode === 'percent' ? ' is-active' : ''}`}
        onClick={() => onViewModeChange('percent')}
      >
        %
      </button>
    </div>
  )

  const headerControls = (
    <div className="pvc-header-right">
      {viewToggle}
      {rangeButtons}
    </div>
  )

  const headerValue =
    summary?.currentValue != null
      ? formatINR(summary.currentValue, true)
      : '—'

  const todayLine = (() => {
    const ch = summary?.todayChange
    const pct = summary?.todayChangePct
    if (ch == null) return null
    const pos = ch >= 0
    return (
      <span className={`pvc-today ${pos ? 'pos' : 'neg'}`}>
        {formatChange(ch)}
        {pct != null && ` (${formatPct(pct)})`}
        {' '}today
        <span className="pvc-today-hint"> · {priceHint}</span>
      </span>
    )
  })()

  const summaryBlock = (valueEl, todayEl) => (
    <button
      type="button"
      className={`pvc-header-trigger${breakdown ? ' pvc-header-trigger--clickable' : ''}`}
      onClick={() => breakdown && setBreakdownOpen(true)}
      disabled={!breakdown}
      aria-label={breakdown ? 'Portfolio value — open breakdown' : undefined}
    >
      <div className="pvc-header-trigger-row">
        <h3 className="pvc-title">Portfolio Value</h3>
        {breakdown && (
          <span className="pvc-breakdown-cta" aria-hidden="true">
            <svg className="pvc-breakdown-cta-icon" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 7v4M8 5.5v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Breakdown
            <span className="pvc-breakdown-cta-chevron">›</span>
          </span>
        )}
      </div>
      {valueEl}
      {todayEl}
    </button>
  )

  const chartHeader = (valueEl, todayEl) => (
    <div className="pvc-header">
      <div className="pvc-header-left">{summaryBlock(valueEl, todayEl)}</div>
      {headerControls}
    </div>
  )

  if (loading) {
    return (
      <div className="pvc-card">
        <div className="pvc-header">
          <div className="pvc-header-left">
            <h3 className="pvc-title">Portfolio Value</h3>
            <div className="pvc-value pvc-value--loading">—</div>
          </div>
          {headerControls}
        </div>
        <div className="pvc-chart-shell pvc-chart-shell--loading">
          <div className="pvc-skeleton" />
        </div>
      </div>
    )
  }

  if (!points.length) {
    return (
      <div className="pvc-card">
        <div className="pvc-header">
          <div className="pvc-header-left">
            <h3 className="pvc-title">Portfolio Value</h3>
          </div>
          {headerControls}
        </div>
        <p className="pvc-empty">
          {emptyMessage ||
            'Open Dashboard with a current portfolio value to record your first snapshot.'}
        </p>
      </div>
    )
  }

  if (points.length === 1) {
    const p = points[0]
    const displayVal = summary?.currentValue ?? p.value
    return (
      <div className="pvc-card">
        {chartHeader(
          <div className="pvc-value">{formatINR(displayVal, true)}</div>,
          todayLine
        )}
        <div className="pvc-chart-shell pvc-chart-shell--single">
          <p className="pvc-empty pvc-empty--inline">
            Not enough history yet. Check back tomorrow or try <strong>ALL</strong>.
          </p>
        </div>
        {breakdownOpen && breakdown && (
          <PortfolioValueBreakdownModal
            breakdown={breakdown}
            onClose={() => setBreakdownOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="pvc-card">
      {chartHeader(
        <div className="pvc-value">{headerValue}</div>,
        todayLine ||
          (summary?.periodChange != null ? (
            <span className={`pvc-today ${summary.isPeriodPositive ? 'pos' : 'neg'}`}>
              {formatChange(summary.periodChange)} ({formatPct(summary.periodChangePct)}) in
              range
            </span>
          ) : null)
      )}

      {dataWarning && (
        <HoldingsDataIssue
          assetType={dataWarning.assetType || 'indianStock'}
          status={dataWarning}
          context="portfolio"
        />
      )}

      <div className="pvc-chart-shell">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartRows}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.fillTop} />
                <stop offset="100%" stopColor={colors.fillBottom} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--pvc-grid)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatChartAxisDate(d, range)}
              tick={{ fontSize: 11, fill: 'var(--text-3)' }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              dy={8}
            />
            <YAxis
              dataKey="chartY"
              tickFormatter={(v) => compactAxisValue(v, viewMode)}
              tick={{ fontSize: 11, fill: 'var(--text-3)' }}
              axisLine={false}
              tickLine={false}
              width={52}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={<ChartTooltip viewMode={viewMode} />}
              cursor={{
                stroke: colors.stroke,
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />
            <Area
              type={chartLineType}
              dataKey="chartY"
              stroke={colors.stroke}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: colors.stroke,
                stroke: '#fff',
                strokeWidth: 2,
              }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {historyHint && <p className="pvc-history-hint">{historyHint}</p>}

      {breakdownOpen && breakdown && (
        <PortfolioValueBreakdownModal
          breakdown={breakdown}
          onClose={() => setBreakdownOpen(false)}
        />
      )}
    </div>
  )
}
