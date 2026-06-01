import { useEffect, useState } from 'react'

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2800)
    const t2 = setTimeout(() => onRemove(toast.id), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [toast.id, onRemove])

  const icons = { success: '✓', error: '✕', info: 'ℹ' }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast ${toast.type}${exiting ? ' exiting' : ''}`}
    >
      <span className="toast-icon">{icons[toast.type] || 'ℹ'}</span>
      <span className="toast-msg">{toast.message}</span>
    </div>
  )
}

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  )
}
