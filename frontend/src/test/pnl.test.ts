import {
  calcPnl,
  calcUsPnl,
  calcMfPnl,
  calcOtherPnl,
  calcTotals,
  calcIndianStockMetrics,
  sumTodayPnl,
  sumTodayPnlMF,
  sumTodayPnlUS,
  sumPortfolioTodayPnl,
  pnlColorClass,
} from '../utils/pnl'
import type { StockHolding, MutualFundHolding, OtherAssetHolding } from '../types/portfolio'

// Minimal test fixtures — only fields required by each function
const makeStock = (overrides: Partial<StockHolding> = {}): StockHolding => ({
  id: 'test', symbol: 'TEST', name: 'Test Co',
  qty: 10, buyPrice: 100, currentPrice: null,
  dayChange: null, dayChangePct: null,
  ...overrides,
})
const makeMF = (overrides: Partial<MutualFundHolding> = {}): MutualFundHolding => ({
  id: 'mf1', schemeCode: '119551', schemeName: 'Test Fund',
  units: 100, buyNAV: 50, currentNAV: null, navDate: null,
  ...overrides,
})
const makeAsset = (overrides: Partial<OtherAssetHolding> = {}): OtherAssetHolding => ({
  id: 'oa1', name: 'Test FD', type: 'FD', investedAmount: 100000,
  currentValue: null, notes: '', addedDate: '2024-01-01',
  ...overrides,
})

describe('calcPnl', () => {
  test('stock with gain', () => {
    const result = calcPnl({ qty: 10, buyPrice: 100, currentPrice: 120 })
    expect(result.invested).toBe(1000)
    expect(result.current).toBe(1200)
    expect(result.pnl).toBe(200)
    expect(result.pnlPct).toBeCloseTo(20)
  })

  test('stock with loss', () => {
    const result = calcPnl({ qty: 5, buyPrice: 200, currentPrice: 150 })
    expect(result.pnl).toBe(-250)
    expect(result.pnlPct).toBeCloseTo(-25)
  })

  test('currentPrice is null (no price fetched)', () => {
    const result = calcPnl({ qty: 10, buyPrice: 100, currentPrice: null })
    expect(result.invested).toBe(1000)
    expect(result.current).toBeNull()
    expect(result.pnl).toBeNull()
    expect(result.pnlPct).toBeNull()
  })

  test('currentPrice is 0 (delisted stock)', () => {
    const result = calcPnl({ qty: 10, buyPrice: 100, currentPrice: 0 })
    expect(result.current).toBe(0)
    expect(result.pnl).toBe(-1000)
    expect(result.pnlPct).toBeCloseTo(-100)
  })

  test('qty is 0', () => {
    const result = calcPnl({ qty: 0, buyPrice: 100, currentPrice: 120 })
    expect(result.invested).toBe(0)
    expect(result.current).toBe(0)
    expect(result.pnl).toBe(0)
    expect(result.pnlPct).toBeNull()
  })

  test('fractional qty (0.5 shares)', () => {
    const result = calcPnl({ qty: 0.5, buyPrice: 1000, currentPrice: 1200 })
    expect(result.invested).toBe(500)
    expect(result.current).toBe(600)
    expect(result.pnl).toBe(100)
  })

  test('very large values (crore range)', () => {
    const result = calcPnl({ qty: 100000, buyPrice: 2500, currentPrice: 2600 })
    expect(result.invested).toBe(250000000)
    expect(result.current).toBe(260000000)
    expect(result.pnl).toBe(10000000)
    expect(result.pnlPct).toBeCloseTo(4)
  })
})

describe('calcUsPnl', () => {
  test('US stock with gain in USD', () => {
    const result = calcUsPnl(makeStock({ qty: 5, buyPrice: 150, currentPrice: 180 }))
    expect(result.investedUSD).toBe(750)
    expect(result.currentUSD).toBe(900)
    expect(result.pnlUSD).toBe(150)
    expect(result.pnlPct).toBeCloseTo(20)
  })

  test('null currentPrice', () => {
    const result = calcUsPnl(makeStock({ qty: 5, buyPrice: 150, currentPrice: null }))
    expect(result.currentUSD).toBeNull()
    expect(result.pnlUSD).toBeNull()
  })
})

