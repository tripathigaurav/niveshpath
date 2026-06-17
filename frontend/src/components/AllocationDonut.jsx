import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { formatINR } from '../utils/formatters'

const STORAGE_KEY = 'pt_alloc_visible'
const SUB_STORAGE_KEY = 'pt_alloc_sub_visible'

const SUB_COLORS = [
  '#e67e22', '#d35400', '#f39c12', '#e74c3c',
  '#9b59b6', '#1abc9c', '#2980b9', '#27ae60', '#95a5a6',
]

function loadVisibleCategories(allLabels) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return allLabels
}

function saveVisibleCategories(labels) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels))
  } catch { /* ignore */ }
}

const DEFAULT_HIDDEN_SUBS = ['RealEstate', 'Other']

function loadVisibleSubs(allSubs) {
  try {
    const raw = localStorage.getItem(SUB_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  const defaults = allSubs.filter((s) => !DEFAULT_HIDDEN_SUBS.includes(s))
  return defaults.length > 0 ? defaults : allSubs
}

function saveVisibleSubs(labels) {
  try {
    localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(labels))
  } catch { /* ignore */ }
}

/**
 * SVG donut chart for portfolio allocation with clickable category selector.
 * segments: { label, value, color, expandable?, subSegments? }[]
 */
export default function AllocationDonut({ segments, centerLabel, centerValue }) {
  const [hovered, setHovered] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const pickerRef = useRef(null)

  const allLabels = useMemo(() => segments.map((s) => s.label), [segments])
  const [visible, setVisible] = useState(() => loadVisibleCategories(allLabels))

  const allSubLabels = useMemo(() => {
    const seg = segments.find((s) => s.expandable && s.subSegments)
    return seg ? seg.subSegments.map((s) => s.label) : []
  }, [segments])

  const [visibleSubs, setVisibleSubs] = useState(() => loadVisibleSubs(allSubLabels))

  useEffect(() => {
    if (allSubLabels.length === 0) return
    setVisibleSubs((prev) => {
      const valid = prev.filter((v) => allSubLabels.includes(v))
      if (valid.length === 0) return allSubLabels
      return valid
    })
  }, [allSubLabels])

  useEffect(() => {
    const updated = visible.filter((v) => allLabels.includes(v))
    if (updated.length === 0 && allLabels.length > 0) {
      setVisible(allLabels)
      saveVisibleCategories(allLabels)
    }
  }, [allLabels])

  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const toggleCategory = useCallback((label) => {
    setVisible((prev) => {
      const next = prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
      if (next.length === 0) return prev
      saveVisibleCategories(next)
      return next
    })
  }, [])

  const toggleSub = useCallback((label) => {
    setVisibleSubs((prev) => {
      const next = prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
      if (next.length === 0) return prev
      saveVisibleSubs(next)
      return next
    })
  }, [])

  const filteredSegments = useMemo(() => {
    const base = segments.filter((s) => visible.includes(s.label))
    if (!expanded) return base
    return base.flatMap((seg) => {
      if (seg.expandable && seg.subSegments && seg.subSegments.length > 0) {
        return seg.subSegments
          .filter((sub) => visibleSubs.includes(sub.label))
          .map((sub, i) => ({
            label: sub.label,
            value: sub.value,
            color: SUB_COLORS[i % SUB_COLORS.length],
            isSubSegment: true,
            parentLabel: seg.label,
          }))
      }
      return [seg]
    })
  }, [segments, visible, expanded, visibleSubs])

  const expandableSegment = useMemo(
    () => segments.find((s) => s.expandable && s.subSegments && s.subSegments.length > 1),
    [segments]
  )

  const { total, arcs } = useMemo(() => {
    const t = filteredSegments.reduce((s, seg) => s + (seg.value || 0), 0)
    if (!t) return { total: 0, arcs: [] }

    const cx = 100
    const cy = 100
    const outer = 88
    const inner = 52
    let angle = -90

    const list = filteredSegments.map((seg) => {
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
  }, [filteredSegments])

  if (!segments.length) return null

  return (
    <div className="dash-alloc-card">
      <div className="dash-alloc-header">
        <div className="dash-alloc-title">Allocation</div>
        <div className="dash-alloc-picker-wrap" ref={pickerRef}>
          <button
            type="button"
            className="dash-alloc-picker-btn"
            onClick={() => setPickerOpen((v) => !v)}
            title="Choose categories"
            aria-label="Select allocation categories"
          >
            ⚙
          </button>
          {pickerOpen && (
            <div className="dash-alloc-picker">
              {segments.map((seg) => (
                <label key={seg.label} className="dash-alloc-picker-item">
                  <input
                    type="checkbox"
                    checked={visible.includes(seg.label)}
                    onChange={() => toggleCategory(seg.label)}
                    disabled={visible.length === 1 && visible.includes(seg.label)}
                  />
                  <span className="dash-alloc-dot" style={{ background: seg.color }} />
                  <span>{seg.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {total > 0 ? (
        <>
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
                  onClick={arc.expandable ? () => setExpanded((v) => !v) : undefined}
                  style={arc.expandable ? { cursor: 'pointer' } : undefined}
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
                className={`dash-alloc-legend-item${hovered === arc.label ? ' dash-alloc-legend-item--active' : ''}${arc.isSubSegment ? ' dash-alloc-legend-item--sub' : ''}`}
                onMouseEnter={() => setHovered(arc.label)}
                onMouseLeave={() => setHovered(null)}
                onClick={arc.expandable ? () => setExpanded((v) => !v) : undefined}
                style={arc.expandable ? { cursor: 'pointer' } : undefined}
              >
                <span className="dash-alloc-dot" style={{ background: arc.color }} />
                <span className="dash-alloc-legend-label">
                  {arc.label}
                  {arc.expandable && <span className="dash-alloc-expand-icon">{expanded ? ' ▾' : ' ▸'}</span>}
                </span>
                <span className="dash-alloc-legend-pct">{arc.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {expandableSegment && visible.includes(expandableSegment.label) && (
            <div className="dash-alloc-expand-section">
              <button
                type="button"
                className="dash-alloc-expand-btn"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Collapse Other Assets ▴' : 'Expand Other Assets ▾'}
              </button>
              {expanded && allSubLabels.length > 1 && (
                <div className="dash-alloc-sub-chips" role="group" aria-label="Other asset sub-categories">
                  {allSubLabels.map((label) => {
                    const active = visibleSubs.includes(label)
                    const disabled = active && visibleSubs.length === 1
                    return (
                      <button
                        key={label}
                        type="button"
                        className={`dash-alloc-sub-chip${active ? ' dash-alloc-sub-chip--active' : ''}`}
                        onClick={() => toggleSub(label)}
                        disabled={disabled}
                        aria-pressed={active}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="dash-alloc-empty">No categories selected</p>
      )}
    </div>
  )
}
