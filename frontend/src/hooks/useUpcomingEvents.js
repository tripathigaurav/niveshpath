import { useState, useEffect } from 'react'
import { fetchUpcomingEvents } from '../utils/upcomingEventsFetch'
import { storage } from '../utils/storage'

const isStaticWithoutApi =
  import.meta.env.PROD && !import.meta.env.VITE_API_BASE

function collectHoldings() {
  const indian = storage.getIndianStocks().map((s) => ({
    symbol: s.symbol,
    name: s.name || s.symbol,
    region: 'IN',
  }))
  const us = storage.getUSStocks().map((s) => ({
    symbol: s.symbol,
    name: s.name || s.symbol,
    region: 'US',
  }))
  const seen = new Set()
  const out = []
  for (const h of [...indian, ...us]) {
    const key = h.symbol.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h)
  }
  return out
}

/** @typedef {'offline'|'outdated'|'staticHost'|'generic'} EventsErrorKind */

export function useUpcomingEvents(days = 30) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  /** @type {[EventsErrorKind|null, Function]} */
  const [errorKind, setErrorKind] = useState(null)

  useEffect(() => {
    let cancelled = false
    const holdings = collectHoldings()
    if (!holdings.length) {
      setEvents([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setError(false)
    setErrorKind(null)
    fetchUpcomingEvents(holdings, days)
      .then((res) => {
        if (!cancelled) setEvents(res.events || [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(true)
          setEvents([])
          const msg = String(err?.message || '')
          if (err?.status === 404) {
            setErrorKind('outdated')
          } else if (
            isStaticWithoutApi &&
            (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed'))
          ) {
            setErrorKind('staticHost')
          } else if (
            msg.includes('Failed to fetch') ||
            msg.includes('NetworkError') ||
            msg.includes('Load failed')
          ) {
            setErrorKind('offline')
          } else {
            setErrorKind('generic')
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [days])

  return { events, loading, error, errorKind }
}
