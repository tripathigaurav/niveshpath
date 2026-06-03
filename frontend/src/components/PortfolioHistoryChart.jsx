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
  computeChartSummary,
  filterPointsByRange,
} from '../utils/portfolioChartData'
import { buildPortfolioValueBreakdown } from '../utils/portfolioValueBreakdown'
import { storage } from '../utils/storage'
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
}) {
  const [range, setRange] = useState('1Y')
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

      const resolved = resolvePortfolioChartPoints(snapshots, ledgerPoints, liveCurrentValue)
      const source =
        resolved[0]?.source === 'snapshot' && !snapshots.some((s) => s.demo)
          ? 'snapshot'
          : 'ledger'

      if (!cancelled) {
        setAllPoints(resolved)
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
    () => filterPointsByRange(allPoints, range),
    [allPoints, range]
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
      emptyMessage="Add holdings or log buy/sell transactions to see portfolio history."
    />
  )
}

export { CHART_RANGES }
