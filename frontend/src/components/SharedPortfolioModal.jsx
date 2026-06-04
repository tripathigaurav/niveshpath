import { useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { formatINR } from '../utils/formatters'

function calcPnl(qty, buyPrice, currentPrice) {
  if (!currentPrice || !buyPrice || !qty) return null
  return (currentPrice - buyPrice) * qty
}

function calcPnlPct(buyPrice, currentPrice) {
  if (!currentPrice || !buyPrice) return null
  return ((currentPrice - buyPrice) / buyPrice) * 100
}

export default function SharedPortfolioModal({ portfolio, onClose }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true, onClose)

  if (!portfolio) return null

  const { date, indianStocks = [], usStocks = [], mutualFunds = [], otherAssets = [] } = portfolio

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-portfolio-title"
    >
      <div className="modal modal--wide modal--tall" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="shared-portfolio-title">Shared Portfolio — {date}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <p className="shared-portfolio-note">
            Read-only snapshot shared on {date}. Values are as of the share date.
          </p>

          {indianStocks.length > 0 && (
            <section className="shared-section">
              <h3>Indian Stocks</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Symbol</th><th>Name</th><th className="num">Qty</th><th className="num">Avg cost</th><th className="num">Price</th><th className="num">P&amp;L</th></tr></thead>
                  <tbody>
                    {indianStocks.map((s) => {
                      const pnl = calcPnl(s.qty, s.buyPrice, s.currentPrice)
                      const pct = calcPnlPct(s.buyPrice, s.currentPrice)
                      return (
                        <tr key={s.symbol}>
                          <td className="mono">{s.symbol}</td>
                          <td>{s.name}</td>
                          <td className="num">{s.qty}</td>
                          <td className="num">{s.buyPrice ? formatINR(s.buyPrice) : '—'}</td>
                          <td className="num">{s.currentPrice ? formatINR(s.currentPrice) : '—'}</td>
                          <td className={`num ${pnl != null ? (pnl >= 0 ? 'pos' : 'neg') : ''}`}>
                            {pnl != null ? `${formatINR(pnl)} (${pct?.toFixed(1)}%)` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {usStocks.length > 0 && (
            <section className="shared-section">
              <h3>US Stocks</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Symbol</th><th>Name</th><th className="num">Qty</th><th className="num">Avg cost</th><th className="num">Price</th><th className="num">P&amp;L</th></tr></thead>
                  <tbody>
                    {usStocks.map((s) => {
                      const pnl = calcPnl(s.qty, s.buyPrice, s.currentPrice)
                      const pct = calcPnlPct(s.buyPrice, s.currentPrice)
                      return (
                        <tr key={s.symbol}>
                          <td className="mono">{s.symbol}</td>
                          <td>{s.name}</td>
                          <td className="num">{s.qty}</td>
                          <td className="num">{s.buyPrice ? `$${s.buyPrice.toFixed(2)}` : '—'}</td>
                          <td className="num">{s.currentPrice ? `$${s.currentPrice.toFixed(2)}` : '—'}</td>
                          <td className={`num ${pnl != null ? (pnl >= 0 ? 'pos' : 'neg') : ''}`}>
                            {pnl != null ? `${pct?.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {mutualFunds.length > 0 && (
            <section className="shared-section">
              <h3>Mutual Funds</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Fund</th><th className="num">Units</th><th className="num">Avg cost NAV</th><th className="num">Current NAV</th><th className="num">P&amp;L</th></tr></thead>
                  <tbody>
                    {mutualFunds.map((s, i) => {
                      const pnl = calcPnl(s.units, s.buyPrice, s.nav)
                      const pct = calcPnlPct(s.buyPrice, s.nav)
                      return (
                        <tr key={`${s.name}-${i}`}>
                          <td>{s.name}</td>
                          <td className="num">{s.units}</td>
                          <td className="num">{s.buyPrice ? formatINR(s.buyPrice) : '—'}</td>
                          <td className="num">{s.nav ? formatINR(s.nav) : '—'}</td>
                          <td className={`num ${pnl != null ? (pnl >= 0 ? 'pos' : 'neg') : ''}`}>
                            {pnl != null ? `${formatINR(pnl)} (${pct?.toFixed(1)}%)` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {otherAssets.length > 0 && (
            <section className="shared-section">
              <h3>Other Assets</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Category</th><th className="num">Value</th></tr></thead>
                  <tbody>
                    {otherAssets.map((s, i) => (
                      <tr key={`${s.name}-${i}`}>
                        <td>{s.name}</td>
                        <td>{s.category || '—'}</td>
                        <td className="num">{s.currentValue ? formatINR(s.currentValue) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {indianStocks.length + usStocks.length + mutualFunds.length + otherAssets.length === 0 && (
            <p>This shared portfolio appears to be empty.</p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
