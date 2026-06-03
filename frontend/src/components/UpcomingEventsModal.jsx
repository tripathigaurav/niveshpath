import { useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import UpcomingEventList from './UpcomingEventList'

export default function UpcomingEventsModal({ events, days = 30, onClose }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true, onClose)

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upcoming-events-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal dash-events-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="upcoming-events-title">
            Upcoming events
            <span className="dash-events-modal-sub">
              {events.length} in {days} days
            </span>
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body dash-events-modal-body">
          <UpcomingEventList events={events} className="dash-events-list dash-events-list--modal" />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
