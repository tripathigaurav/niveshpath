import type {
  StockHolding,
  MutualFundHolding,
  OtherAssetHolding,
  PnlResult,
  UsPnlResult,
  TotalsResult,
} from '../types/portfolio'

function pnlFromValues(
  invested: number,
  current: number | null,
): { pnl: number | null; pnlPct: number | null } {
  const pnl = current != null ? current - invested : null
  const pnlPct = pnl != null && invested ? (pnl / invested) * 100 : null
  return { pnl, pnlPct }
}

export function pnlColorClass(value: number | null): string {
  if (value == null || value === 0) return ''
  return value > 0 ? 'text-gain' : 'text-loss'
}

export function calcPnl(item: {
  qty: number
  buyPrice: number
  currentPrice: number | null
}): PnlResult {
  const invested = item.qty * item.buyPrice
  const current = item.currentPrice != null ? item.qty * item.currentPrice : null
  return { invested, current, ...pnlFromValues(invested, current) }
}

export interface IndianStockMetrics extends PnlResult {
  dayChangePerShare: number | null
  dayChangePct: number | null
  todayPnl: number | null
  ltp: number | null
}

/** Per-share day change + holding-level today P&L for Indian stocks. */
export function calcIndianStockMetrics(stock: StockHolding): IndianStockMetrics {
  const { invested, current, pnl, pnlPct } = calcPnl(stock)
  const dayChangePerShare = stock.dayChange ?? null
  const dayChangePct = stock.dayChangePct ?? null
  const todayPnl =
    dayChangePerShare != null && stock.qty != null
      ? stock.qty * dayChangePerShare
      : null
  return {
    invested,
    current,
    pnl,
    pnlPct,
    dayChangePerShare,
    dayChangePct,
    todayPnl,
    ltp: stock.currentPrice ?? null,
  }
}

export function sumTodayPnl(stocks: StockHolding[]): number | null {
  let sum = 0
  let hasAny = false
  for (const s of stocks) {
    const { todayPnl } = calcIndianStockMetrics(s)
    if (todayPnl != null) {
      sum += todayPnl
      hasAny = true
    }
  }
  return hasAny ? sum : null
}

/** Today's P&L in INR for US holdings (needs USD/INR). */
export function sumTodayPnlUS(stocks: StockHolding[], usdInr: number | null): number | null {
  if (!usdInr) return null
  let sum = 0
  let hasAny = false
  for (const s of stocks) {
    if (s.dayChange != null && s.qty != null) {
      sum += s.dayChange * s.qty * usdInr
      hasAny = true
    }
  }
  return hasAny ? sum : null
}

/** Today's P&L from NAV change vs previous NAV. */
export function sumTodayPnlMF(funds: MutualFundHolding[]): number | null {
  let sum = 0
  let hasAny = false
  for (const f of funds) {
    const prev = f.previousNAV ?? null
    if (prev == null || f.currentNAV == null || f.units == null) continue
    sum += (f.currentNAV - prev) * f.units
    hasAny = true
  }
  return hasAny ? sum : null
}

export function sumPortfolioTodayPnl({
  indianStocks = [],
  usStocks = [],
  mutualFunds = [],
  usdInr,
}: {
  indianStocks?: StockHolding[]
  usStocks?: StockHolding[]
  mutualFunds?: MutualFundHolding[]
  usdInr?: number | null
}): number | null {
  const parts = [
    sumTodayPnl(indianStocks),
    sumTodayPnlUS(usStocks, usdInr ?? null),
    sumTodayPnlMF(mutualFunds),
  ].filter((v): v is number => v != null)
  if (!parts.length) return null
  return parts.reduce((a, b) => a + b, 0)
}

export function calcUsPnl(stock: StockHolding): UsPnlResult {
  const investedUSD = stock.qty * stock.buyPrice
  const currentUSD = stock.currentPrice != null ? stock.qty * stock.currentPrice : null
  const { pnl, pnlPct } = pnlFromValues(investedUSD, currentUSD)
  return { investedUSD, currentUSD, pnlUSD: pnl, pnlPct }
}

export function calcMfPnl(fund: MutualFundHolding): PnlResult {
  const invested = fund.units * fund.buyNAV
  const current = fund.currentNAV != null ? fund.units * fund.currentNAV : null
  return { invested, current, ...pnlFromValues(invested, current) }
}

