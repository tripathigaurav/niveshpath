import { useMemo } from 'react'
import { useIndianStocks, useUSStocks, useMutualFunds } from './usePortfolio'
import { calcIndianStockMetrics, calcUsPnl, calcMfPnl } from '../utils/pnl'

function topBottomFromList(list) {
  const sorted = [...list].sort((a, b) => b.pnlPct - a.pnlPct)
  return {
    top: sorted.filter((p) => p.pnlPct > 0).slice(0, 3),
    bottom: sorted.filter((p) => p.pnlPct < 0).sort((a, b) => a.pnlPct - b.pnlPct).slice(0, 3),
  }
}

function buildIndianPerformers(stocks) {
  const list = []
  for (const s of stocks) {
    const { pnlPct } = calcIndianStockMetrics(s)
    if (pnlPct == null) continue
    list.push({
      id: s.id,
      symbol: s.symbol,
      name: s.name || s.symbol,
      icon: '🇮🇳',
      pnlPct,
    })
  }
  return topBottomFromList(list)
}

function buildUsPerformers(stocks) {
  const list = []
  for (const s of stocks) {
    const { pnlPct } = calcUsPnl(s)
    if (pnlPct == null) continue
    list.push({
      id: s.id,
      symbol: s.symbol,
      name: s.name || s.symbol,
      icon: '🇺🇸',
      pnlPct,
    })
  }
  return topBottomFromList(list)
}

function buildMfPerformers(funds) {
  const list = []
  for (const f of funds) {
    const { pnlPct } = calcMfPnl(f)
    if (pnlPct == null) continue
    list.push({
      id: f.id,
      symbol: f.schemeCode || f.name,
      name: f.name,
      icon: '📋',
      pnlPct,
    })
  }
  return topBottomFromList(list)
}

export function usePortfolioPerformers() {
  const { stocks: inStocks } = useIndianStocks()
  const { stocks: usStocks } = useUSStocks()
  const { funds } = useMutualFunds()

  return useMemo(() => {
    const indian = buildIndianPerformers(inStocks)
    const us = buildUsPerformers(usStocks)
    const mf = buildMfPerformers(funds)

    const hasAny =
      inStocks.length > 0 ||
      usStocks.length > 0 ||
      funds.length > 0

    const hasPerformance =
      indian.top.length + indian.bottom.length +
      us.top.length + us.bottom.length +
      mf.top.length + mf.bottom.length > 0

    return {
      indian: { ...indian, count: inStocks.length },
      us: { ...us, count: usStocks.length },
      mf: { ...mf, count: funds.length },
      hasAny,
      hasPerformance,
    }
  }, [inStocks, usStocks, funds])
}
