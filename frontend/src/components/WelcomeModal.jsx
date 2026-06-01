import { useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

export default function WelcomeModal({ onSave }) {
  const [name, setName] = useState('')
  const modalRef = useRef(null)

  useFocusTrap(modalRef, true, () => onSave(''))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(name.trim() || 'Investor')
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="modal welcome-modal" ref={modalRef}>
        <div className="modal-body">
          <div className="welcome-icon">
            <svg viewBox="0 0 34 28" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="40">
              <defs>
                <linearGradient id="wm-bar" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <rect x="1"  y="17" width="6.5" height="10" rx="1.5" fill="url(#wm-bar)" />
              <rect x="10" y="10" width="6.5" height="17" rx="1.5" fill="url(#wm-bar)" />
              <rect x="19" y="3"  width="6.5" height="24" rx="1.5" fill="url(#wm-bar)" />
              <path d="M 4.25 17 C 6 12 10 10 13.25 10 C 16.5 10 19 6 22.25 3" stroke="#3b82f6" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M 27 1 L 22.5 3 L 25 7" stroke="#3b82f6" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 id="welcome-title">Welcome to निवेश Path</h2>
          <p>Your personal investment dashboard. All data stays on your device — nothing is uploaded to any server.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group text-left">
              <label className="form-label">Let's start with your name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={40}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full justify-center">
              Get Started
            </button>
            <button
              type="button"
              className="welcome-skip-btn"
              onClick={() => onSave('')}
            >
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
