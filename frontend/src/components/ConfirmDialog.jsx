import { useId, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Delete' }) {
  const modalRef = useRef(null)
  const titleId = useId()

  useFocusTrap(modalRef, true, onCancel)

  return (
    <div
      className="modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal confirm-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-body">
          <div className="confirm-icon">🗑️</div>
          <h3 id={titleId}>{title || 'Are you sure?'}</h3>
          <p>{message || 'This action cannot be undone.'}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
