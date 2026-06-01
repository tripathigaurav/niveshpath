import { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from './utils/storage'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import MarketStrip from './components/MarketStrip'
import ToastContainer from './components/Toast'
import WelcomeModal from './components/WelcomeModal'
import ProfileModal from './components/ProfileModal'
import Dashboard from './components/Dashboard'
import IndianStocks from './components/IndianStocks'
import USStocks from './components/USStocks'
import MutualFunds from './components/MutualFunds'
import OtherAssets from './components/OtherAssets'
import Watchlist from './components/Watchlist'
import { useHashRoute } from './hooks/useHashRoute'

const TAB_TITLES = {
  dashboard:    'Dashboard',
  indianStocks: 'Indian Stocks',
  usStocks:     'US Stocks',
  mutualFunds:  'Mutual Funds',
  otherAssets:  'Other Assets',
  watchlist:    'Watchlist',
}

export default function App() {
  const [settings, setSettings] = useState(() => storage.getSettings())
  const [activeTab, setActiveTab] = useHashRoute()
  const [toasts, setToasts] = useState([])
  const [profileOpen, setProfileOpen] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  useEffect(() => {
    document.title = `${TAB_TITLES[activeTab] ?? 'Portfolio'} — निवेश Path`
  }, [activeTab])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = () =>
      showToast('Storage full — export your portfolio to avoid data loss', 'error')
    window.addEventListener('pt_storage_error', handler)
    return () => window.removeEventListener('pt_storage_error', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistSettings = useCallback((updated) => {
    setSettings(updated)
    storage.setSettings(updated)
  }, [])

  const handleThemeToggle = useCallback(() => {
    persistSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })
  }, [settings, persistSettings])

  const handleWelcomeSave = useCallback((name) => {
    persistSettings({ ...settings, userName: name || 'Investor', hasSeenWelcome: true })
  }, [settings, persistSettings])

  const handleProfileSave = useCallback((updated) => {
    persistSettings(updated)
  }, [persistSettings])

  const showToast = useCallback((message, type = 'info') => {
    const id = uuidv4()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const renderTab = () => {
    const props = { showToast }
    switch (activeTab) {
      case 'dashboard':    return <Dashboard {...props} />
      case 'indianStocks': return <IndianStocks {...props} />
      case 'usStocks':     return <USStocks {...props} />
      case 'mutualFunds':  return <MutualFunds {...props} />
      case 'otherAssets':  return <OtherAssets {...props} />
      case 'watchlist':    return <Watchlist {...props} />
      default:             return <IndianStocks {...props} />
    }
  }

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-nav">Skip to main content</a>

      {!settings.hasSeenWelcome && (
        <WelcomeModal onSave={handleWelcomeSave} />
      )}

      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settings={settings}
        onProfileOpen={() => setProfileOpen(true)}
        onThemeToggle={handleThemeToggle}
        searchRef={searchRef}
      />

      <MarketStrip />

      <main id="main-content">
        <ErrorBoundary>
          <div className="tab-content" key={activeTab}>
            {renderTab()}
          </div>
        </ErrorBoundary>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {profileOpen && (
        <ProfileModal
          settings={settings}
          onSave={handleProfileSave}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </ErrorBoundary>
  )
}
