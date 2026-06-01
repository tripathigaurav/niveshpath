export function calcPnl(item) {
  const invested = item.qty * item.buyPrice
  const current = item.currentPrice != null ? item.qty * item.currentPrice : null
  const pnl = current != null ? current - invested : null
  const pnlPct = pnl != null && invested ? (pnl / invested) * 100 : null
  return { invested, current, pnl, pnlPct }
}

export function calcUsPnl(stock) {
  const investedUSD = stock.qty * stock.buyPrice
  const currentUSD = stock.currentPrice != null ? stock.qty * stock.currentPrice : null
  const pnlUSD = currentUSD != null ? currentUSD - investedUSD : null
  const pnlPct = pnlUSD != null && investedUSD ? (pnlUSD / investedUSD) * 100 : null
  return { investedUSD, currentUSD, pnlUSD, pnlPct }
}

export function calcMfPnl(fund) {
  const invested = fund.units * fund.buyNAV
  const current = fund.currentNAV != null ? fund.units * fund.currentNAV : null
  const pnl = current != null ? current - invested : null
  const pnlPct = pnl != null && invested ? (pnl / invested) * 100 : null
  return { invested, current, pnl, pnlPct }
}

export function calcOtherPnl(asset) {
  const pnl = asset.currentValue != null ? asset.currentValue - asset.investedAmount : null
  const pnlPct = pnl != null && asset.investedAmount ? (pnl / asset.investedAmount) * 100 : null
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
