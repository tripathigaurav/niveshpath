import { useEffect, useRef } from 'react'

/**
 * Refresh market data when a holdings page mounts (tab opened) or holdings appear.
 * Skips refresh when the browser tab is hidden to save API calls.
 */
export function useHoldingsAutoRefresh(refresh, hasHoldings) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!hasHoldings || document.hidden) return
    refreshRef.current()
  }, [hasHoldings])
}
