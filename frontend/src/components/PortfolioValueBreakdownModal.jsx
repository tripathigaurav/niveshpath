import { useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { formatINR, formatPct, formatChange } from '../utils/formatters'
import { pnlColorClass } from '../utils/pnl'

function CellAmount({ value, compact }) {
  if (value == null) return <span className="pv-bd-muted">—</span>
  return <span>{formatINR(value, compact)}</span>
}

export default function PortfolioValueBreakdownModal({ breakdown, onClose }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true, onClose)

  if (!breakdown) return null

  const b = breakdown
  const check = b.totalsCheck

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pv-breakdown-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal pv-breakdown-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="pv-breakdown-title">Portfolio breakdown</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body pv-breakdown-body">
          <div className="pv-bd-summary">
            <div className="pv-bd-summary-row">
              <span>Value</span>
              <strong>{formatINR(b.grandCurrent, true)}</strong>
            </div>
            {b.portfolioTodayPnl != null && (
              <div className="pv-bd-summary-row">
                <span>Today</span>
                <strong className={pnlColorClass(b.portfolioTodayPnl)}>
                  {formatChange(b.portfolioTodayPnl)}
                  {b.portfolioTodayPct != null && ` (${formatPct(b.portfolioTodayPct)})`}
                </strong>
              </div>
            )}
            {b.grandPnl != null && (
              <div className="pv-bd-summary-row pv-bd-summary-row--sub">
                <span>All-time</span>
                <span className={pnlColorClass(b.grandPnl)}>
                  {formatChange(b.grandPnl)}
                  {b.grandPnlPct != null && ` (${formatPct(b.grandPnlPct)})`}
                </span>
              </div>
            )}
          </div>

          <table className="pv-bd-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="right">Value</th>
                <th className="right">Today</th>
              </tr>
            </thead>
            <tbody>
              {b.categories.filter((c) => c.count > 0).map((c) => (
                <tr key={c.id} className={!c.inTotal && c.count > 0 ? 'pv-bd-row--excluded' : ''}>
                  <td>
                    <span className="pv-bd-cat">{c.label}</span>
                    {c.hint && <span className="pv-bd-hint">{c.hint}</span>}
                  </td>
                  <td className="right">
                    <CellAmount value={c.current} compact />
                  </td>
                  <td className={`right ${c.todayPnl != null ? pnlColorClass(c.todayPnl) : ''}`}>
                    {c.todayPnl != null ? formatChange(c.todayPnl) : '—'}
                  </td>
                </tr>
              ))}
              <tr className="pv-bd-total">
                <td>
                  <strong>Total</strong>
                  {check.matchesValue && (
                    <span className="pv-bd-ok" title="Matches dashboard value">
                      ✓
                    </span>
                  )}
                </td>
                <td className="right">
                  <strong>
                    <CellAmount value={check.sumCurrent} compact />
                  </strong>
                </td>
                <td
                  className={`right ${b.portfolioTodayPnl != null ? pnlColorClass(b.portfolioTodayPnl) : ''}`}
                >
                  <strong>
                    {b.portfolioTodayPnl != null ? formatChange(b.portfolioTodayPnl) : '—'}
                  </strong>
                  {check.matchesToday && b.portfolioTodayPnl != null && (
                    <span className="pv-bd-ok" title="Today sums across categories">
                      {' '}
                      ✓
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {b.excludedNote && <p className="pv-bd-foot">{b.excludedNote}</p>}
          <p className="pv-bd-foot">
            Chart follows your buy/sell history. Today uses latest market prices where available.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
