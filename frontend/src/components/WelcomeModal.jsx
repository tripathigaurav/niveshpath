import { useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import styles from './WelcomeModal.module.css'

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
      <div className={`modal ${styles.welcomeModal}`} ref={modalRef}>
        <div className="modal-body">
          <div className={styles.welcomeIcon}>
            <img
              src={`${import.meta.env.BASE_URL}logo-icon.png`}
              alt="निवेश Path"
              style={{ height: 56, width: 56, objectFit: 'contain' }}
            />
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
              className={styles.welcomeSkipBtn}
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
