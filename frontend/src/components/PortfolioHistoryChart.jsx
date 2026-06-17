import { useEffect, useMemo, useState } from 'react'
import {
  getPortfolioSnapshotsForRange,
  hasDemoSnapshots,
  purgeDemoSnapshots,
} from '../utils/portfolioSnapshots'
import {
  buildPortfolioHistoryFromLedger,
  resolvePortfolioChartPoints,
} from '../utils/portfolioLedgerHistory'
import {
  CHART_RANGES,
  compactFlatRuns,
  computeChartSummary,
  resolveRangePoints,
} from '../utils/portfolioChartData'
import { buildPortfolioValueBreakdown } from '../utils/portfolioValueBreakdown'
import {
  getPortfolioMarketDataStatus,
  portfolioHasMarketHoldings,
} from '../utils/marketDataStatus'
import { storage } from '../utils/storage'
import HoldingsDataIssue from './HoldingsDataIssue'
import PortfolioValueChart from './PortfolioValueChart'

/**
 * Container: chart from holdings + transaction ledger; real daily snapshots when trustworthy.
 */
export default function PortfolioHistoryChart({
  refreshKey = 0,
  investedValue = null,
  todayPnl = null,
  liveCurrentValue = null,
  holdings = null,
  pricesStale = false,
}) {
  const [range, setRange] = useState('ALL')
  const [viewMode, setViewMode] = useState('value')
  const [allPoints, setAllPoints] = useState([])
  const [historySource, setHistorySource] = useState('ledger')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      if (await hasDemoSnapshots()) {
        await purgeDemoSnapshots()
      }

      const snapshots = await getPortfolioSnapshotsForRange('ALL')
      const ledgerPoints = holdings
        ? buildPortfolioHistoryFromLedger({
            transactions: storage.getTransactions(),
            indianStocks: holdings.indianStocks ?? [],
            usStocks: holdings.usStocks ?? [],
            mutualFunds: holdings.mutualFunds ?? [],
            otherAssets: holdings.otherAssets ?? [],
            usdInr: holdings.usdInr ?? null,
            liveCurrentValue,
            liveInvestedValue: investedValue,
          })
        : []

      const { points: resolved, source } = resolvePortfolioChartPoints(
        snapshots,
        ledgerPoints,
        liveCurrentValue
      )
      const chartPoints =
        source === 'snapshot' ? resolved : compactFlatRuns(resolved)

      if (!cancelled) {
        setAllPoints(chartPoints)
        setHistorySource(source)
      }
    }

    load()
      .catch(() => {
        if (!cancelled) setAllPoints([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey, holdings, liveCurrentValue, investedValue])

  const points = useMemo(
    () =>
      resolveRangePoints(allPoints, range, {
        liveCurrentValue,
        todayPnl,
      }),
    [allPoints, range, liveCurrentValue, todayPnl]
  )

  const summary = useMemo(() => {
    const base = computeChartSummary(points, {
      investedValue,
      todayPnl,
      liveCurrentValue,
    })
    return { ...base, historySource }
  }, [points, investedValue, todayPnl, liveCurrentValue, historySource])

  const breakdown = useMemo(() => {
    if (!holdings) return null
    return buildPortfolioValueBreakdown({
      ...holdings,
      grandInvested: investedValue,
      grandCurrent: liveCurrentValue,
      portfolioTodayPnl: todayPnl,
    })
  }, [holdings, investedValue, liveCurrentValue, todayPnl])

  const portfolioMarketStatus = useMemo(
    () => (holdings ? getPortfolioMarketDataStatus(holdings) : { ready: true, issues: [] }),
    [holdings]
  )

  const chartBlocked =
    !loading &&
    holdings &&
    portfolioHasMarketHoldings(holdings) &&
    liveCurrentValue == null

  const partialWarning = useMemo(() => {
    if (!holdings || chartBlocked || portfolioMarketStatus.ready) return null
    return portfolioMarketStatus.issues.find((i) => i.code === 'partial_missing') ?? null
  }, [holdings, chartBlocked, portfolioMarketStatus])

  if (chartBlocked) {
    const primary = portfolioMarketStatus.issues[0] || {
      ready: false,
      level: 'error',
      code: 'all_missing',
      assetType: 'indianStock',
    }
    return (
      <div className="pvc-card">
        <div className="pvc-header">
          <div className="pvc-header-left">
            <h3 className="pvc-title">Portfolio Value</h3>
          </div>
        </div>
        <HoldingsDataIssue
          assetType={primary.assetType || 'indianStock'}
          status={primary}
          portfolioIssues={portfolioMarketStatus.issues}
          context="portfolio"
        />
      </div>
    )
  }

  return (
    <PortfolioValueChart
      points={points}
      summary={summary}
      breakdown={breakdown}
      range={range}
      onRangeChange={setRange}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      loading={loading}
      pricesStale={pricesStale}
      dataWarning={partialWarning}
      emptyMessage="Add holdings or log buy/sell transactions to see portfolio history."
    />
  )
}

export { CHART_RANGES }
