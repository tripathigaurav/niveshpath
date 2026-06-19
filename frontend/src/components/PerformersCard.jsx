import { formatPct } from '../utils/formatters'
import { pnlColorClass } from '../utils/pnl'
import MiniSparkline from './MiniSparkline'

function formatAbsPnl(val) {
  if (val == null) return null
  const abs = Math.abs(val)
  if (abs >= 1e7) return `${val >= 0 ? '+' : '-'}₹${(abs / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${val >= 0 ? '+' : '-'}₹${(abs / 1e5).toFixed(2)}L`
  if (abs >= 1e3) return `${val >= 0 ? '+' : '-'}₹${(abs / 1e3).toFixed(1)}K`
  return `${val >= 0 ? '+' : '-'}₹${abs.toFixed(0)}`
}

export default function PerformersCard({ title, items, type, emptyMessage = 'No data yet' }) {
  return (
    <div className={`dash-perf-card dash-perf-card--${type}`}>
      <div className="dash-perf-title">{title} <span className="dash-perf-metric">by return %</span></div>
      {items.length === 0 ? (
        <p className="dash-perf-empty">{emptyMessage}</p>
      ) : (
        <ul className="dash-perf-list">
          {items.map((p) => (
            <li key={p.id} className="dash-perf-item">
              <span className="dash-perf-icon" aria-hidden="true">{p.icon}</span>
              <span className="dash-perf-name" title={p.name}>{p.name || p.symbol}</span>
              <MiniSparkline
                buyPrice={p.buyPrice}
                currentPrice={p.currentPrice}
                pnlPct={p.pnlPct}
              />
              <span className={`dash-perf-pct ${pnlColorClass(p.pnlPct)}`}>
                {formatPct(p.pnlPct)}
                {p.pnlAbs != null && (
                  <span className="dash-perf-abs">{formatAbsPnl(p.pnlAbs)}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
