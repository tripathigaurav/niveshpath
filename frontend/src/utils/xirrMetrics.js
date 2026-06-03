import { calcXirr } from './xirr'
import { calcIndianStockMetrics, calcUsPnl, calcMfPnl } from './pnl'

const TODAY = () => new Date().toISOString().slice(0, 10)

function txToFlow(tx, amountMultiplier = 1) {
  const amt = tx.qty * tx.price * amountMultiplier
  return {
    date: tx.date,
    amount: tx.type === 'buy' ? -amt : amt,
  }
}

/**
 * Build cashflows for one symbol from transactions + terminal market value.
 */
export function buildSymbolCashflows(transactions, symbol, assetType, terminalValue, amountMultiplier = 1) {
  const flows = transactions
    .filter((t) => t.symbol === symbol && t.assetType === assetType)
    .map((t) => txToFlow(t, amountMultiplier))

  if (terminalValue != null && terminalValue > 0) {
    flows.push({ date: TODAY(), amount: terminalValue })
  }
  return flows
}

/**
 * Category-level XIRR (indianStock | usStock | mutualFund).
 * @param {'indianStock'|'usStock'|'mutualFund'} assetType
 * @param {object[]} holdings
 * @param {object[]} transactions
 * @param {{ usdInr?: number }} opts — US holdings: convert flows to INR with current rate
 */
export function calcCategoryXirr(assetType, holdings, transactions, { usdInr } = {}) {
  if (!holdings?.length || !transactions?.length) return null

  const mult = assetType === 'usStock' && usdInr ? usdInr : 1
  const symbols = [...new Set(holdings.map((h) => h.symbol))]

  const allFlows = []
  for (const sym of symbols) {
    const holding = holdings.find((h) => h.symbol === sym)
    let terminal = null
    if (holding) {
      if (assetType === 'indianStock') {
        const m = calcIndianStockMetrics(holding)
        terminal = m.current
      } else if (assetType === 'usStock') {
        const { currentUSD } = calcUsPnl(holding)
        terminal = currentUSD != null ? currentUSD * (usdInr || 0) : null
        if (!usdInr) terminal = currentUSD
      } else if (assetType === 'mutualFund') {
        const { current } = calcMfPnl(holding)
        terminal = current
      }
    }
    const symFlows = buildSymbolCashflows(transactions, sym, assetType, terminal, mult)
    allFlows.push(...symFlows)
  }

  return calcXirr(allFlows)
}

/**
 * Portfolio-wide XIRR in INR (US txs converted at current USD/INR).
 */
export function calcPortfolioXirr({
  indianStocks,
  usStocks,
  mutualFunds,
  transactions,
  usdInr,
}) {
  const flows = []

  for (const tx of transactions) {
    if (!['indianStock', 'usStock', 'mutualFund'].includes(tx.assetType)) continue
    let mult = 1
    if (tx.assetType === 'usStock') {
      if (!usdInr) continue
      mult = usdInr
    }
    flows.push(txToFlow(tx, mult))
  }

  for (const s of indianStocks) {
    const { current } = calcIndianStockMetrics(s)
    if (current != null) flows.push({ date: TODAY(), amount: current })
  }
  for (const s of usStocks) {
    const { currentUSD } = calcUsPnl(s)
    if (currentUSD != null && usdInr) flows.push({ date: TODAY(), amount: currentUSD * usdInr })
  }
  for (const f of mutualFunds) {
    const { current } = calcMfPnl(f)
    if (current != null) flows.push({ date: TODAY(), amount: current })
  }

  return calcXirr(flows)
}

export function formatXirrDisplay(rate) {
  if (rate == null) return 'N/A'
  return `${(rate * 100).toFixed(2)}%`
}

function holdingSymbol(holding, assetType) {
  if (assetType === 'mutualFund') return holding.schemeCode
  return holding.symbol
}

function terminalValueForHolding(holding, assetType, usdInr) {
  if (assetType === 'indianStock') {
    return calcIndianStockMetrics(holding).current
  }
  if (assetType === 'usStock') {
    const { currentUSD } = calcUsPnl(holding)
    if (currentUSD == null) return null
    return usdInr ? currentUSD * usdInr : currentUSD
  }
  if (assetType === 'mutualFund') {
    return calcMfPnl(holding).current
  }
  return null
}

/**
 * XIRR for a single holding (uses transactions for that symbol + current value).
 */
export function calcHoldingXirr(holding, assetType, transactions, { usdInr } = {}) {
  if (!holding || !transactions?.length) return null
  const symbol = holdingSymbol(holding, assetType)
  if (!symbol) return null
  const mult = assetType === 'usStock' && usdInr ? usdInr : 1
  const terminal = terminalValueForHolding(holding, assetType, usdInr)
  const flows = buildSymbolCashflows(transactions, symbol, assetType, terminal, mult)
  return calcXirr(flows)
}

/** Map holding id → XIRR rate for table columns. */
export function buildHoldingXirrMap(holdings, assetType, transactions, opts = {}) {
  const map = new Map()
  for (const h of holdings || []) {
    map.set(h.id, calcHoldingXirr(h, assetType, transactions, opts))
  }
  return map
}
