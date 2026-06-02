import { useMemo } from 'react'
import { useIndianStocks, useUSStocks, useMutualFunds, useOtherAssets } from '../hooks/usePortfolio'
import {
  calcIndianStockMetrics,
  calcUsPnl,
  calcMfPnl,
  sumTodayPnl,
  pnlColorClass,
} from '../utils/pnl'
import { formatINR, formatUSD, formatChange, formatPct } from '../utils/formatters'
import { storage } from '../utils/storage'
import SummaryBar from './SummaryBar'
import AllocationDonut from './AllocationDonut'

const CATEGORY_META = {
  indian: { icon: '🇮🇳', accent: 'var(--blue)', title: 'Indian Stocks' },
  us: { icon: '🇺🇸', accent: 'var(--green)', title: 'US Stocks' },
  mf: { icon: '📋', accent: 'var(--purple, #7c3aed)', title: 'Mutual Funds' },
  other: { icon: '🏦', accent: 'var(--orange, #f59e0b)', title: 'Other Assets' },
}

const ALLOC_COLORS = {
  'Indian Stocks': 'var(--blue)',
  'US Stocks': 'var(--green)',
  'Mutual Funds': 'var(--purple, #7c3aed)',
  'Other Assets': 'var(--orange, #f59e0b)',
}

function useAllTotals() {
  const { stocks: inStocks, lastUpdated: inUpdated } = useIndianStocks()
  const { stocks: usStocks, usdInr, lastUpdated: usUpdated } = useUSStocks()
  const { funds, lastUpdated: mfUpdated } = useMutualFunds()
  const { assets } = useOtherAssets()

  return useMemo(() => {
    let inInvested = 0
    let inCurrent = 0
    let inCurrentKnown = false
    for (const s of inStocks) {
      const m = calcIndianStockMetrics(s)
      inInvested += m.invested
      if (m.current != null) {
        inCurrent += m.current
        inCurrentKnown = true
      }
    }
    const inToday = sumTodayPnl(inStocks)

    let usInvestedUSD = 0
    let usCurrentUSD = 0
    let usCurrentKnown = false
    for (const s of usStocks) {
      const { investedUSD, currentUSD } = calcUsPnl(s)
      usInvestedUSD += investedUSD
      if (currentUSD != null) {
        usCurrentUSD += currentUSD
        usCurrentKnown = true
      }
    }
    const usInvestedINR = usdInr ? usInvestedUSD * usdInr : null
    const usCurrentINR = usdInr && usCurrentKnown ? usCurrentUSD * usdInr : null

    let mfInvested = 0
    let mfCurrent = 0
    let mfCurrentKnown = false
    for (const f of funds) {
      const { invested, current } = calcMfPnl(f)
      mfInvested += invested
      if (current != null) {
        mfCurrent += current
        mfCurrentKnown = true
      }
    }

    let otInvested = 0
    let otCurrent = 0
    let otCurrentKnown = false
    for (const a of assets) {
      otInvested += a.investedAmount || 0
      if (a.currentValue != null) {
        otCurrent += a.currentValue
        otCurrentKnown = true
      }
    }

    const grandInvested = inInvested + (usInvestedINR ?? 0) + mfInvested + otInvested
    const grandCurrentParts = [
      inCurrentKnown ? inCurrent : null,
      usCurrentINR,
      mfCurrentKnown ? mfCurrent : null,
      otCurrentKnown ? otCurrent : null,
    ].filter((v) => v != null)
    const grandCurrent =
      grandCurrentParts.length > 0 ? grandCurrentParts.reduce((a, b) => a + b, 0) : null
    const grandPnl = grandCurrent != null ? grandCurrent - grandInvested : null
    const grandPnlPct = grandPnl != null && grandInvested ? (grandPnl / grandInvested) * 100 : null

    const lastUpdated = [inUpdated, usUpdated, mfUpdated]
      .filter(Boolean)
      .sort((a, b) => b - a)[0] ?? null

    return {
      inInvested,
      inCurrent: inCurrentKnown ? inCurrent : null,
      inToday,
      usInvestedUSD,
      usCurrentUSD: usCurrentKnown ? usCurrentUSD : null,
      usInvestedINR,
      usCurrentINR,
      mfInvested,
      mfCurrent: mfCurrentKnown ? mfCurrent : null,
      otInvested,
      otCurrent: otCurrentKnown ? otCurrent : null,
      grandInvested,
      grandCurrent,
      grandPnl,
      grandPnlPct,
      usdInr,
      lastUpdated,
      counts: {
        indian: inStocks.length,
        us: usStocks.length,
        mf: funds.length,
        other: assets.length,
      },
    }
  }, [inStocks, usStocks, usdInr, funds, assets, inUpdated, usUpdated, mfUpdated])
}

