import { useId, useRef, useState } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useUSHoldingDetail } from '../hooks/useUSHoldingDetail'
import { formatUSD, formatINR, formatPct, formatChange, formatDate } from '../utils/formatters'
import { formatXirrDisplay } from '../utils/xirrMetrics'
import { pnlColorClass } from '../utils/pnl'
import HoldingTransactionTable from './HoldingTransactionTable'

const TABS = [
  { id: 'pnl', label: 'Profit and Loss' },
  { id: 'history', label: 'Transaction History' },
  { id: 'graphs', label: 'Graphs' },
  { id: 'alerts', label: 'Alerts' },
]

function formatPriceAsOf(lastUpdated) {
  if (!lastUpdated) return null
  return new Date(lastUpdated).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function USHoldingDetailModal({
  stock,
  open,
  onClose,
  onEdit,
  onDelete,
  lastUpdated,
  showToast,
  usdInr,
  showInr,
}) {
  const modalRef = useRef(null)
  const titleId = useId()
  const [tab, setTab] = useState('history')
  const loadSuggestions = tab === 'history'

  const {
    transactions,
    pnl,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    refresh,
  } = useUSHoldingDetail(stock, { loadSuggestions, usdInr })

  useFocusTrap(modalRef, open, onClose)

  if (!open || !stock) return null

  const priceAsOf = formatPriceAsOf(lastUpdated)
  const fx = showInr && usdInr ? usdInr : null
  const fmtMain = fx ? (v) => formatINR(v * fx, true) : (v) => formatUSD(v)
  const fmtSub = fx ? (v) => formatUSD(v) : (v) => (usdInr ? formatINR(v * usdInr, true) : null)
  const fmtChg = fx ? (v) => formatChange(v * fx) : (v) => formatChange(v, 'USD')

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal holding-detail-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="holding-detail-header">
          <div className="holding-detail-title-block">
            <h2 id={titleId} className="holding-detail-symbol">
              {stock.symbol}
              {stock.isEtf && (
                <span className="us-etf-badge in-etf-badge">ETF</span>
              )}
            </h2>
            <p className="holding-detail-name">{stock.name}</p>
            {priceAsOf && (
              <p className="holding-detail-asof">Price as of {priceAsOf} EST</p>
            )}
            {usdInr && (
              <p className="holding-detail-asof">1 USD = ₹{usdInr.toFixed(2)}</p>
            )}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="holding-detail-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`holding-detail-tab${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="holding-detail-body">
          {tab === 'pnl' && pnl && (
            <div className="holding-pnl-grid">
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Invested</span>
                <span className="holding-pnl-val">{fmtMain(pnl.invested)}</span>
                {fmtSub(pnl.invested) && (
                  <span className="holding-pnl-sub">{fmtSub(pnl.invested)}</span>
                )}
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Current Value</span>
                <span className="holding-pnl-val">
                  {pnl.current != null ? fmtMain(pnl.current) : '—'}
                </span>
                {fmtSub(pnl.current) && (
                  <span className="holding-pnl-sub">{fmtSub(pnl.current)}</span>
                )}
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Unrealized P&amp;L</span>
                <span className={`holding-pnl-val ${pnlColorClass(pnl.pnl)}`}>
                  {pnl.pnl != null ? fmtChg(pnl.pnl) : '—'}
                  {pnl.pnlPct != null && ` (${formatPct(pnl.pnlPct)})`}
                </span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Realized P&amp;L</span>
                <span className={`holding-pnl-val ${pnlColorClass(pnl.realized)}`}>
                  {fmtChg(pnl.realized)}
                </span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Today</span>
                <span className={`holding-pnl-val ${pnlColorClass(pnl.todayPnl)}`}>
                  {pnl.todayPnl != null ? fmtChg(pnl.todayPnl) : '—'}
                </span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">XIRR</span>
                <span className={`holding-pnl-val ${pnlColorClass(pnl.xirr)}`}>
                  {formatXirrDisplay(pnl.xirr)}
                </span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Qty · Avg cost</span>
                <span className="holding-pnl-val">
                  {stock.qty.toLocaleString('en-US')} @ {formatUSD(stock.buyPrice)}
                </span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Buy date</span>
                <span className="holding-pnl-val">
                  {stock.buyDate ? formatDate(stock.buyDate) : '—'}
                </span>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <HoldingTransactionTable
              stock={{ ...stock, assetType: 'usStock' }}
              transactions={transactions}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              suggestionsError={suggestionsError}
              onRefresh={refresh}
              showToast={showToast}
            />
          )}

          {tab === 'graphs' && (
            <div className="holding-detail-stub">
              <p>Price chart for this holding is planned for a future release.</p>
              <p className="holding-detail-stub-sub">
                Portfolio-level history is on the Dashboard.
              </p>
            </div>
          )}

          {tab === 'alerts' && (
            <div className="holding-detail-stub">
              <p>Price target alerts will ship with the Phase 7 Watchlist.</p>
            </div>
          )}
        </div>

        <div className="modal-footer holding-detail-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              onEdit(stock)
              onClose()
            }}
          >
            Edit holding
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onDelete(stock)
              onClose()
            }}
          >
            Delete holding
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
