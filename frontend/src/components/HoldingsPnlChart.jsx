import { useMemo, useState } from 'react'
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
  formatChartAxisDate,
  formatTooltipDate,
  getChartColors,
} from '../utils/portfolioChartData'
import { formatINR, formatUSD } from '../utils/formatters'
import { pnlChartNote } from '../utils/holdingTabMessages'
import './PortfolioValueChart.css'

const CATEGORY_RANGES = CHART_RANGES.filter((r) => ['1M', '6M', '1Y', 'ALL'].includes(r.id))

function filterByRange(points, rangeId) {
  const range = CATEGORY_RANGES.find((r) => r.id === rangeId) || CATEGORY_RANGES[3]
  if (!range.days || !points.length) return points
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - range.days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const filtered = points.filter((p) => p.date >= cutoffStr)
  return filtered.length >= 2 ? filtered : points
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
          <span>Value</span>
          <span>{formatValue(row.value)}</span>
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
  usdInr = null,
  currency = 'INR',
}) {
  const [range, setRange] = useState('1Y')
  const colors = getChartColors(
    liveCurrentValue != null && liveInvestedValue != null
      ? liveCurrentValue >= liveInvestedValue
      : true
  )
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

  const chartData = useMemo(() => filterByRange(points, range), [points, range])

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
            className={`pvc-range-btn${range === r.id ? ' active' : ''}`}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="holdings-pnl-chart-note text-muted-sm">
        {pnlChartNote(assetType, { currency })}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="holdingsInvestedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={investedColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={investedColor} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="holdingsValueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={valueColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={valueColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartAxisDate}
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={axisFormatter}
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
          <Area
            type="monotone"
            dataKey="invested"
            stroke={investedColor}
            fill="url(#holdingsInvestedGrad)"
            strokeWidth={1.5}
            name="Invested"
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={valueColor}
            fill="url(#holdingsValueGrad)"
            strokeWidth={2}
            name="Value"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