describe('calcMfPnl', () => {
  test('mutual fund with gain', () => {
    const result = calcMfPnl(makeMF({ units: 100, buyNAV: 50, currentNAV: 55 }))
    expect(result.invested).toBe(5000)
    expect(result.current).toBe(5500)
    expect(result.pnl).toBe(500)
    expect(result.pnlPct).toBeCloseTo(10)
  })

  test('null currentNAV', () => {
    const result = calcMfPnl(makeMF({ units: 100, buyNAV: 50, currentNAV: null }))
    expect(result.current).toBeNull()
    expect(result.pnl).toBeNull()
  })

  test('fractional units (SIP buys)', () => {
    const result = calcMfPnl(makeMF({ units: 47.325, buyNAV: 42.15, currentNAV: 48.90 }))
    expect(result.invested).toBeCloseTo(1994.75, 1)
    expect(result.current).toBeCloseTo(2314.19, 1)
  })
})

describe('calcOtherPnl', () => {
  test('FD with gain', () => {
    const result = calcOtherPnl(makeAsset({ investedAmount: 100000, currentValue: 107000 }))
    expect(result.pnl).toBe(7000)
    expect(result.pnlPct).toBeCloseTo(7)
  })

  test('null currentValue', () => {
    const result = calcOtherPnl(makeAsset({ investedAmount: 100000, currentValue: null }))
    expect(result.pnl).toBeNull()
    expect(result.pnlPct).toBeNull()
  })

  test('zero invested', () => {
    const result = calcOtherPnl(makeAsset({ investedAmount: 0, currentValue: 5000 }))
    expect(result.pnl).toBe(5000)
    expect(result.pnlPct).toBeNull()
  })
})

describe('calcTotals', () => {
  test('multiple stocks with prices', () => {
    const items = [
      { qty: 10, buyPrice: 100, currentPrice: 120 },
      { qty: 5, buyPrice: 200, currentPrice: 180 },
    ]
    const result = calcTotals(items)
    expect(result.totalInvested).toBe(2000)
    expect(result.totalCurrent).toBe(2100)
    expect(result.totalPnl).toBe(100)
    expect(result.totalPnlPct).toBeCloseTo(5)
  })

  test('empty array', () => {
    const result = calcTotals([])
    expect(result.totalInvested).toBe(0)
    expect(result.totalCurrent).toBeNull()
    expect(result.totalPnl).toBeNull()
  })

  test('all prices null', () => {
    const items = [
      { qty: 10, buyPrice: 100, currentPrice: null },
      { qty: 5, buyPrice: 200, currentPrice: null },
    ]
    const result = calcTotals(items)
    expect(result.totalInvested).toBe(2000)
    expect(result.totalCurrent).toBeNull()
    expect(result.totalPnl).toBeNull()
  })

  test('mixed null and valid prices', () => {
    const items = [
      { qty: 10, buyPrice: 100, currentPrice: 120 },
      { qty: 5, buyPrice: 200, currentPrice: null },
    ]
    const result = calcTotals(items)
    expect(result.totalInvested).toBe(2000)
    expect(result.totalCurrent).toBe(1200)
    expect(result.totalPnl).toBe(-800)
  })

  test('with MF-style keys (units / buyNAV / currentNAV)', () => {
    const items = [{ units: 100, buyNAV: 50, currentNAV: 55 }]
    const result = calcTotals(items)
    expect(result.totalInvested).toBe(5000)
    expect(result.totalCurrent).toBe(5500)
  })
})

