import { useMemo, useEffect, useState } from 'react'
import { useIndianStocks, useUSStocks, useMutualFunds, useOtherAssets, useInsurance } from '../hooks/usePortfolio'
import { summarizeInsurance, formatInsuranceRenewalsLine } from '../utils/insuranceMetrics'
import UpcomingEventsCard from './UpcomingEventsCard'
import { calcPortfolioXirr, formatXirrDisplay } from '../utils/xirrMetrics'
import { calculateEquityTaxReport } from '../utils/taxCalculator'
import { recordDailySnapshot } from '../utils/portfolioSnapshots'
import {
  calcIndianStockMetrics,
  calcUsPnl,
  calcMfPnl,
  calcOtherPnl,
  sumTodayPnl,
  sumPortfolioTodayPnl,
  pnlColorClass,
} from '../utils/pnl'
import { formatINR, formatUSD, formatChange, formatPct } from '../utils/formatters'
import { storage } from '../utils/storage'
import SummaryBar from './SummaryBar'
import AllocationDonut from './AllocationDonut'
import PortfolioHistoryChart from './PortfolioHistoryChart'

const CATEGORY_META = {
  indian: { icon: '🇮🇳', accent: 'var(--blue)', title: 'Indian Stocks' },
  us: { icon: '🇺🇸', accent: 'var(--green)', title: 'US Stocks' },
  mf: { icon: '📋', accent: 'var(--purple, #7c3aed)', title: 'Mutual Funds' },
  other: { icon: '🏦', accent: 'var(--orange, #f59e0b)', title: 'Other Assets' },
  insurance: { icon: '🛡️', accent: 'var(--teal, #0d9488)', title: 'Insurance' },
}

const ALLOC_COLORS = {
  'Indian Stocks': 'var(--blue)',
  'US Stocks': 'var(--green)',
  'Mutual Funds': 'var(--purple, #7c3aed)',
  'Other Assets': 'var(--orange, #f59e0b)',
}

function useDashboardPortfolio() {
  const { stocks: inStocks, lastUpdated: inUpdated, pricesStale: inPricesStale } =
    useIndianStocks()
  const { stocks: usStocks, usdInr, lastUpdated: usUpdated, pricesStale: usPricesStale } =
    useUSStocks()
  const { funds, lastUpdated: mfUpdated } = useMutualFunds()
  const { assets } = useOtherAssets()
  const { policies } = useInsurance()

  const totals = useMemo(() => {
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
    const portfolioToday = sumPortfolioTodayPnl({
      indianStocks: inStocks,
      usStocks,
      mutualFunds: funds,
      usdInr,
    })

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
      const { pnl } = calcOtherPnl(a)
      if (pnl === null) continue          // no current value — skip both sides
      const cv = typeof a.currentValue === 'number' && a.currentValue > 0
        ? a.currentValue
        : a.investedAmount + pnl
      otInvested += a.investedAmount || 0
      otCurrent  += cv
      otCurrentKnown = true
    }

    // grandInvested = total across all categories (shown on the Investments card)
    const grandInvested = inInvested + (usInvestedINR ?? 0) + mfInvested + otInvested

    // pricedInvested = only categories where current prices are known.
    // Notional Gain/Loss uses this so it's apples-to-apples and avoids a
    // phantom loss when the backend is offline (no live stock/MF prices).
    const pricedInvested =
      (inCurrentKnown       ? inInvested          : 0) +
      (usCurrentINR != null ? (usInvestedINR ?? 0) : 0) +
      (mfCurrentKnown       ? mfInvested          : 0) +
      (otCurrentKnown       ? otInvested          : 0)

    const grandCurrentParts = [
      inCurrentKnown ? inCurrent : null,
      usCurrentINR,
      mfCurrentKnown ? mfCurrent : null,
      otCurrentKnown ? otCurrent : null,
    ].filter((v) => v != null)
    const grandCurrent =
      grandCurrentParts.length > 0 ? grandCurrentParts.reduce((a, b) => a + b, 0) : null
    const grandPnl    = grandCurrent != null ? grandCurrent - pricedInvested : null
    const grandPnlPct = grandPnl != null && pricedInvested ? (grandPnl / pricedInvested) * 100 : null

    const lastUpdated = [inUpdated, usUpdated, mfUpdated]
      .filter(Boolean)
      .sort((a, b) => b - a)[0] ?? null

    const insurance = summarizeInsurance(policies)
    const usIncomplete = usStocks.length > 0 && usInvestedINR == null

    return {
      inInvested,
      inCurrent: inCurrentKnown ? inCurrent : null,
      inToday,
      portfolioToday,
      usInvestedUSD,
      usCurrentUSD: usCurrentKnown ? usCurrentUSD : null,
      usInvestedINR,
      usCurrentINR,
      usIncomplete,
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
      insurance,
      counts: {
        indian: inStocks.length,
        us: usStocks.length,
        mf: funds.length,
        other: assets.length,
        insurance: policies.length,
      },
    }
  }, [inStocks, usStocks, usdInr, funds, assets, policies, inUpdated, usUpdated, mfUpdated])

  return {
    inStocks,
    usStocks,
    funds,
    assets,
    usdInr,
    inUpdated,
    totals,
    pricesStale: inPricesStale || usPricesStale,
  }
}

