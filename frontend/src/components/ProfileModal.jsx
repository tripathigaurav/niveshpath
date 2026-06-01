import { useState, useRef, useEffect } from 'react'
import { getGreeting } from '../utils/formatters'
import { getInitials } from '../utils/initials'
import { useFocusTrap } from '../hooks/useFocusTrap'

const AVATAR_COLORS = [
  '#1e3a8a', '#2563eb', '#7c3aed', '#db2777',
  '#dc2626', '#16a34a', '#0891b2', '#4f46e5',
]

function pickColor(name) {
  if (!name) return AVATAR_COLORS[0]
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

export default function ProfileModal({ settings, onSave, onClose }) {
  const [name, setName] = useState(settings.userName || '')
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef(null)
  const modalRef = useRef(null)

  useFocusTrap(modalRef, true, onClose)

  const avatarColor = settings.avatarColor || pickColor(settings.userName)
  const initials = getInitials(name || settings.userName)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const handleSave = () => {
    const color = settings.avatarColor || pickColor(name || settings.userName)
    onSave({ ...settings, userName: name.trim() || settings.userName, avatarColor: color })
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal profile-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <div className="profile-avatar-lg" style={{ background: avatarColor }}>
            {initials}
          </div>
          <div className="profile-greeting" id="profile-modal-title">
            {getGreeting(name || settings.userName)}
          </div>
          <div className="profile-name-display">{name || settings.userName}</div>
        </div>

        <div className="modal-body profile-modal-body">
          <div className="profile-section">
            <div className="profile-section-label">Display Name</div>
            <div className="profile-name-row">
              {editing ? (
                <input
                  ref={inputRef}
                  className="form-input profile-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') { setName(settings.userName); setEditing(false) }
                  }}
                  placeholder="Your name"
                  maxLength={32}
                />
              ) : (
                <span className="profile-name-value">{name || settings.userName || '—'}</span>
              )}
              <button
                className="btn btn-ghost profile-edit-btn"
                onClick={() => setEditing((v) => !v)}
                title={editing ? 'Cancel' : 'Edit name'}
              >
                {editing ? '✕' : '✏️'}
              </button>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-label">More</div>
            <div className="profile-disabled-row">
              <span className="profile-toggle-icon">⚙️</span>
              <span className="profile-toggle-label">Settings</span>
              <span className="profile-coming-soon">coming soon</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!editing && !saved}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
