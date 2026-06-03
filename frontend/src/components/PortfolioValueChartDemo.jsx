import { useMemo, useState } from 'react'
import {
  MOCK_INVESTED_VALUE,
  MOCK_PORTFOLIO_SERIES,
} from '../data/portfolioChartMockData'
import {
  computeChartSummary,
  filterPointsByRange,
} from '../utils/portfolioChartData'
import PortfolioValueChart from './PortfolioValueChart'

/**
 * Standalone demo with mock data — wire real API by swapping points/summary props.
 */
export default function PortfolioValueChartDemo() {
  const [range, setRange] = useState('1M')
  const [viewMode, setViewMode] = useState('value')

  const points = useMemo(
    () => filterPointsByRange(MOCK_PORTFOLIO_SERIES, range),
    [range]
  )

  const summary = useMemo(
    () => computeChartSummary(points, { investedValue: MOCK_INVESTED_VALUE }),
    [points]
  )

  return (
    <PortfolioValueChart
      points={points}
      summary={summary}
      range={range}
      onRangeChange={setRange}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      loading={false}
    />
  )
}
