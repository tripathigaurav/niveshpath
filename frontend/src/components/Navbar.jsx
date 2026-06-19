import { useState, useRef, useEffect, useCallback } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import { useFocusTrap } from '../hooks/useFocusTrap'
import GlobalSearch from './GlobalSearch'
import ThemeToggle from './ThemeToggle'
import NotificationsBell from './NotificationsBell'
import { MAIN_TABS as BASE_MAIN_TABS, MORE_TABS } from '../config/tabs'
import { getInitials } from '../utils/initials'
import styles from './Navbar.module.css'

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
      className={[styles.navbarTab, active ? 'active' : ''].filter(Boolean).join(' ')}
      onClick={() => onTabChange(tab.id)}
    >
      {typeof tab.icon === 'string' ? (
        <span className={`${styles.tabIcon} tab-icon`}>{tab.icon}</span>
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

  const closeMenu = useCallback(() => setOpen(false), [])
  useClickOutside(wrapRef, closeMenu, open)

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
    <div className={styles.moreWrap} ref={wrapRef}>
      <button
        className={[styles.navbarTab, styles.moreBtn, isActive ? 'active' : ''].filter(Boolean).join(' ')}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="More navigation options"
      >
        {isActive && activeMoreTab ? (
          <>
            <span className={`${styles.tabIcon} tab-icon`}>{activeMoreTab.icon}</span>
            <span className="tab-label">{activeMoreTab.label}</span>
          </>
        ) : (
          <span className="tab-label">More</span>
        )}
        <span className={styles.moreChevron} aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className={styles.moreDropdown} role="menu">
          {MORE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={[styles.moreDropdownItem, activeTab === tab.id ? 'active' : ''].filter(Boolean).join(' ')}
              onClick={() => handleSelect(tab.id)}
              role="menuitem"
            >
              <span className={`${styles.tabIcon} tab-icon`}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar({ activeTab, onTabChange, settings, onProfileOpen, onThemeToggle, searchRef, showToast }) {
  const { userName, avatarColor, theme } = settings
  const initials = getInitials(userName)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef(null)

  useFocusTrap(drawerRef, drawerOpen, () => setDrawerOpen(false))

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
      <nav className={styles.navbar}>
        {/* Left — logo */}
        <button
          className={styles.navbarLogo}
          onClick={() => onTabChange('dashboard')}
          aria-label="Go to Dashboard"
          title="Dashboard"
          type="button"
        >
          <img
            src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'logo-full-dark.png' : 'logo-full.png'}`}
            alt="निवेश Path"
            className={styles.logoImg}
          />
        </button>

        {/* Center — main tabs + More */}
        <div className={styles.navbarCenter}>
          {MAIN_TABS.map((tab) => (
            <TabBtn
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onTabChange={onTabChange}
            />
          ))}
          <div className={styles.navbarPipe} />
          <MoreMenu activeTab={activeTab} onTabChange={onTabChange} />
        </div>

        {/* Right — hamburger (mobile), search, theme toggle, profile pill */}
        <div className={styles.navbarRight}>
          <button
            className={styles.hamburgerBtn}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </button>

          <GlobalSearch ref={searchRef} onNavigate={onTabChange} />

          <ThemeToggle theme={theme} onToggle={onThemeToggle} />

          <NotificationsBell showToast={showToast} />

          <button className={styles.userPill} onClick={onProfileOpen} title="Profile">
            <span
              className={styles.userPillAvatar}
              style={{ background: avatarColor || '#1e3a8a' }}
            >
              {initials}
            </span>
            {userName && (
              <span className={styles.userPillName}>{userName.split(' ')[0]}</span>
            )}
            <span className={styles.userPillChevron}>▾</span>
          </button>
        </div>
      </nav>

      {/* Mobile slide-out drawer */}
      {drawerOpen && (
        <div className={styles.navDrawerOverlay} onClick={() => setDrawerOpen(false)}>
          <nav className={styles.navDrawer} ref={drawerRef} onClick={(e) => e.stopPropagation()}>
            <div className={styles.navDrawerHeader}>
              <img
                src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'logo-full-dark.png' : 'logo-full.png'}`}
                alt="निवेश Path"
                className={styles.logoImg}
              />
              <button
                className={styles.navDrawerClose}
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                ×
              </button>
            </div>
            <div className={styles.navDrawerTabs}>
              {ALL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={[styles.navDrawerTab, activeTab === tab.id ? 'active' : ''].filter(Boolean).join(' ')}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <span className={`${styles.tabIcon} tab-icon`}>{tab.icon}</span>
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
