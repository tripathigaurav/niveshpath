import { useState } from 'react'
import { useUpcomingEvents } from '../hooks/useUpcomingEvents'
import { UPCOMING_EVENTS_PREVIEW_LIMIT } from '../utils/upcomingEventsFormat'
import UpcomingEventList from './UpcomingEventList'
import UpcomingEventsModal from './UpcomingEventsModal'

const EVENTS_WINDOW_DAYS = 30

const EVENTS_ERROR_COPY = {
  offline:
    "Couldn't reach the events feed. Check your connection and try again in a moment.",
  outdated:
    "Events calendar isn't fully available right now. Dividend dates from your holdings may still appear.",
  staticHost:
    'Live dividend and earnings calendar is not available in this view. Holdings and prices still work.',
  generic: 'Could not load events. Try again in a moment.',
}

export default function UpcomingEventsCard() {
  const { events, loading, error, errorKind } = useUpcomingEvents(EVENTS_WINDOW_DAYS)
  const [modalOpen, setModalOpen] = useState(false)

  const preview = events.slice(0, UPCOMING_EVENTS_PREVIEW_LIMIT)
  const hiddenCount = Math.max(0, events.length - UPCOMING_EVENTS_PREVIEW_LIMIT)
  const hasMore = hiddenCount > 0

  return (
    <div className="dash-events-card">
      <div className="dash-events-header">
        <div className="dash-perf-title">Upcoming Events</div>
        <span className="dash-events-badge">{EVENTS_WINDOW_DAYS} days</span>
      </div>
      {loading && <p className="dash-events-note">Loading calendar…</p>}
      {error && (
        <p className="dash-events-note">
          {EVENTS_ERROR_COPY[errorKind] || EVENTS_ERROR_COPY.generic}
        </p>
      )}
      {!loading && !error && events.length === 0 && (
        <p className="dash-events-note">
          No dividends or earnings in the next {EVENTS_WINDOW_DAYS} days for your holdings.
        </p>
      )}
      {!loading && !error && events.length > 0 && (
        <>
          <UpcomingEventList events={preview} />
          {hasMore && (
            <button
              type="button"
              className="dash-events-more-btn"
              onClick={() => setModalOpen(true)}
              aria-label={`Show all ${events.length} upcoming events`}
            >
              Show all {events.length} events
              <span className="dash-events-more-btn-sub">+{hiddenCount} more</span>
            </button>
          )}
        </>
      )}
      {modalOpen && (
        <UpcomingEventsModal
          events={events}
          days={EVENTS_WINDOW_DAYS}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