function InsuranceCategoryCard({ icon, accent, title, count, summary }) {
  return (
    <div
      className="dash-cat-card dash-cat-card--insurance"
      style={{ '--cat-accent': accent }}
    >
      <div className="dash-cat-header">
        <span className="dash-cat-title-wrap">
          <span className="dash-cat-icon" aria-hidden="true">{icon}</span>
          <span className="dash-cat-title">{title}</span>
        </span>
        <span className="dash-cat-count">{count} polic{count !== 1 ? 'ies' : 'y'}</span>
      </div>
      <div className="dash-cat-body">
        <div className="dash-cat-row">
          <span className="dash-cat-label">Total cover</span>
          <span className="dash-cat-val">
            {summary.totalCover > 0 ? formatINR(summary.totalCover, true) : '—'}
          </span>
        </div>
        <div className="dash-cat-row">
          <span className="dash-cat-label">Annual premium</span>
          <span className="dash-cat-val">
            {summary.totalPremium > 0 ? formatINR(summary.totalPremium, true) : '—'}
          </span>
        </div>
        <div className="dash-cat-row">
          <span className="dash-cat-label">Renewals</span>
          <span className="dash-cat-val">{formatInsuranceRenewalsLine(summary)}</span>
        </div>
      </div>
    </div>
  )
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

function DashboardFooter({ lastUpdated, pricesStale }) {
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
      <div className="dash-footer-top">
        <span className={`dash-footer-live ${pricesStale ? 'dash-footer-live--stale' : ''}`}>
          <span className="dash-footer-dot" aria-hidden="true" />
          {pricesStale ? 'Cached prices' : 'Live'}
        </span>
        <span className="dash-footer-sep">·</span>
        <span>Last updated: {timeStr}</span>
        <span className="dash-footer-sep">·</span>
        <span>Auto-refresh: {intervalLabel}</span>
      </div>
      <p className="dash-footer-sebi">
        ⚠️ This app is not registered with SEBI. It is a personal finance tracker for informational purposes only.
        Investment decisions should be made after consulting a SEBI-registered investment advisor.
      </p>
    </footer>
  )
}

