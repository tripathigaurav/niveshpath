import { useEffect, useState } from 'react'
import styles from './Toast.module.css'

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const delay = toast.action ? 5800 : 2800
    const t1 = setTimeout(() => setExiting(true), delay)
    const t2 = setTimeout(() => onRemove(toast.id), delay + 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [toast.id, toast.action, onRemove])

  const icons = { success: '✓', error: '✕', info: 'ℹ' }
  const cls = [styles.toast, toast.type, exiting ? styles.exiting : ''].filter(Boolean).join(' ')

  return (
    <div role="status" aria-live="polite" className={cls}>
      <span className={styles.toastIcon}>{icons[toast.type] || 'ℹ'}</span>
      <span className={styles.toastMsg}>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className={styles.toastAction}
          onClick={() => { toast.action.onClick(); onRemove(toast.id) }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  )
}
