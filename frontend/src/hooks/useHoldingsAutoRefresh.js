import { useEffect, useRef } from 'react'

/**
 * Refresh market data when a holdings page mounts (tab opened) or holdings appear.
 */
export function useHoldingsAutoRefresh(refresh, hasHoldings) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!hasHoldings) return
    refreshRef.current()
  }, [hasHoldings])
}