function CategoryCard({
  icon,
  accent,
  title,
  count,
  unit,
  invested,
  current,
  investedUSD,
  currentUSD,
  usdInr,
}) {
  const pnlINR = current != null ? current - invested : null
  const pnlPct = pnlINR != null && invested ? (pnlINR / invested) * 100 : null
  const pnlUSD = currentUSD != null ? currentUSD - investedUSD : null
  const showUSD = investedUSD != null

  return (
    <div
      className="dash-cat-card"
      style={{ '--cat-accent': accent }}
    >
      <div className="dash-cat-header">
        <span className="dash-cat-title-wrap">
          <span className="dash-cat-icon" aria-hidden="true">{icon}</span>
          <span className="dash-cat-title">{title}</span>
        </span>
        <span className="dash-cat-count">{count} {unit}{count !== 1 ? 's' : ''}</span>
      </div>
      <div className="dash-cat-body">
        <div className="dash-cat-row">
          <span className="dash-cat-label">Invested</span>
          <span className="dash-cat-val">
            {showUSD ? formatUSD(investedUSD) : formatINR(invested, true)}
            {showUSD && usdInr && <span className="dash-cat-hint">{formatINR(invested, true)}</span>}
          </span>
        </div>
        <div className="dash-cat-row">
          <span className="dash-cat-label">Current Value</span>
          <span className="dash-cat-val">
            {showUSD
              ? (currentUSD != null ? formatUSD(currentUSD) : '—')
              : (current != null ? formatINR(current, true) : '—')}
            {showUSD && usdInr && current != null && (
              <span className="dash-cat-hint">{formatINR(current, true)}</span>
            )}
          </span>
        </div>
        <div className="dash-cat-row">
          <span className="dash-cat-label">Gain / Loss</span>
          <span className={`dash-cat-val dash-cat-pnl ${pnlColorClass(showUSD ? pnlUSD : pnlINR)}`}>
            {showUSD
              ? (pnlUSD != null ? `${pnlUSD >= 0 ? '+' : ''}${formatUSD(pnlUSD)}` : '—')
              : (pnlINR != null ? formatChange(pnlINR) : '—')}
            {pnlPct != null && <span className="dash-cat-pct"> ({formatPct(pnlPct)})</span>}
          </span>
        </div>
      </div>
    </div>
  )
}

const MOCK_UPCOMING_EVENTS = [
  { id: '1', symbol: 'RELIANCE', detail: 'Dividend ₹10/share', date: 'Jul 15', icon: '🇮🇳', type: 'dividend' },
  { id: '2', symbol: 'TCS', detail: 'Earnings', date: 'Jul 18', icon: '🇮🇳', type: 'earnings' },
  { id: '3', symbol: 'HDFC Bank', detail: 'Dividend ₹19/share', date: 'Jul 22', icon: '🇮🇳', type: 'dividend' },
]

function UpcomingEventsCard() {
  return (
    <div className="dash-events-card">
      <div className="dash-events-header">
        <div className="dash-perf-title">Upcoming Events</div>
        <span className="dash-events-badge">Preview</span>
      </div>
      <ul className="dash-events-list">
        {MOCK_UPCOMING_EVENTS.map((ev) => (
          <li key={ev.id} className="dash-events-item">
            <span className={`dash-events-icon dash-events-icon--${ev.type}`} aria-hidden="true">
              {ev.icon}
            </span>
            <div className="dash-events-body">
              <span className="dash-events-symbol">{ev.symbol}</span>
              <span className="dash-events-detail">{ev.detail}</span>
            </div>
            <span className="dash-events-date">{ev.date}</span>
          </li>
        ))}
      </ul>
      <p className="dash-events-note">Sample events — calendar integration coming in a future update.</p>
    </div>
  )
}

function DashboardFooter({ lastUpdated }) {
  const settings = storage.getSettings()
  const interval = settings.autoRefreshInterval ?? 0
  const intervalLabel = interval === 0
    ? 'Off'
    : interval < 60
      ? `${interval}s`
      : interval < 3600
        ? `${interval / 60} min`
        : `${interval / 3600} hr`

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <footer className="dash-footer">
      <span className="dash-footer-live">
        <span className="dash-footer-dot" aria-hidden="true" />
        Live
      </span>
      <span className="dash-footer-sep">·</span>
      <span>Last updated: {timeStr}</span>
      <span className="dash-footer-sep">·</span>
      <span>Auto-refresh: {intervalLabel}</span>
    </footer>
  )
}

