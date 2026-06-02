import { useMemo, useState } from 'react'
import { formatINR } from '../utils/formatters'

/**
 * SVG donut chart for portfolio allocation.
 * segments: { label, value, color }[]
 */
export default function AllocationDonut({ segments, centerLabel, centerValue }) {
  const [hovered, setHovered] = useState(null)

  const { total, arcs } = useMemo(() => {
    const t = segments.reduce((s, seg) => s + (seg.value || 0), 0)
    if (!t) return { total: 0, arcs: [] }

    const cx = 100
    const cy = 100
    const outer = 88
    const inner = 52
    let angle = -90

    const list = segments.map((seg) => {
      const pct = seg.value / t
      const sweep = pct * 360
      const start = angle
      const end = angle + sweep
      angle = end

      const toRad = (deg) => (deg * Math.PI) / 180
      const large = sweep > 180 ? 1 : 0

      const x1o = cx + outer * Math.cos(toRad(start))
      const y1o = cy + outer * Math.sin(toRad(start))
      const x2o = cx + outer * Math.cos(toRad(end))
      const y2o = cy + outer * Math.sin(toRad(end))
      const x1i = cx + inner * Math.cos(toRad(end))
      const y1i = cy + inner * Math.sin(toRad(end))
      const x2i = cx + inner * Math.cos(toRad(start))
      const y2i = cy + inner * Math.sin(toRad(start))

      const d =
        sweep >= 359.99
          ? `M ${cx} ${cy - outer} A ${outer} ${outer} 0 1 1 ${cx - 0.01} ${cy - outer} L ${cx} ${cy - inner} A ${inner} ${inner} 0 1 0 ${cx} ${cy - inner} Z`
          : `M ${x1o} ${y1o} A ${outer} ${outer} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${inner} ${inner} 0 ${large} 0 ${x2i} ${y2i} Z`

      return {
        ...seg,
        d,
        pct: pct * 100,
        amount: seg.value,
      }
    })

    return { total: t, arcs: list }
  }, [segments])

  if (!total) return null

  return (
    <div className="dash-alloc-card">
      <div className="dash-alloc-title">Allocation</div>
      <div className="dash-donut-wrap">
        <svg className="dash-donut" viewBox="0 0 200 200" role="img" aria-label="Portfolio allocation chart">
          {arcs.map((arc) => (
            <path
              key={arc.label}
              d={arc.d}
              fill={arc.color}
              className={`dash-donut-seg${hovered === arc.label ? ' dash-donut-seg--hover' : ''}`}
              onMouseEnter={() => setHovered(arc.label)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{`${arc.label}: ${arc.pct.toFixed(1)}% (${formatINR(arc.amount, true)})`}</title>
            </path>
          ))}
        </svg>
        <div className="dash-donut-center">
          {centerLabel && <div className="dash-donut-center-label">{centerLabel}</div>}
          {centerValue && <div className="dash-donut-center-value">{centerValue}</div>}
        </div>
      </div>
      <div className="dash-alloc-legend">
        {arcs.map((arc) => (
          <div
            key={arc.label}
            className={`dash-alloc-legend-item${hovered === arc.label ? ' dash-alloc-legend-item--active' : ''}`}
            onMouseEnter={() => setHovered(arc.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="dash-alloc-dot" style={{ background: arc.color }} />
            <span className="dash-alloc-legend-label">{arc.label}</span>
            <span className="dash-alloc-legend-pct">{arc.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
