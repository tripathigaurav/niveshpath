import { useEffect, useState } from 'react'
import styles from './Toast.module.css'

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2800)
    const t2 = setTimeout(() => onRemove(toast.id), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [toast.id, onRemove])

  const icons = { success: '✓', error: '✕', info: 'ℹ' }
  const cls = [styles.toast, toast.type, exiting ? 'exiting' : ''].filter(Boolean).join(' ')

  return (
    <div role="status" aria-live="polite" className={cls}>
      <span className={styles.toastIcon}>{icons[toast.type] || 'ℹ'}</span>
      <span className={styles.toastMsg}>{toast.message}</span>
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
