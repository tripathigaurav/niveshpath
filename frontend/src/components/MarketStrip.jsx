import { useEffect, useState } from 'react'
import { api } from '../utils/api'

const ORDERED_KEYS = [
  'nifty50', 'sensex', 'niftyBank', 'usdInr', 'sp500', 'nasdaq', 'gold', 'crude',
]
const POLL_INTERVAL_MS = 30000

function Pill({ label, price, changePct, prefix = '' }) {
  const isPos = changePct > 0
  const isNeg = changePct < 0
  const sign = isPos ? '+' : ''

  return (
    <div className="ms-pill">
      <span className="ms-label">{label}</span>
      <span className="ms-price">
        {prefix}{price != null
          ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 })
          : '—'}
      </span>
      {changePct != null && (
        <span className={`ms-change ${isPos ? 'pos' : isNeg ? 'neg' : ''}`}>
          {sign}{changePct.toFixed(2)}%
        </span>
      )}
    </div>
  )
}

function SkeletonPill() {
  return (
    <div className="ms-pill">
      <span className="skeleton skeleton-pill" />
    </div>
  )
}

export default function MarketStrip() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await api.getMarketOverview()
        if (!cancelled) {
          setData(res)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (error && !data) {
    return (
      <div className="market-strip-dark market-strip-error">
        <span className="market-strip-error-text">Market data unavailable</span>
      </div>
    )
  }

  const pills = data
    ? ORDERED_KEYS.map((key) => {
        const item = data[key]
        if (!item) return null
        const prefix = key === 'usdInr' ? '₹' : key === 'gold' || key === 'crude' ? '$' : ''
        return (
          <Pill
            key={key}
            label={item.label || key}
            price={item.price}
            changePct={item.dayChangePct}
            prefix={prefix}
          />
        )
      }).filter(Boolean)
    : Array.from({ length: 8 }).map((_, i) => <SkeletonPill key={i} />)

  const withSeps = pills.flatMap((p, i, arr) => i < arr.length - 1
    ? [p, <div key={`sep-${i}`} className="ms-sep" />]
    : [p]
  )

  return (
    <div className="market-strip-dark">
      <div className="ms-ticker-wrap">
        <div className="ms-ticker-track">{withSeps}</div>
        <div className="ms-ticker-track" aria-hidden="true">{withSeps}</div>
      </div>
    </div>
  )
}
