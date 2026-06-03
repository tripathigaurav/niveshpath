import { formatEventDate } from '../utils/upcomingEventsFormat'

/**
 * @param {{ events: { symbol: string, date: string, type: string, detail: string, region?: string }[], className?: string }} props
 */
export default function UpcomingEventList({ events, className = 'dash-events-list' }) {
  if (!events.length) return null

  return (
    <ul className={className}>
      {events.map((ev) => (
        <li key={`${ev.symbol}-${ev.date}-${ev.type}`} className="dash-events-item">
          <span className={`dash-events-icon dash-events-icon--${ev.type}`} aria-hidden="true">
            {ev.region === 'US' ? '🇺🇸' : '🇮🇳'}
          </span>
          <div className="dash-events-body">
            <span className="dash-events-symbol">{ev.symbol}</span>
            <span className="dash-events-detail">{ev.detail}</span>
          </div>
          <span className="dash-events-date">{formatEventDate(ev.date)}</span>
        </li>
      ))}
    </ul>
  )
}
