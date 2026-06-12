function pnlFromValues(invested, current) {
  const pnl = current != null ? current - invested : null
  const pnlPct = pnl != null && invested ? (pnl / invested) * 100 : null
  return { pnl, pnlPct }
}

export function pnlColorClass(value) {
  if (value == null || value === 0) return ''
  return value > 0 ? 'text-gain' : 'text-loss'
}

export function calcPnl(item) {
  const invested = item.qty * item.buyPrice
  const current = item.currentPrice != null ? item.qty * item.currentPrice : null
  return { invested, current, ...pnlFromValues(invested, current) }
}

/** Per-share day change + holding-level today P&L for Indian stocks. */
export function calcIndianStockMetrics(stock) {
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

export function sumTodayPnl(stocks) {
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
export function sumTodayPnlUS(stocks, usdInr) {
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
export function sumTodayPnlMF(funds) {
  let sum = 0
  let hasAny = false
  for (const f of funds) {
    const prev = f.previousNAV
    if (prev == null || f.currentNAV == null || f.units == null) continue
    sum += (f.currentNAV - prev) * f.units
    hasAny = true
  }
  return hasAny ? sum : null
}

export function sumPortfolioTodayPnl({ indianStocks = [], usStocks = [], mutualFunds = [], usdInr }) {
  const parts = [
    sumTodayPnl(indianStocks),
    sumTodayPnlUS(usStocks, usdInr),
    sumTodayPnlMF(mutualFunds),
  ].filter((v) => v != null)
  if (!parts.length) return null
  return parts.reduce((a, b) => a + b, 0)
}

export function calcUsPnl(stock) {
  const investedUSD = stock.qty * stock.buyPrice
  const currentUSD = stock.currentPrice != null ? stock.qty * stock.currentPrice : null
  const { pnl, pnlPct } = pnlFromValues(investedUSD, currentUSD)
  return { investedUSD, currentUSD, pnlUSD: pnl, pnlPct }
}

export function calcMfPnl(fund) {
  const invested = fund.units * fund.buyNAV
  const current = fund.currentNAV != null ? fund.units * fund.currentNAV : null
  return { invested, current, ...pnlFromValues(invested, current) }
}

export function calcOtherPnl(asset) {
  const invested = asset.investedAmount
  const current = asset.currentValue
  const { pnl, pnlPct } = pnlFromValues(invested, current ?? null)
  return { pnl, pnlPct }
}

export function calcTotals(items, { investedKey = null, currentKey = null } = {}) {
  let totalInvested = 0
  let totalCurrent = 0
  let hasPrice = false

  items.forEach((item) => {
    if (investedKey) {
      totalInvested += item[investedKey] || 0
    } else {
      totalInvested += (item.qty ?? item.units) * (item.buyPrice ?? item.buyNAV)
    }
    const price = currentKey ? item[currentKey] : (item.currentPrice ?? item.currentNAV)
    if (price != null) {
      const multiplier = item.qty ?? item.units
      totalCurrent += multiplier != null ? multiplier * price : price
      hasPrice = true
    }
  })

  const totalPnl = hasPrice ? totalCurrent - totalInvested : null
  const totalPnlPct = totalPnl != null && totalInvested ? (totalPnl / totalInvested) * 100 : null
  return { totalInvested, totalCurrent: hasPrice ? totalCurrent : null, totalPnl, totalPnlPct }
}