describe('sumTodayPnlMF', () => {
  test('sums only funds with previousNAV', () => {
    const funds = [
      makeMF({ units: 100, previousNAV: 50, currentNAV: 52 }),
      makeMF({ units: 50, previousNAV: null, currentNAV: 40, buyNAV: 30 }),
    ]
    expect(sumTodayPnlMF(funds)).toBe(200)
  })

  test('returns null when no fund has previousNAV', () => {
    expect(sumTodayPnlMF([makeMF({ units: 10, currentNAV: 50, buyNAV: 45 })])).toBeNull()
  })
})

describe('pnlColorClass', () => {
  test('positive returns gain class', () => {
    expect(pnlColorClass(10)).toMatch(/gain/i)
  })
  test('negative returns loss class', () => {
    expect(pnlColorClass(-5)).toMatch(/loss/i)
  })
  test('zero returns empty string', () => {
    expect(pnlColorClass(0)).toBe('')
  })
  test('null returns empty string', () => {
    expect(pnlColorClass(null)).toBe('')
  })
})

describe('calcIndianStockMetrics', () => {
  test('returns all metrics for priced stock', () => {
    const result = calcIndianStockMetrics(makeStock({
      qty: 10, buyPrice: 100, currentPrice: 120,
      dayChange: 2, dayChangePct: 1.7,
    }))
    expect(result.invested).toBe(1000)
    expect(result.current).toBe(1200)
    expect(result.pnl).toBe(200)
    expect(result.todayPnl).toBe(20)       // 10 * 2
    expect(result.dayChangePerShare).toBe(2)
    expect(result.ltp).toBe(120)
  })

  test('handles null currentPrice', () => {
    const result = calcIndianStockMetrics(makeStock({ currentPrice: null, dayChange: null }))
    expect(result.current).toBeNull()
    expect(result.pnl).toBeNull()
    expect(result.todayPnl).toBeNull()
  })

  test('handles null dayChange', () => {
    const result = calcIndianStockMetrics(makeStock({ currentPrice: 110, dayChange: null }))
    expect(result.current).toBe(1100)
    expect(result.todayPnl).toBeNull()
  })
})

describe('sumTodayPnl (Indian stocks)', () => {
  test('sums day changes across stocks', () => {
    const stocks = [
      makeStock({ qty: 10, dayChange: 2 }),
      makeStock({ qty: 5, dayChange: -3 }),
    ]
    // todayPnl = (10*2) + (5*-3) = 20 - 15 = 5
    expect(sumTodayPnl(stocks)).toBe(5)
  })

  test('returns null when no day changes available', () => {
    const stocks = [makeStock({ qty: 10, dayChange: null })]
    expect(sumTodayPnl(stocks)).toBeNull()
  })

  test('returns null for empty array', () => {
    expect(sumTodayPnl([])).toBeNull()
  })
})

describe('sumTodayPnlUS', () => {
  test('sums US day changes with USD/INR rate', () => {
    const stocks = [
      makeStock({ qty: 2, dayChange: 1.5 }),
      makeStock({ qty: 3, dayChange: -0.5 }),
    ]
    // (2*1.5 + 3*-0.5) * 85 = (3 - 1.5) * 85 = 1.5 * 85 = 127.5
    expect(sumTodayPnlUS(stocks, 85)).toBeCloseTo(127.5)
  })

  test('returns null when usdInr is null', () => {
    expect(sumTodayPnlUS([makeStock({ dayChange: 2 })], null)).toBeNull()
  })
})

describe('sumPortfolioTodayPnl', () => {
  test('aggregates all categories', () => {
    const indianStocks = [makeStock({ qty: 10, dayChange: 2 })]
    const usStocks = [makeStock({ qty: 1, dayChange: 1 })]
    const mutualFunds = [makeMF({ units: 100, previousNAV: 50, currentNAV: 51 })]
    const result = sumPortfolioTodayPnl({ indianStocks, usStocks, mutualFunds, usdInr: 85 })
    // Indian: 20, US: 85, MF: 100 → 205
    expect(result).toBeCloseTo(205)
  })

  test('returns null when no category has data', () => {
    expect(sumPortfolioTodayPnl({})).toBeNull()
  })
})
