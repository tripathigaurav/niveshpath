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

export function calcOtherPnl(asset: OtherAssetHolding): { pnl: number | null; pnlPct: number | null } {
  const invested = asset.investedAmount
  const current = asset.currentValue ?? null
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
