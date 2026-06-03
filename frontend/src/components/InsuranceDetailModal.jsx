import { useId, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { formatINR, formatDate } from '../utils/formatters'
import { daysUntilRenewal } from '../utils/insuranceMetrics'

const TYPE_META = {
  health: { label: 'Health Insurance', icon: '🏥', color: 'var(--blue)' },
  term: { label: 'Term Insurance', icon: '🛡️', color: 'var(--green)' },
}

function RenewalStatus({ dateStr }) {
  if (!dateStr) return null
  const days = daysUntilRenewal(dateStr)
  let status = 'Active'
  let cls = 'ins-status-badge ins-status-badge--ok'
  
  if (days <= 0) {
    status = 'Overdue'
    cls = 'ins-status-badge ins-status-badge--overdue'
  } else if (days <= 30) {
    status = `Renews in ${days} days`
    cls = 'ins-status-badge ins-status-badge--urgent'
  } else if (days <= 90) {
    status = `Renews in ${days} days`
    cls = 'ins-status-badge ins-status-badge--soon'
  }

  return <span className={cls}>{status}</span>
}

export default function InsuranceDetailModal({
  policy,
  open,
  onClose,
  onEdit,
  onDelete,
}) {
  const modalRef = useRef(null)
  const titleId = useId()

  useFocusTrap(modalRef, open, onClose)

  if (!open || !policy) return null

  const meta = TYPE_META[policy.type] ?? { label: policy.type, icon: '📄', color: 'var(--text-3)' }

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
              <span className="ins-type-icon" aria-hidden="true">{meta.icon}</span>
              {policy.name}
            </h2>
            <p className="holding-detail-name">{meta.label}</p>
            {policy.renewalDate && (
              <p className="holding-detail-asof">
                <RenewalStatus dateStr={policy.renewalDate} />
              </p>
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

        <div className="holding-detail-body">
          <div className="holding-pnl-grid">
            <div className="holding-pnl-item">
              <span className="holding-pnl-label">Annual Premium</span>
              <span className="holding-pnl-val">{formatINR(policy.premium, true)}</span>
            </div>
            {policy.coverAmount != null && (
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Cover Amount</span>
                <span className="holding-pnl-val">{formatINR(policy.coverAmount, true)}</span>
              </div>
            )}
            <div className="holding-pnl-item">
              <span className="holding-pnl-label">Policy Type</span>
              <span className="holding-pnl-val">{meta.label}</span>
            </div>
            {policy.startDate && (
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Start Date</span>
                <span className="holding-pnl-val">{formatDate(policy.startDate)}</span>
              </div>
            )}
            {policy.renewalDate && (
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Renewal Date</span>
                <span className="holding-pnl-val">{formatDate(policy.renewalDate)}</span>
              </div>
            )}
            {policy.renewalDate && (
              <div className="holding-pnl-item">
                <span className="holding-pnl-label">Days Until Renewal</span>
                <span className="holding-pnl-val">
                  {daysUntilRenewal(policy.renewalDate) > 0
                    ? `${daysUntilRenewal(policy.renewalDate)} days`
                    : 'Overdue'}
                </span>
              </div>
            )}
            {policy.notes && (
              <div className="holding-pnl-item" style={{ gridColumn: '1 / -1' }}>
                <span className="holding-pnl-label">Notes</span>
                <span className="holding-pnl-val">{policy.notes}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer holding-detail-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              onEdit(policy)
              onClose()
            }}
          >
            Edit policy
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onDelete(policy)
              onClose()
            }}
          >
            Delete policy
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