export default function Dashboard() {
  const t = useAllTotals()
  const hasAny = t.counts.indian + t.counts.us + t.counts.mf + t.counts.other > 0

  if (!hasAny) {
    return (
      <div className="page page--dashboard">
        <div className="coming-soon" role="status" aria-live="polite">
          <div className="placeholder-icon" aria-hidden="true">📊</div>
          <h2>Dashboard</h2>
          <p>Add holdings in any tab to see your portfolio summary here.</p>
        </div>
      </div>
    )
  }

  const grandPnlClr = pnlColorClass(t.grandPnl)
  const allocSegments = [
    { label: 'Indian Stocks', value: t.inInvested, color: ALLOC_COLORS['Indian Stocks'] },
    { label: 'US Stocks', value: t.usInvestedINR ?? t.usInvestedUSD, color: ALLOC_COLORS['US Stocks'] },
    { label: 'Mutual Funds', value: t.mfInvested, color: ALLOC_COLORS['Mutual Funds'] },
    { label: 'Other Assets', value: t.otInvested, color: ALLOC_COLORS['Other Assets'] },
  ].filter((s) => s.value > 0)

  return (
    <div className="page page--dashboard">
      <div className="dash-header">
        <div>
          <div className="section-title">Dashboard</div>
          <div className="section-subtitle">Total portfolio overview</div>
        </div>
      </div>

      <section className="dash-section dash-section--summary">
        <SummaryBar
          variant="elevated"
          metrics={[
            {
              label: 'Total Invested',
              value: formatINR(t.grandInvested, true),
              sub: formatINR(t.grandInvested),
              icon: '💰',
            },
            {
              label: 'Current Value',
              value: t.grandCurrent != null ? formatINR(t.grandCurrent, true) : '—',
              sub: t.grandCurrent != null ? formatINR(t.grandCurrent) : 'Refresh prices to see',
              icon: '📈',
            },
            {
              label: "Today's Gain/Loss",
              value: t.inToday != null ? formatINR(t.inToday, true) : '—',
              sub: t.inToday != null ? formatChange(t.inToday) : 'Indian stocks only',
              colorClass: t.inToday != null ? pnlColorClass(t.inToday) : '',
              accent: t.inToday != null ? (t.inToday >= 0 ? 'gain' : 'loss') : null,
              icon: '📅',
            },
            {
              label: 'Notional Gain/Loss',
              value: t.grandPnl != null ? formatINR(t.grandPnl, true) : '—',
              sub: t.grandPnl != null
                ? `${formatChange(t.grandPnl)} (${formatPct(t.grandPnlPct)})`
                : null,
              colorClass: grandPnlClr,
              accent: t.grandPnl != null ? (t.grandPnl >= 0 ? 'gain' : 'loss') : null,
              icon: '⚖️',
            },
          ]}
        />
      </section>

      <div className="dash-body">
        <section className="dash-section dash-section--categories">
          <div className="dash-cat-title-row">
            <div className="dash-section-label">By Category</div>
            {!t.usdInr && t.counts.us > 0 && (
              <span className="dash-hint">Refresh US Stocks prices to see INR equivalent</span>
            )}
          </div>

          <div className="dash-cat-grid">
            {t.counts.indian > 0 && (
              <CategoryCard
                {...CATEGORY_META.indian}
                count={t.counts.indian}
                unit="stock"
                invested={t.inInvested}
                current={t.inCurrent}
              />
            )}
            {t.counts.us > 0 && (
              <CategoryCard
                {...CATEGORY_META.us}
                count={t.counts.us}
                unit="stock"
                investedUSD={t.usInvestedUSD}
                currentUSD={t.usCurrentUSD}
                invested={t.usInvestedINR ?? 0}
                current={t.usCurrentINR}
                usdInr={t.usdInr}
              />
            )}
            {t.counts.mf > 0 && (
              <CategoryCard
                {...CATEGORY_META.mf}
                count={t.counts.mf}
                unit="fund"
                invested={t.mfInvested}
                current={t.mfCurrent}
              />
            )}
            {t.counts.other > 0 && (
              <CategoryCard
                {...CATEGORY_META.other}
                count={t.counts.other}
                unit="asset"
                invested={t.otInvested}
                current={t.otCurrent}
              />
            )}
          </div>
        </section>

        <section className="dash-section dash-section--mid">
          <div className="dash-mid-row">
            {allocSegments.length > 0 && (
              <AllocationDonut
                segments={allocSegments}
                centerLabel="Invested"
                centerValue={formatINR(t.grandInvested, true)}
              />
            )}
            <UpcomingEventsCard />
          </div>
        </section>

        <DashboardFooter lastUpdated={t.lastUpdated} />
      </div>
    </div>
  )
}
