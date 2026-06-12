import { useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildCategoryHistoryFromLedger } from '../utils/portfolioLedgerHistory'
import {
  CHART_RANGES,
  compactAxisValue,
  filterPointsByRange,
  formatChartAxisDate,
  formatTooltipDate,
  getChartColors,
} from '../utils/portfolioChartData'
import { formatINR, formatUSD } from '../utils/formatters'
import { canShowValueBasedChart } from '../utils/marketDataStatus'
import { pnlChartNote } from '../utils/holdingTabMessages'
import HoldingsDataIssue from './HoldingsDataIssue'
import './PortfolioValueChart.css'

const CATEGORY_RANGES = CHART_RANGES.filter((r) =>
  ['1M', '6M', '1Y', '5Y', 'ALL'].includes(r.id)
)

const CHART_HEIGHT = 440

/** Zoom Y-axis to invested/value band with generous padding so lines aren't edge-locked. */
function computeYDomain(points) {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    for (const key of ['invested', 'value']) {
      const v = p[key]
      if (v != null && Number.isFinite(v)) {
        min = Math.min(min, v)
        max = Math.max(max, v)
      }
    }
  }
  if (!Number.isFinite(min)) return undefined
  const span = max - min
  const pad =
    span > 0
      ? Math.max(span * 0.35, max * 0.025)
      : Math.max(Math.abs(max) * 0.1, 1)
  return [min - pad, max + pad]
}

function ChartTooltip({ active, payload, formatValue }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="pvc-tooltip">
      <div className="pvc-tooltip-date">{formatTooltipDate(row.date)}</div>
      {row.invested != null && (
        <div className="pvc-tooltip-row">
          <span>Invested</span>
          <span>{formatValue(row.invested)}</span>
        </div>
      )}
      {row.value != null && (
        <div className="pvc-tooltip-row">
          <span>Current value</span>
          <span>{formatValue(row.value)}</span>
        </div>
      )}
      {row.value != null && row.invested != null && (
        <div
          className={`pvc-tooltip-row pvc-tooltip-row--pnl ${
            row.value - row.invested >= 0 ? 'pos' : 'neg'
          }`}
        >
          <span>P&amp;L</span>
          <span>{formatValue(row.value - row.invested)}</span>
        </div>
      )}
    </div>
  )
}

export default function HoldingsPnlChart({
  transactions,
  assetType = 'indianStock',
  liveCurrentValue,
  liveInvestedValue,
  marketDataStatus = null,
  onRetry,
  loading = false,
  usdInr = null,
  currency = 'INR',
}) {
  const [range, setRange] = useState('ALL')
  const gradId = useId().replace(/:/g, '')
  const isProfit =
    liveCurrentValue != null && liveInvestedValue != null
      ? liveCurrentValue >= liveInvestedValue
      : true
  const colors = getChartColors(isProfit)
  const investedColor = 'var(--text-3)'
  const valueColor = colors.stroke
  const formatValue = currency === 'USD' ? (v) => formatUSD(v) : (v) => formatINR(v)
  const axisFormatter = (v) => {
    if (currency === 'USD') {
      const abs = Math.abs(v)
      if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
      if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
      return `$${Math.round(v)}`
    }
    return compactAxisValue(v)
  }

  const points = useMemo(
    () =>
      buildCategoryHistoryFromLedger({
        transactions,
        assetType,
        liveCurrentValue,
        liveInvestedValue,
        usdInr,
      }),
    [transactions, assetType, liveCurrentValue, liveInvestedValue, usdInr]
  )

  const chartData = useMemo(() => filterPointsByRange(points, range), [points, range])
  const yDomain = useMemo(() => computeYDomain(chartData), [chartData])
  const chartBlocked =
    !canShowValueBasedChart(marketDataStatus) || liveCurrentValue == null

  if (chartBlocked) {
    return (
      <div className="holdings-pnl-chart">
        <HoldingsDataIssue
          assetType={assetType}
          status={
            marketDataStatus?.ready === false
              ? marketDataStatus
              : {
                  ready: false,
                  level: 'error',
                  code: 'all_missing',
                  assetType,
                }
          }
          context="pnl"
          onRetry={onRetry}
          loading={loading}
        />
      </div>
    )
  }

  if (chartData.length < 2) {
    return (
      <div className="holdings-pnl-chart holdings-pnl-chart--empty">
        <p>Add transactions to see profit &amp; loss trend over time.</p>
      </div>
    )
  }

  return (
    <div className="holdings-pnl-chart">
      <div className="pvc-range-bar">
        {CATEGORY_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={range === r.id}
            className={`pvc-range-btn${range === r.id ? ' is-active' : ''}`}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="holdings-pnl-chart-note text-muted-sm">
        {pnlChartNote(assetType, { currency })}
      </p>
      <div className="holdings-pnl-legend" aria-hidden="true">
        <span className="holdings-pnl-legend-item">
          <span
            className="holdings-pnl-legend-swatch holdings-pnl-legend-swatch--area"
            style={{ backgroundColor: investedColor, opacity: 0.45 }}
          />
          Invested
        </span>
        <span className="holdings-pnl-legend-item">
          <span
            className="holdings-pnl-legend-swatch holdings-pnl-legend-swatch--area"
            style={{ backgroundColor: valueColor, opacity: 0.85 }}
          />
          Current value
          <span className={`holdings-pnl-legend-tag ${isProfit ? 'pos' : 'neg'}`}>
            {isProfit ? 'Profit' : 'Loss'}
          </span>
        </span>
      </div>
      <div className="holdings-pnl-chart-shell">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 16, left: 8, bottom: 16 }}
          >
            <defs>
              <linearGradient id={`${gradId}-invested`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={investedColor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={investedColor} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id={`${gradId}-value`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={valueColor} stopOpacity={0.45} />
                <stop offset="100%" stopColor={valueColor} stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatChartAxisDate(d, range)}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={yDomain}
              allowDataOverflow
              tickFormatter={axisFormatter}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
            <Area
              type="stepAfter"
              dataKey="value"
              stroke={valueColor}
              fill={`url(#${gradId}-value)`}
              strokeWidth={2.25}
              name="Current value"
              isAnimationActive={false}
            />
            <Area
              type="stepAfter"
              dataKey="invested"
              stroke={investedColor}
              fill={`url(#${gradId}-invested)`}
              fillOpacity={0.35}
              strokeWidth={1.75}
              strokeDasharray="5 4"
              name="Invested"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
