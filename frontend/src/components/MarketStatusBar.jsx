import { useEffect, useState } from 'react'
import { getMarketStatus } from '../utils/marketHours'

/**
 * @param {{ market: 'indian' | 'us' }} props
 */
export default function MarketStatusBar({ market }) {
  const [status, setStatus] = useState(() => getMarketStatus(market))

  useEffect(() => {
    const tick = () => setStatus(getMarketStatus(market))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [market])

  const dotClass =
    status.state === 'open'
      ? 'market-status-dot--open'
      : status.state === 'special'
        ? 'market-status-dot--special'
        : 'market-status-dot--closed'

  return (
    <div
      className={`market-status-bar market-status-bar--${status.state}`}
      role="status"
      aria-live="polite"
    >
      <span className={`market-status-dot ${dotClass}`} aria-hidden="true" />
      <div className="market-status-main">
        <span className="market-status-exchange">{status.exchangeLabel}</span>
        <span className="market-status-sep">·</span>
        <span className="market-status-label">{status.statusLabel}</span>
      </div>
      <div className="market-status-meta">
        <span className="market-status-hours">{status.hoursLabel}</span>
        <span className="market-status-sep">·</span>
        <span className="market-status-clock" title={`Local exchange time (${status.tzShort})`}>
          {status.localTime} {status.tzShort}
        </span>
      </div>
      {status.preOpenLabel && status.state !== 'holiday' && status.state !== 'weekend' && (
        <div className="market-status-sub">{status.preOpenLabel}</div>
      )}
    </div>
  )
}