/**
 * Elapsed years between a past ISO date and today (floored at 0).
 * Capped at an optional end date (e.g. maturity) if already passed.
 */
function elapsedYears(startIso: string, endIso?: string | null): number {
  const start = new Date(startIso).getTime()
  const cap = endIso ? Math.min(Date.now(), new Date(endIso).getTime()) : Date.now()
  return Math.max(0, (cap - start) / (365.25 * 24 * 60 * 60 * 1000))
}

/**
 * Estimate current value for asset types that accrue value via a known rate.
 * Returns null when insufficient data is available — caller falls back to
 * the manually entered currentValue.
 *
 * FD / Bonds  → simple interest  : P × (1 + r/100 × t)  [capped at maturity]
 * PPF / EPF   → annual compound  : P × (1 + r/100) ^ t
 *
 * NPS, RealEstate, Gold, Crypto, Other → no formula; return null.
 */
function estimateCurrentValue(asset: OtherAssetHolding): number | null {
  const { type, investedAmount, addedDate, interestRate, couponRate, maturityDate } = asset
  if (!investedAmount || !addedDate) return null

  const rate = interestRate ?? couponRate ?? null

  switch (type) {
    case 'FD': {
      // FD: simple interest, accrual stops at maturity
      if (rate == null) return null
      const t = elapsedYears(addedDate, maturityDate)
      return investedAmount * (1 + (rate / 100) * t)
    }
    case 'Bonds': {
      // Coupon bond: simple annual interest on face value
      if (rate == null) return null
      const t = elapsedYears(addedDate, maturityDate)
      return investedAmount * (1 + (rate / 100) * t)
    }
    case 'PPF':
    case 'EPF': {
      // Annual compound interest on the recorded balance
      if (rate == null) return null
      const t = elapsedYears(addedDate)
      return investedAmount * Math.pow(1 + rate / 100, t)
    }
    default:
      // NPS, RealEstate, Gold, Crypto, Other — user must enter currentValue
      return null
  }
}

export function calcOtherPnl(asset: OtherAssetHolding): { pnl: number | null; pnlPct: number | null } {
  const invested = asset.investedAmount
  // Normalise stored value — treat '', 0, NaN (legacy empty saves) as null
  const storedCurrent: number | null =
    typeof asset.currentValue === 'number' && isFinite(asset.currentValue) && asset.currentValue > 0
      ? asset.currentValue
      : null

  let current: number | null
  if (asset.type === 'FD') {
    // FD: formula is exact — always live, regardless of manual entry
    current = estimateCurrentValue(asset) ?? storedCurrent
  } else {
    // Bonds / PPF / EPF: formula is partial; prefer manual entry when present
    // NPS / RealEstate / Gold / Crypto / Other: manual entry only
    current = storedCurrent ?? estimateCurrentValue(asset) ?? null
  }

  const { pnl, pnlPct } = pnlFromValues(invested, current)
  return { pnl, pnlPct }
}

interface CalcTotalsOptions {
  investedKey?: string | null
  currentKey?: string | null
}

export function calcTotals(
  items: Array<Record<string, unknown>>,
  { investedKey = null, currentKey = null }: CalcTotalsOptions = {},
): TotalsResult {
  let totalInvested = 0
  let totalCurrent = 0
  let hasPrice = false

  items.forEach((item) => {
    if (investedKey) {
      totalInvested += (item[investedKey] as number) || 0
    } else {
      const qty = (item['qty'] ?? item['units']) as number
      const price = (item['buyPrice'] ?? item['buyNAV']) as number
      totalInvested += qty * price
    }
    const priceVal = currentKey
      ? item[currentKey]
      : (item['currentPrice'] ?? item['currentNAV'])
    if (priceVal != null) {
      const multiplier = (item['qty'] ?? item['units']) as number | null
      totalCurrent += multiplier != null ? multiplier * (priceVal as number) : (priceVal as number)
      hasPrice = true
    }
  })

  const totalPnl = hasPrice ? totalCurrent - totalInvested : null
  const totalPnlPct = totalPnl != null && totalInvested ? (totalPnl / totalInvested) * 100 : null
  return {
    totalInvested,
    totalCurrent: hasPrice ? totalCurrent : null,
    totalPnl,
    totalPnlPct,
  }
}
