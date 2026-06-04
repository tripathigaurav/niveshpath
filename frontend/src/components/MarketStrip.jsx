import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import styles from './MarketStrip.module.css'

const ORDERED_KEYS = [
  'nifty50', 'sensex', 'niftyBank', 'usdInr', 'sp500', 'nasdaq', 'gold', 'crude',
]
const POLL_INTERVAL_MS = 30000

function Pill({ label, price, changePct, prefix = '' }) {
  const isPos = changePct != null && changePct > 0
  const isNeg = changePct != null && changePct < 0
  const sign = isPos ? '+' : ''

  const changeClass = isPos ? styles.pos : isNeg ? styles.neg : styles.neutral

  return (
    <div className={styles.msPill}>
      <span className={styles.msLabel}>{label}</span>
      <span className={styles.msPrice}>
        {prefix}{price != null
          ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 })
          : '—'}
      </span>
      {changePct != null && (
        <span className={[styles.msChange, changeClass].join(' ')}>
          {sign}{changePct.toFixed(2)}%
        </span>
      )}
    </div>
  )
}

function SkeletonPill() {
  return (
    <div className={styles.msPill}>
      <span className="skeleton skeleton-pill" />
    </div>
  )
}

export default function MarketStrip() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await api.getMarketOverview()
        if (!cancelled) {
          setData(res)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (error && !data) {
    return (
      <div className={`${styles.marketStripDark} ${styles.marketStripError}`}>
        <span className={styles.marketStripErrorText}>Market data unavailable</span>
      </div>
    )
  }

  function buildTrack(trackPrefix) {
    if (!data) {
      return Array.from({ length: 8 }).map((_, i) => (
        <SkeletonPill key={`${trackPrefix}-sk-${i}`} />
      ))
    }

    // Compute MCX gold price (INR/10g) = goldUSD/oz × usdInr / 31.1035 × 10
    const goldUsd = data.gold?.price
    const usdInr = data.usdInr?.price
    const mcxGold = goldUsd != null && usdInr != null
      ? goldUsd * (10 / 31.1035) * usdInr
      : null
    const mcxGoldChangePct = data.gold?.dayChangePct ?? null

    const pills = ORDERED_KEYS.map((key) => {
      const item = data[key]
      if (!item) return null
      if (key === 'gold') {
        // Show MCX equivalent (INR/10g) if available, else USD
        if (mcxGold != null) {
          return (
            <Pill
              key={`${trackPrefix}-${key}`}
              label="Gold MCX"
              price={Math.round(mcxGold)}
              changePct={mcxGoldChangePct}
              prefix="₹"
            />
          )
        }
        return (
          <Pill
            key={`${trackPrefix}-${key}`}
            label={item.label || key}
            price={item.price}
            changePct={item.dayChangePct}
            prefix="$"
          />
        )
      }
      const pricePrefix = key === 'usdInr' ? '₹' : key === 'crude' ? '$' : ''
      return (
        <Pill
          key={`${trackPrefix}-${key}`}
          label={item.label || key}
          price={item.price}
          changePct={item.dayChangePct}
          prefix={pricePrefix}
        />
      )
    }).filter(Boolean)

    return pills.flatMap((p, i, arr) =>
      i < arr.length - 1
        ? [p, <div key={`${trackPrefix}-sep-${i}`} className={styles.msSep} />]
        : [p]
    )
  }

  const track1 = buildTrack('t1')
  const track2 = buildTrack('t2')

  return (
    <div className={styles.marketStripDark}>
      <div className={styles.msTicker} role="marquee" aria-label="Market overview">
        <div className={styles.msTickerWrap}>
          <div className={styles.msTickerTrack}>{track1}</div>
          <div className={styles.msTickerTrack} aria-hidden="true">{track2}</div>
        </div>
      </div>
    </div>
  )
}
