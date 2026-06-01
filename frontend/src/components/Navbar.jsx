import { useState, useRef, useEffect } from 'react'
import GlobalSearch from './GlobalSearch'
import ThemeToggle from './ThemeToggle'
import { MAIN_TABS as BASE_MAIN_TABS, MORE_TABS } from '../config/tabs'
import { getInitials } from '../utils/initials'

const DASHBOARD_ICON = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="dashboard-icon">
    <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" opacity="0.7" />
    <rect x="5.5" y="4" width="3" height="9" rx="1" fill="currentColor" opacity="0.85" />
    <rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor" />
  </svg>
)

const MAIN_TABS = BASE_MAIN_TABS.map((t) =>
  t.id === 'dashboard' ? { ...t, icon: DASHBOARD_ICON } : t
)

const MORE_IDS = MORE_TABS.map((t) => t.id)
const ALL_TABS = [...MAIN_TABS, ...MORE_TABS]

function TabBtn({ tab, active, onTabChange }) {
  return (
    <button
      className={`navbar-tab${active ? ' active' : ''}`}
      onClick={() => onTabChange(tab.id)}
    >
      {typeof tab.icon === 'string' ? (
        <span className="tab-icon">{tab.icon}</span>
      ) : (
        tab.icon
      )}
      <span className="tab-label">{tab.label}</span>
    </button>
  )
}

function MoreMenu({ activeTab, onTabChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const isActive = MORE_IDS.includes(activeTab)
  const activeMoreTab = MORE_TABS.find((t) => t.id === activeTab)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleSelect = (id) => {
    onTabChange(id)
    setOpen(false)
  }

  return (
    <div className="more-wrap" ref={wrapRef}>
      <button
        className={`navbar-tab more-btn${isActive ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="More navigation options"
      >
        {isActive && activeMoreTab ? (
          <>
            <span className="tab-icon">{activeMoreTab.icon}</span>
            <span className="tab-label">{activeMoreTab.label}</span>
          </>
        ) : (
          <span className="tab-label">More</span>
        )}
        <span className="more-chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="more-dropdown" role="menu">
          {MORE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`more-dropdown-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleSelect(tab.id)}
              role="menuitem"
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar({ activeTab, onTabChange, settings, onProfileOpen, onThemeToggle, searchRef }) {
  const { userName, avatarColor, theme } = settings
  const initials = getInitials(userName)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!drawerOpen) return
    const handler = (e) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [drawerOpen])

  const handleTabChange = (id) => {
    onTabChange(id)
    setDrawerOpen(false)
  }

  return (
    <>
      <nav className="navbar">
        {/* Left — logo */}
        <div className="navbar-logo">
          <svg viewBox="0 0 34 28" fill="none" xmlns="http://www.w3.org/2000/svg" width="34" height="28">
            <defs>
              <linearGradient id="np-bar" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <rect x="1"  y="17" width="6.5" height="10" rx="1.5" fill="url(#np-bar)" />
            <rect x="10" y="10" width="6.5" height="17" rx="1.5" fill="url(#np-bar)" />
            <rect x="19" y="3"  width="6.5" height="24" rx="1.5" fill="url(#np-bar)" />
            <path d="M 4.25 17 C 6 12 10 10 13.25 10 C 16.5 10 19 6 22.25 3" stroke="#3b82f6" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M 27 1 L 22.5 3 L 25 7" stroke="#3b82f6" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="logo-wordmark">
            <span className="logo-hindi">निवेश</span>
            <span className="logo-path">Path</span>
          </div>
        </div>

        {/* Center — main tabs + More */}
        <div className="navbar-center">
          {MAIN_TABS.map((tab) => (
            <TabBtn
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onTabChange={onTabChange}
            />
          ))}
          <div className="navbar-pipe" />
          <MoreMenu activeTab={activeTab} onTabChange={onTabChange} />
        </div>

        {/* Right — hamburger (mobile), search, theme toggle, profile pill */}
        <div className="navbar-right">
          <button
            className="hamburger-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <GlobalSearch ref={searchRef} onNavigate={onTabChange} />

          <ThemeToggle theme={theme} onToggle={onThemeToggle} />

          <button className="user-pill" onClick={onProfileOpen} title="Profile">
            <span
              className="user-pill-avatar"
              style={{ background: avatarColor || '#1e3a8a' }}
            >
              {initials}
            </span>
            {userName && (
              <span className="user-pill-name">{userName.split(' ')[0]}</span>
            )}
            <span className="user-pill-chevron">▾</span>
          </button>
        </div>
      </nav>

      {/* Mobile slide-out drawer */}
      {drawerOpen && (
        <div className="nav-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <nav className="nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="nav-drawer-header">
              <div className="logo-wordmark">
                <span className="logo-hindi">निवेश</span>
                <span className="logo-path">Path</span>
              </div>
              <button
                className="nav-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                ×
              </button>
            </div>
            <div className="nav-drawer-tabs">
              {ALL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`nav-drawer-tab${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
