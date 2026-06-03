import { useId, useRef, useState } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useOtherAssetDetail } from '../hooks/useOtherAssetDetail'
import { formatINR, formatPct, formatChange, formatDate } from '../utils/formatters'
import { pnlColorClass } from '../utils/pnl'
import HoldingTransactionTable from './HoldingTransactionTable'
import { ASSET_TYPES } from './AddOtherAssetModal'

const TYPE_LABEL = Object.fromEntries(ASSET_TYPES.map((t) => [t.value, t.label]))

const TABS = [
  { id: 'pnl', label: 'Overview' },
  { id: 'history', label: 'Transaction History' },
]

export default function OtherAssetDetailModal({
  asset,
  open,
  onClose,
  onEdit,
  onDelete,
  showToast,
}) {
  const modalRef = useRef(null)
  const titleId = useId()
  const [tab, setTab] = useState('pnl')

  const { transactions, pnl, refresh } = useOtherAssetDetail(asset)

  useFocusTrap(modalRef, open, onClose)

  if (!open || !asset) return null

  const typeLabel = TYPE_LABEL[asset.type] ?? asset.type

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
              {asset.name}
            </h2>
            <p className="holding-detail-name">{typeLabel}</p>
            {asset.addedDate && (
              <p className="holding-detail-asof">Added on {formatDate(asset.addedDate)}</p>
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
                <span className="holding-pnl-val">{formatINR(pnl.invested, true)}</span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Current Value</span>
                <span className="holding-pnl-val">
                  {pnl.current != null ? formatINR(pnl.current, true) : '—'}
                </span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Gain / Loss</span>
                <span className={`holding-pnl-val ${pnlColorClass(pnl.pnl)}`}>
                  {pnl.pnl != null ? formatChange(pnl.pnl) : '—'}
                  {pnl.pnlPct != null && ` (${formatPct(pnl.pnlPct)})`}
                </span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Realized P&amp;L</span>
                <span className={`holding-pnl-val ${pnlColorClass(pnl.realized)}`}>
                  {formatChange(pnl.realized)}
                </span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Asset Type</span>
                <span className="holding-pnl-val">{typeLabel}</span>
              </div>
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Added Date</span>
                <span className="holding-pnl-val">
                  {asset.addedDate ? formatDate(asset.addedDate) : '—'}
                </span>
              </div>
              {asset.notes && (
                <div className="holding-pnl-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="holding-pnl-label">Notes</span>
                  <span className="holding-pnl-val">{asset.notes}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <HoldingTransactionTable
              stock={{ ...asset, assetType: 'otherAsset', symbol: asset.name }}
              transactions={transactions}
              suggestions={[]}
              suggestionsLoading={false}
              suggestionsError={null}
              onRefresh={refresh}
              showToast={showToast}
            />
          )}
        </div>

        <div className="modal-footer holding-detail-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              onEdit(asset)
              onClose()
            }}
          >
            Edit asset
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onDelete(asset)
              onClose()
            }}
          >
            Delete asset
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
