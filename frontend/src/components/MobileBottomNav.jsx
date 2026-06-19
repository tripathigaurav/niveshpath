import { useState, useRef, useEffect } from 'react'
import { MAIN_TABS, MORE_TABS } from '../config/tabs'

const ALL_TABS = [...MAIN_TABS, ...MORE_TABS]

// Bottom nav shows 5 tabs: Dashboard, Stocks (Indian), MFs, Insights, More (grid)
const BOTTOM_TABS = [
  { id: 'dashboard', label: 'Home', icon: '📊' },
  { id: 'indianStocks', label: 'Stocks', icon: '🇮🇳' },
  { id: 'mutualFunds', label: 'Funds', icon: '📋' },
  { id: 'insights', label: 'Insights', icon: '💡' },
  { id: '__more', label: 'More', icon: '☰' },
]

const MORE_ITEMS = [
  { id: 'usStocks', label: 'US Stocks', icon: '🇺🇸' },
  { id: 'otherAssets', label: 'Other Assets', icon: '🏦' },
  { id: 'insurance', label: 'Insurance', icon: '🛡️' },
  { id: 'watchlist', label: 'Watchlist', icon: '⭐' },
]

// IDs that live in the More menu
const MORE_IDS = MORE_ITEMS.map((t) => t.id)

export default function MobileBottomNav({ activeTab, onTabChange }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)

  // Close more panel on outside tap
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [moreOpen])

  const handleTab = (id) => {
    if (id === '__more') {
      setMoreOpen((v) => !v)
      return
    }
    setMoreOpen(false)
    onTabChange(id)
  }

  const isMoreActive = MORE_IDS.includes(activeTab)

  return (
    <div className="mob-bottom-nav-wrap">
      {/* More panel */}
      {moreOpen && (
        <div className="mob-more-panel" ref={moreRef}>
          {MORE_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`mob-more-item${activeTab === item.id ? ' active' : ''}`}
              onClick={() => handleTab(item.id)}
            >
              <span className="mob-more-icon">{item.icon}</span>
              <span className="mob-more-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <nav className="mob-bottom-nav" aria-label="Main navigation">
        {BOTTOM_TABS.map((tab) => {
          const isActive = tab.id === '__more'
            ? isMoreActive || moreOpen
            : activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`mob-bottom-tab${isActive ? ' active' : ''}`}
              onClick={() => handleTab(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="mob-bottom-icon">{tab.icon}</span>
              <span className="mob-bottom-label">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
