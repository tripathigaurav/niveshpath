import { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from './utils/storage'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import MarketStrip from './components/MarketStrip'
import ToastContainer from './components/Toast'
import WelcomeModal from './components/WelcomeModal'
import ProfileModal from './components/ProfileModal'
import XirrBackfillBanner from './components/XirrBackfillBanner'
import {
  downloadPortfolioBackup,
  downloadCategoryBackup,
  parsePortfolioFile,
  isCategoryBackup,
  recordExportTimestamp,
  shouldShowBackupReminder,
  markBackupReminderShown,
  wasBackupReminderShownThisSession,
  loadSamplePortfolio,
} from './utils/portfolioBackup'
import { backfillTransactionsFromHoldings } from './utils/transactions'
import { seedLedgerPortfolioHistory } from './utils/portfolioSnapshots'
import { estimateSamplePortfolioValueINR } from './utils/demoPortfolioHistory'
import {
  countHoldingsMissingBuyDate,
  shouldShowXirrBackfillBanner,
} from './utils/holdingsDates'
import Dashboard from './components/Dashboard'
import IndianStocks from './components/IndianStocks'
import USStocks from './components/USStocks'
import MutualFunds from './components/MutualFunds'
import OtherAssets from './components/OtherAssets'
import Insurance from './components/Insurance'
import Watchlist from './components/Watchlist'
import Insights from './components/Insights'
import TaxReportModal from './components/TaxReportModal'
import CSVImportWizard from './components/CSVImportWizard'
import { useHashRoute } from './hooks/useHashRoute'
import { usePortfolioMarketRefresh } from './hooks/usePortfolioMarketRefresh'

const TAB_TITLES = {
  dashboard:    'Dashboard',
  indianStocks: 'Indian Stocks',
  usStocks:     'US Stocks',
  mutualFunds:  'Mutual Funds',
  insights:     'Insights',
  otherAssets:  'Other Assets',
  insurance:    'Insurance',
  watchlist:    'Watchlist',
}

function TabErrorFallback({ tabName, onRetry }) {
  return (
    <div className="tab-error" role="alert">
      <h3>{tabName} encountered an error</h3>
      <p>Other tabs still work. Try refreshing this tab.</p>
      <button className="btn btn-primary" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

export default function App() {
  const [settings, setSettings] = useState(() => storage.getSettings())
  const [activeTab, setActiveTab] = useHashRoute()
  const [toasts, setToasts] = useState([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [taxReportOpen, setTaxReportOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [xirrBannerVisible, setXirrBannerVisible] = useState(() => shouldShowXirrBackfillBanner())
  const [missingBuyDates, setMissingBuyDates] = useState(() => countHoldingsMissingBuyDate().total)
  const searchRef = useRef(null)

  usePortfolioMarketRefresh()

  useEffect(() => {
    backfillTransactionsFromHoldings()
  }, [])

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

  useEffect(() => {
    if (wasBackupReminderShownThisSession()) return
    if (!shouldShowBackupReminder(settings.lastExportAt, 7)) return
    markBackupReminderShown()
    showToast(
      'No backup in 7+ days — open Profile → Export JSON to save your portfolio',
      'info'
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.lastExportAt])

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

  const showToast = useCallback((message, type = 'info') => {
    const id = uuidv4()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const handleProfileSave = useCallback((updated) => {
    persistSettings(updated)
  }, [persistSettings])

  const handlePortfolioExport = useCallback(() => {
    downloadPortfolioBackup()
    persistSettings({ ...settings, lastExportAt: recordExportTimestamp() })
    showToast('Portfolio exported successfully', 'success')
  }, [settings, persistSettings, showToast])

  const handlePortfolioImport = useCallback(async (file) => {
    const data = await parsePortfolioFile(file)
    if (isCategoryBackup(data)) {
      storage.importCategory(data.category, data.data)
      showToast(`${data.category} data restored — reloading…`, 'success')
    } else {
      const { imported } = storage.importAll(data)
      if (imported === 0) throw new Error('No portfolio data found in file')
      showToast('Portfolio restored — reloading…', 'success')
    }
    window.setTimeout(() => window.location.reload(), 600)
  }, [showToast])

  const handleCategoryExport = useCallback((cat) => {
    downloadCategoryBackup(cat)
    showToast('Category exported successfully', 'success')
  }, [showToast])

  const handleCategoryImport = useCallback(async (cat, file) => {
    const data = await parsePortfolioFile(file)
    const payload = isCategoryBackup(data) ? data.data : data[cat]
    if (!Array.isArray(payload)) throw new Error('No matching category data found in file')
    storage.importCategory(cat, payload)
    showToast('Category restored — reloading…', 'success')
    window.setTimeout(() => window.location.reload(), 600)
  }, [showToast])

  const handleLoadSample = useCallback(async () => {
    const data = loadSamplePortfolio()
    storage.importAll(data)
    try {
      await seedLedgerPortfolioHistory({
        liveCurrentValue: estimateSamplePortfolioValueINR(),
      })
    } catch {
      /* chart history is optional */
    }
    showToast('Sample portfolio loaded — reloading…', 'success')
    window.setTimeout(() => window.location.reload(), 600)
  }, [showToast])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const renderTab = () => {
    const props = { showToast }
    const content = (() => {
      switch (activeTab) {
        case 'dashboard':    return <Dashboard {...props} />
        case 'indianStocks': return <IndianStocks {...props} />
        case 'usStocks':     return <USStocks {...props} />
        case 'mutualFunds':  return <MutualFunds {...props} />
        case 'insights':     return <Insights {...props} />
        case 'otherAssets':  return <OtherAssets {...props} />
        case 'insurance':    return <Insurance {...props} />
        case 'watchlist':    return <Watchlist {...props} />
        default:             return <IndianStocks {...props} />
      }
    })()
    return (
      <ErrorBoundary
        key={activeTab}
        fallback={
          <TabErrorFallback
            tabName={TAB_TITLES[activeTab] ?? 'This tab'}
            onRetry={() => setActiveTab(activeTab)}
          />
        }
      >
        {content}
      </ErrorBoundary>
    )
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
        showToast={showToast}
      />

      <MarketStrip />

      {xirrBannerVisible && (
        <XirrBackfillBanner
          missingCount={missingBuyDates}
          onDismiss={() => setXirrBannerVisible(false)}
        />
      )}

      <main id="main-content">
        <div className="tab-content">
          {renderTab()}
        </div>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {profileOpen && (
        <ProfileModal
          settings={settings}
          onSave={handleProfileSave}
          onClose={() => setProfileOpen(false)}
          onExport={handlePortfolioExport}
          onImport={handlePortfolioImport}
          onCategoryExport={handleCategoryExport}
          onCategoryImport={handleCategoryImport}
          onLoadSample={handleLoadSample}
          onOpenTaxReport={() => {
            setProfileOpen(false)
            setTaxReportOpen(true)
          }}
          onOpenCsvImport={() => {
            setProfileOpen(false)
            setCsvImportOpen(true)
          }}
          showToast={showToast}
        />
      )}

      <TaxReportModal
        open={taxReportOpen}
        onClose={() => setTaxReportOpen(false)}
        showToast={showToast}
      />

      <CSVImportWizard
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        showToast={showToast}
      />
    </ErrorBoundary>
  )
}
