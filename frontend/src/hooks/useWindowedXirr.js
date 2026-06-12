import { useEffect, useState } from 'react'
import { fetchWindowedXirrData } from '../utils/xirrWindowed'

/**
 * Load windowed XIRR when enabled (e.g. IRR sub-tab active).
 */
export function useWindowedXirr(
  holdings,
  assetType,
  transactions,
  { usdInr, exchange, enabled = false, refreshKey = 0 } = {}
) {
  const [data, setData] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled || !holdings?.length) {
      setData(new Map())
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchWindowedXirrData(holdings, assetType, transactions, { usdInr, exchange })
      .then((map) => {
        if (!cancelled) setData(map)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load IRR data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [holdings, assetType, transactions, usdInr, exchange, enabled, refreshKey])

  return { windowedXirr: data, windowedLoading: loading, windowedError: error }
}
