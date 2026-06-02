import { useState, useRef, useEffect, useMemo } from 'react'
import { getGreeting, formatDate } from '../utils/formatters'
import { getInitials } from '../utils/initials'
import { useFocusTrap } from '../hooks/useFocusTrap'
import ConfirmDialog from './ConfirmDialog'
import { CATEGORIES } from '../utils/portfolioBackup'

const AVATAR_COLORS = [
  '#1e3a8a', '#2563eb', '#7c3aed', '#db2777',
  '#dc2626', '#16a34a', '#0891b2', '#4f46e5',
]

function pickColor(name) {
  if (!name) return AVATAR_COLORS[0]
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function formatLastExport(iso) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Never'
  return formatDate(iso.slice(0, 10)) + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30 sec', value: 30 },
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '30 min', value: 1800 },
]

function normaliseInterval(v) {
  const n = Number(v)
  const valid = REFRESH_OPTIONS.map((o) => o.value)
  return valid.includes(n) ? n : 0
}

export default function ProfileModal({
  settings,
  onSave,
  onClose,
  onExport,
  onImport,
  onCategoryExport,
  onCategoryImport,
  onLoadSample,
  showToast,
}) {
  const [name, setName] = useState(settings.userName || '')
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(() => normaliseInterval(settings.autoRefreshInterval))
  const [confirmExport, setConfirmExport] = useState(false)
  const [confirmImport, setConfirmImport] = useState(false)
  const [confirmSample, setConfirmSample] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [catConfirm, setCatConfirm] = useState(null) // { key, label, file }
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0].key)
  const [backupInfoOpen, setBackupInfoOpen] = useState(false)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const catFileInputRef = useRef(null)
  const modalRef = useRef(null)

  useFocusTrap(modalRef, true, onClose)

  const avatarColor = settings.avatarColor || pickColor(settings.userName)
  const initials = getInitials(name || settings.userName)

  const hasChanges = useMemo(() => {
    return (
      name.trim() !== (settings.userName || '').trim() ||
      refreshInterval !== normaliseInterval(settings.autoRefreshInterval)
    )
  }, [name, refreshInterval, settings.userName, settings.autoRefreshInterval])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const handleSave = () => {
    const color = settings.avatarColor || pickColor(name || settings.userName)
    onSave({
      ...settings,
      userName: name.trim() || settings.userName,
      avatarColor: color,
      autoRefreshInterval: refreshInterval,
    })
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 1800)
  }

  const handleExportConfirm = () => {
    setConfirmExport(false)
    showToast?.(
      'This file contains your complete portfolio data — store it somewhere safe.',
      'info'
    )
    onExport?.()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingFile(file)
    setConfirmImport(true)
  }

  const handleImportConfirm = async () => {
    const file = pendingFile
    setConfirmImport(false)
    setPendingFile(null)
    if (!file) return
    try {
      await onImport?.(file)
    } catch (err) {
      showToast?.(err.message || 'Import failed', 'error')
    }
  }

  const handleImportCancel = () => {
    setConfirmImport(false)
    setPendingFile(null)
  }

  const handleCatFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const cat = CATEGORIES.find((c) => c.key === selectedCat)
    setCatConfirm({ key: selectedCat, label: cat?.label ?? selectedCat, file })
  }

  const handleCatImportConfirm = async () => {
    const { key, file } = catConfirm
    setCatConfirm(null)
    try {
      await onCategoryImport?.(key, file)
    } catch (err) {
      showToast?.(err.message || 'Import failed', 'error')
    }
  }

  return (
    <>
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
                  type="button"
                  className="btn btn-ghost profile-edit-btn"
                  onClick={() => setEditing((v) => !v)}
                  title={editing ? 'Cancel' : 'Edit name'}
                >
                  {editing ? '✕' : '✏️'}
                </button>
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-section-label">Settings</div>
              <div className="profile-setting-row">
                <label className="profile-setting-label" htmlFor="refresh-interval-select">
                  Auto-refresh prices
                </label>
                <select
                  id="refresh-interval-select"
                  className="form-select profile-setting-select"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                >
                  {REFRESH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-backup-heading">
                <div className="profile-section-label">Backup &amp; Restore</div>
                <button
                  type="button"
                  className="profile-info-btn"
                  aria-label="Backup format help"
                  aria-expanded={backupInfoOpen}
                  onClick={() => setBackupInfoOpen((v) => !v)}
                  title="What is included in backups?"
                >
                  i
                </button>
              </div>
              {backupInfoOpen && (
                <p className="profile-backup-info" role="note">
                  Full backup exports all holdings, watchlist, and settings as JSON.
                  Category backup exports one section only. Import replaces data in this browser.
                </p>
              )}
              <div className="profile-backup-compact">
                <div className="profile-backup-row profile-backup-row--all">
                  <div className="profile-backup-row-main">
                    <span className="profile-backup-row-label">All holdings</span>
                    <span className="profile-last-export-inline">
                      Last: {formatLastExport(settings.lastExportAt)}
                    </span>
                  </div>
                  <div className="profile-backup-row-btns">
                    <button
                      type="button"
                      className="btn btn-icon btn-secondary"
                      onClick={() => setConfirmExport(true)}
                      aria-label="Export all holdings"
                      title="Export all holdings as JSON"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Import all holdings"
                      title="Import JSON — replaces current portfolio"
                    >
                      ↑
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="profile-file-input"
                      aria-hidden="true"
                      tabIndex={-1}
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
                <div className="profile-backup-row profile-backup-row--cat">
                  <span className="profile-backup-row-label">Category</span>
                  <select
                    className="form-select profile-cat-select-inline"
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                    aria-label="Select category"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                  <div className="profile-backup-row-btns">
                    <button
                      type="button"
                      className="btn btn-icon btn-secondary"
                      onClick={() => onCategoryExport?.(selectedCat)}
                      aria-label="Export category"
                      title="Export selected category"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon btn-secondary"
                      onClick={() => catFileInputRef.current?.click()}
                      aria-label="Import category"
                      title="Import selected category"
                    >
                      ↑
                    </button>
                    <input
                      ref={catFileInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="profile-file-input"
                      aria-hidden="true"
                      tabIndex={-1}
                      onChange={handleCatFileChange}
                    />
                  </div>
                </div>
                <div className="profile-backup-row profile-backup-row--demo">
                  <span className="profile-backup-row-label">Demo</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setConfirmSample(true)}
                    title="Load a sample portfolio to explore the app"
                  >
                    Load sample
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              {saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {confirmExport && (
        <ConfirmDialog
          title="Export portfolio?"
          message="This file contains your complete portfolio data — store it somewhere safe. Download now?"
          confirmLabel="Download"
          onConfirm={handleExportConfirm}
          onCancel={() => setConfirmExport(false)}
        />
      )}

      {confirmImport && (
        <ConfirmDialog
          title="Restore from backup?"
          message="This will replace all holdings, watchlist, and settings in this browser with the imported file. This cannot be undone."
          confirmLabel="Import"
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
        />
      )}

      {confirmSample && (
        <ConfirmDialog
          title="Load sample portfolio?"
          message="This replaces your current data with demo holdings (Indian stocks + NIFTYBEES ETF, US stocks/ETF/ESPP/RSU, 2 mutual funds, 1 FD). Export first if you need a backup."
          confirmLabel="Load sample"
          onConfirm={() => {
            setConfirmSample(false)
            onLoadSample?.()
          }}
          onCancel={() => setConfirmSample(false)}
        />
      )}

      {catConfirm && (
        <ConfirmDialog
          title={`Import ${catConfirm.label}?`}
          message={`This will replace your ${catConfirm.label} data with the imported file. Other categories are not affected. This cannot be undone.`}
          confirmLabel="Import"
          onConfirm={handleCatImportConfirm}
          onCancel={() => setCatConfirm(null)}
        />
      )}
    </>
  )
}
