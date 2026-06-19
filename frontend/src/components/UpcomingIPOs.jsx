import { useEffect, useState, useCallback } from 'react'
import { api } from '../utils/api'

function statusBadge(status) {
  if (!status) return null
  const s = status.toLowerCase()
  if (s.includes('open')) return <span className="ipo-badge ipo-badge--open">Open</span>
  if (s.includes('upcoming') || s.includes('forthcoming')) return <span className="ipo-badge ipo-badge--upcoming">Upcoming</span>
  if (s.includes('closed') || s.includes('listed')) return <span className="ipo-badge ipo-badge--closed">{status}</span>
  return <span className="ipo-badge">{status}</span>
}

export default function UpcomingIPOs() {
  const [ipos, setIpos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    api.getUpcomingIPOs()
      .then((res) => setIpos(res.ipos || []))
      .catch((err) => setError(err?.message || 'Failed to load IPO data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="ipo-loading">
        <span className="text-2">Loading IPO data…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ipo-empty">
        <p className="text-2" style={{ color: 'var(--red)' }}>{error}</p>
        <button className="btn btn-sm btn-secondary" onClick={fetchData} style={{ marginTop: 6 }}>Retry</button>
      </div>
    )
  }

  if (!ipos.length) {
    return (
      <div className="ipo-empty">
        <p className="text-2">No upcoming IPOs found right now.</p>
      </div>
    )
  }

  return (
    <div className="ipo-grid">
      {ipos.map((ipo, i) => (
        <div key={ipo.name + i} className="ipo-card">
          <div className="ipo-card-head">
            <span className="ipo-market">{ipo.market === 'IN' ? '🇮🇳' : '🇺🇸'}</span>
            <span className="ipo-name">{ipo.name}</span>
            {statusBadge(ipo.status)}
          </div>
          <div className="ipo-card-body">
            {ipo.symbol && (
              <div className="ipo-detail">
                <span className="ipo-detail-label">Symbol</span>
                <span className="ipo-detail-val">{ipo.symbol}</span>
              </div>
            )}
            {ipo.price && (
              <div className="ipo-detail">
                <span className="ipo-detail-label">Price</span>
                <span className="ipo-detail-val">{ipo.price}</span>
              </div>
            )}
            {(ipo.openDate || ipo.closeDate) && (
              <div className="ipo-detail">
                <span className="ipo-detail-label">Dates</span>
                <span className="ipo-detail-val">
                  {ipo.openDate}{ipo.openDate && ipo.closeDate ? ' – ' : ''}{ipo.closeDate}
                </span>
              </div>
            )}
            {ipo.subscription && (
              <div className="ipo-detail">
                <span className="ipo-detail-label">Subscribed</span>
                <span className="ipo-detail-val">{ipo.subscription}</span>
              </div>
            )}
            {ipo.type && (
              <div className="ipo-detail">
                <span className="ipo-detail-label">Type</span>
                <span className="ipo-detail-val">{ipo.type}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
