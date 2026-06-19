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

function collectOtherAssetEvents(days) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + days)
  const events = []

  // Other Assets — maturity dates
  const assets = storage.getOtherAssets()
  for (const a of assets) {
    if (!a.maturityDate) continue
    const d = new Date(`${String(a.maturityDate).slice(0, 10)}T12:00:00`)
    if (Number.isNaN(d.getTime())) continue
    if (d >= today && d <= end) {
      events.push({
        symbol: a.name,
        name: a.name,
        region: 'OTHER',
        type: 'maturity',
        date: String(a.maturityDate).slice(0, 10),
        detail: `${a.type || 'Asset'} maturity`,
      })
    }
  }

  // Insurance — renewal dates
  const insurance = storage.getInsurance()
  for (const ins of insurance) {
    if (!ins.renewalDate) continue
    const d = new Date(`${String(ins.renewalDate).slice(0, 10)}T12:00:00`)
    if (Number.isNaN(d.getTime())) continue
    if (d >= today && d <= end) {
      events.push({
        symbol: ins.name || 'Insurance',
        name: ins.name || 'Insurance',
        region: 'OTHER',
        type: 'renewal',
        date: String(ins.renewalDate).slice(0, 10),
        detail: `${ins.type || 'Insurance'} renewal`,
      })
    }
  }

  // MF SIPs — next due dates
  const sips = storage.getSIPs()
  for (const sip of sips) {
    if (!sip.active || !sip.nextDate) continue
    const d = new Date(`${String(sip.nextDate).slice(0, 10)}T12:00:00`)
    if (Number.isNaN(d.getTime())) continue
    if (d >= today && d <= end) {
      events.push({
        symbol: sip.fundName || sip.symbol || 'SIP',
        name: sip.fundName || sip.symbol || 'SIP',
        region: 'MF',
        type: 'sip',
        date: String(sip.nextDate).slice(0, 10),
        detail: `SIP ₹${sip.amount || ''}`,
      })
    }
  }

  return events
}

/** @typedef {'offline'|'outdated'|'staticHost'|'generic'} EventsErrorKind */

export function useUpcomingEvents(days = 30) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(isStaticWithoutApi)
  /** @type {[EventsErrorKind|null, Function]} */
  const [errorKind, setErrorKind] = useState(isStaticWithoutApi ? 'staticHost' : null)

  useEffect(() => {
    // On static host (GitHub Pages) the backend isn't available — bail immediately.
    if (isStaticWithoutApi) return undefined
    let cancelled = false
    const holdings = collectHoldings()
    const otherAssetEvents = collectOtherAssetEvents(days)

    if (!holdings.length && !otherAssetEvents.length) {
      setEvents([])
      setLoading(false)
      return undefined
    }

    // If we only have other-asset events (no stocks), skip the API call
    if (!holdings.length) {
      setEvents(otherAssetEvents.sort((a, b) => a.date.localeCompare(b.date)))
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setError(false)
    setErrorKind(null)
    fetchUpcomingEvents(holdings, days)
      .then((res) => {
        if (!cancelled) {
          const merged = [...(res.events || []), ...otherAssetEvents]
            .sort((a, b) => a.date.localeCompare(b.date))
          setEvents(merged)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // Even on API error, show other-asset maturity events
          if (otherAssetEvents.length) {
            setEvents(otherAssetEvents.sort((a, b) => a.date.localeCompare(b.date)))
          } else {
            setEvents([])
          }
          setError(true)
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