export default function Dashboard() {
  const { inStocks, usStocks, funds, assets, usdInr, inUpdated, totals: t, pricesStale } =
    useDashboardPortfolio()
  const hasInvestments =
    t.counts.indian + t.counts.us + t.counts.mf + t.counts.other > 0
  const hasAny = hasInvestments || t.counts.insurance > 0

  const portfolioXirr = useMemo(
    () => calcPortfolioXirr({
      indianStocks: inStocks,
      usStocks,
      mutualFunds: funds,
      transactions: storage.getTransactions(),
      usdInr,
    }),
    [inStocks, usStocks, funds, usdInr]
  )

  // Current-FY tax summary (runs only when holdings exist)
  const taxSummary = useMemo(() => {
    if (!hasInvestments) return null
    try {
      return calculateEquityTaxReport()
    } catch {
      return null
    }
  }, [hasInvestments])

  const [snapshotRefresh, setSnapshotRefresh] = useState(0)

  useEffect(() => {
    if (t.grandCurrent != null) {
      recordDailySnapshot(t.grandCurrent)
        .then(() => setSnapshotRefresh((n) => n + 1))
        .catch(() => {})
    }
  }, [t.grandCurrent])

  if (!hasAny) {
    return (
      <div className="page page--dashboard">
        <div className="coming-soon" role="status" aria-live="polite">
          <div className="placeholder-icon" aria-hidden="true">📊</div>
          <h2>Dashboard</h2>
          <p>Add holdings or insurance policies to see your summary here.</p>
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
              sub: t.usIncomplete
                ? 'Excludes US stocks (USD/INR unavailable)'
                : formatINR(t.grandInvested),
              warning: t.usIncomplete,
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
              value: t.portfolioToday != null ? formatINR(t.portfolioToday, true) : '—',
              sub: t.portfolioToday != null ? formatChange(t.portfolioToday) : 'No price data',
              colorClass: t.portfolioToday != null ? pnlColorClass(t.portfolioToday) : '',
              accent:
                t.portfolioToday != null ? (t.portfolioToday >= 0 ? 'gain' : 'loss') : null,
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
            {
              label: 'Portfolio XIRR',
              value: formatXirrDisplay(portfolioXirr),
              sub: portfolioXirr == null
                ? (t.counts.us > 0 && !usdInr ? 'Refresh US prices for XIRR' : 'Add purchase dates')
                : 'Annualized (INR)',
              colorClass: portfolioXirr != null ? pnlColorClass(portfolioXirr) : '',
              accent: portfolioXirr != null ? (portfolioXirr >= 0 ? 'gain' : 'loss') : null,
              icon: '📊',
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
            {t.counts.insurance > 0 && (
              <InsuranceCategoryCard
                {...CATEGORY_META.insurance}
                count={t.counts.insurance}
                summary={t.insurance}
              />
            )}
          </div>
          {t.counts.insurance > 0 && (
            <p className="dash-insurance-footnote">
              Insurance cover and premiums are not included in portfolio value above.
            </p>
          )}
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

        {taxSummary && (taxSummary.summary.totalStcg > 0 || taxSummary.summary.totalLtcg > 0) && (
          <section className="dash-section dash-section--tax">
            <div className="dash-section-label">Current FY Tax Estimate</div>
            <div className="dash-tax-grid">
              <div className="dash-tax-card">
                <span className="dash-tax-label">STCG</span>
                <span className="dash-tax-val">{formatINR(taxSummary.summary.totalStcg, true)}</span>
                <span className="dash-tax-sub">@ 15%</span>
              </div>
              <div className="dash-tax-card">
                <span className="dash-tax-label">LTCG</span>
                <span className="dash-tax-val">{formatINR(taxSummary.summary.totalLtcg, true)}</span>
                <span className="dash-tax-sub">above ₹1L exempt</span>
              </div>
              <div className="dash-tax-card dash-tax-card--accent">
                <span className="dash-tax-label">Est. tax due</span>
                <span className="dash-tax-val">{formatINR(taxSummary.summary.estimatedTax, true)}</span>
                <span className="dash-tax-sub">not financial advice</span>
              </div>
              <div className="dash-tax-card">
                <span className="dash-tax-label">STT paid</span>
                <span className="dash-tax-val">{formatINR(taxSummary.summary.totalStt, true)}</span>
                <span className="dash-tax-sub">on sells</span>
              </div>
            </div>
          </section>
        )}

        <section className="dash-section dash-section--history">
          <PortfolioHistoryChart            refreshKey={snapshotRefresh}
            investedValue={t.grandInvested}
            liveCurrentValue={t.grandCurrent}
            todayPnl={t.portfolioToday}
            holdings={{
              indianStocks: inStocks,
              usStocks,
              mutualFunds: funds,
              otherAssets: assets,
              usdInr,
            }}
          />
        </section>

        <DashboardFooter lastUpdated={inUpdated || t.lastUpdated} pricesStale={pricesStale} />
      </div>
    </div>
  )
}
