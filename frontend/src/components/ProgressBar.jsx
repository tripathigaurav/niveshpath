import { useEffect, useState } from 'react'

export default function ProgressBar({ loading }) {
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (loading) {
      setDone(false)
      setVisible(true)
      setWidth(15)
      const t1 = setTimeout(() => setWidth(50), 200)
      const t2 = setTimeout(() => setWidth(80), 600)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    } else {
      setWidth(100)
      setDone(true)
      const t = setTimeout(() => { setVisible(false); setWidth(0) }, 600)
      return () => clearTimeout(t)
    }
  }, [loading])

  if (!visible) return null

  return (
    <div
      className={`progress-bar${done ? ' done' : ''}`}
      style={{ width: `${width}%` }}
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={loading ? 'Loading' : 'Complete'}
    />
  )
}
