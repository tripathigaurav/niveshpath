import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_TAB } from '../config/tabs'

const HASH_TO_TAB = {
  '#/dashboard': 'dashboard',
  '#/indian-stocks': 'indianStocks',
  '#/us-stocks': 'usStocks',
  '#/mutual-funds': 'mutualFunds',
  '#/insights': 'insights',
  '#/other-assets': 'otherAssets',
  '#/insurance': 'insurance',
  '#/watchlist': 'watchlist',
}

const TAB_TO_HASH = Object.fromEntries(
  Object.entries(HASH_TO_TAB).map(([h, t]) => [t, h])
)

function hashToTab(hash) {
  return HASH_TO_TAB[hash] || DEFAULT_TAB
}

export function useHashRoute() {
  const [activeTab, setActiveTabState] = useState(() =>
    hashToTab(window.location.hash)
  )

  // On first load, ensure the hash is set so the correct tab is active
  useEffect(() => {
    if (!window.location.hash || !HASH_TO_TAB[window.location.hash]) {
      window.location.hash = TAB_TO_HASH[DEFAULT_TAB]
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      setActiveTabState(hashToTab(window.location.hash))
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const setActiveTab = useCallback((tab) => {
    const hash = TAB_TO_HASH[tab] || TAB_TO_HASH[DEFAULT_TAB]
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
    setActiveTabState(tab)
  }, [])

  return [activeTab, setActiveTab]
}
