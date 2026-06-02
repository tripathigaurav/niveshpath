import { formatPct } from '../utils/formatters'
import { pnlColorClass } from '../utils/pnl'

export default function PerformersCard({ title, items, type, emptyMessage = 'No data yet' }) {
  return (
    <div className={`dash-perf-card dash-perf-card--${type}`}>
      <div className="dash-perf-title">{title}</div>
      {items.length === 0 ? (
        <p className="dash-perf-empty">{emptyMessage}</p>
      ) : (
        <ul className="dash-perf-list">
          {items.map((p) => (
            <li key={p.id} className="dash-perf-item">
              <span className="dash-perf-icon" aria-hidden="true">{p.icon}</span>
              <span className="dash-perf-name" title={p.name}>{p.symbol}</span>
              <span className={`dash-perf-pct ${pnlColorClass(p.pnlPct)}`}>
                {formatPct(p.pnlPct)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
