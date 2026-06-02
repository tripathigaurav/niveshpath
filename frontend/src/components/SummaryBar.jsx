/**
 * Reusable metric tiles bar shown above holdings tables and on the dashboard.
 *
 * variant: 'strip' (default, connected tiles) | 'elevated' (separate cards with gap)
 *
 * metrics: Array<{
 *   label: string
 *   value: string
 *   sub?: string
 *   colorClass?: string
 *   accent?: 'gain'|'loss'
 *   pulse?: boolean
 *   icon?: string
 * }>
 */
export default function SummaryBar({ metrics, className = '', variant = 'strip' }) {
  if (!metrics?.length) return null
  const isElevated = variant === 'elevated'
  return (
    <div
      className={`summary-bar${isElevated ? ' summary-bar--elevated' : ''}${className ? ` ${className}` : ''}`}
    >
      {metrics.map((m, i) => (
        <div
          key={i}
          className={`summary-bar-tile${m.accent ? ` summary-bar-tile--${m.accent}` : ''}`}
          data-accent={m.accent || undefined}
        >
          {m.icon && <span className="summary-bar-icon" aria-hidden="true">{m.icon}</span>}
          <div className="summary-bar-tile-inner">
            <div className="summary-bar-label">{m.label}</div>
            <div
              className={`summary-bar-value${m.pulse ? ' pnl-pulse' : ''}${m.colorClass ? ` ${m.colorClass}` : ''}`}
            >
              {m.value ?? '—'}
            </div>
            {m.sub && (
              <div className={`summary-bar-sub${m.colorClass ? ` ${m.colorClass}` : ''}`}>
                {m.sub}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
