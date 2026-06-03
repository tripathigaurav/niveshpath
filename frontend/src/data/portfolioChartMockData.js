/**
 * Mock portfolio value series for demos and Storybook-style testing.
 * PortfolioValue(t) = sum(quantity_i * price_i(t)) — here pre-aggregated.
 */

export const MOCK_PORTFOLIO_SERIES = [
  { date: '2026-01-01', value: 100000 },
  { date: '2026-01-02', value: 101200 },
  { date: '2026-01-03', value: 99000 },
  { date: '2026-01-04', value: 103000 },
  { date: '2026-01-05', value: 105500 },
  { date: '2026-01-08', value: 104200 },
  { date: '2026-01-12', value: 108900 },
  { date: '2026-01-18', value: 107400 },
  { date: '2026-01-25', value: 112000 },
  { date: '2026-02-01', value: 115800 },
  { date: '2026-02-10', value: 114300 },
  { date: '2026-02-20', value: 118600 },
  { date: '2026-03-01', value: 121200 },
  { date: '2026-03-15', value: 119900 },
  { date: '2026-04-01', value: 124320 },
]

/** Demo invested baseline for green/red vs invested styling */
export const MOCK_INVESTED_VALUE = 98000
