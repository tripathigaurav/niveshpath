/**
 * Tax harvesting suggestions.
 *
 * Identifies current holdings with unrealized losses that could be sold to
 * "harvest" capital losses, offsetting STCG/LTCG from the same FY.
 *
 * NOT financial advice — purely informational.
 */
import { storage } from './storage'
import { calcIndianStockMetrics, calcMfPnl } from './pnl'
import { TAX_RULES, daysBetween } from './taxCalculator'

const TODAY = () => new Date().toISOString().slice(0, 10)

/**
 * Compute realized STCG + LTCG for the current/given FY from stored transactions.
 * Returns { realizedStcg, realizedLtcg }.
 */
export function getRealizedGainsFY(fyStartYear) {
  const now = new Date()
  const fy = fyStartYear ?? (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1)
  const fyStart = `${fy}-04-01`
  const fyEnd = `${fy + 1}-03-31`

  const txs = storage.getTransactions().filter(
    (t) => t.assetType === 'indianStock' && t.type === 'sell' &&
    t.date >= fyStart && t.date <= fyEnd
  )

  // Simplified: realized STCG/LTCG from stored gain fields if available, else skip
  let realizedStcg = 0
  let realizedLtcg = 0
  for (const t of txs) {
    if (t.stcg != null) realizedStcg += t.stcg
    if (t.ltcg != null) realizedLtcg += t.ltcg
  }
  return { realizedStcg, realizedLtcg, fyStart, fyEnd }
}

/**
 * Build a list of harvest candidates — holdings with unrealized losses.
 * @returns {Array<{
 *   id, symbol, name, icon, assetType,
 *   currentValue, unrealizedLoss, pnlPct,
 *   isLongTerm, holdingDays,
 *   potentialTaxSaving, notes
 * }>}
 */
export function getHarvestCandidates() {
  const today = TODAY()
  const stcgRate = TAX_RULES.equity.stcgRate
  const ltcgRate = TAX_RULES.equity.ltcgRate
  const ltcgExemption = TAX_RULES.equity.ltcgExemption
  const candidates = []

  // Indian stocks
  for (const s of storage.getIndianStocks()) {
    const m = calcIndianStockMetrics(s)
    if (m.pnl == null || m.pnl >= 0) continue // only losses
    const holdingDays = s.buyDate ? daysBetween(s.buyDate, today) : null
    const isLongTerm = holdingDays != null && holdingDays >= TAX_RULES.equity.ltcgThresholdDays
    const loss = Math.abs(m.pnl)
    // How much tax this loss could save:
    // STCG losses offset STCG/LTCG; LTCG losses offset LTCG only (simplified)
    const rate = isLongTerm ? ltcgRate : stcgRate
    const potentialTaxSaving = parseFloat((loss * rate).toFixed(2))

    candidates.push({
      id: s.id,
      symbol: s.symbol,
      name: s.name || s.symbol,
      icon: '🇮🇳',
      assetType: 'indianStock',
      currentValue: m.current,
      unrealizedLoss: loss,
      pnlPct: m.pnlPct,
      isLongTerm,
      holdingDays,
      potentialTaxSaving,
      notes: isLongTerm
        ? `LTCG loss — offsets LTCG above ₹1L exemption`
        : `STCG loss — offsets STCG & LTCG`,
    })
  }

  // Mutual funds
  for (const f of storage.getMutualFunds()) {
    const m = calcMfPnl(f)
    if (m.pnl == null || m.pnl >= 0) continue
    const holdingDays = f.buyDate ? daysBetween(f.buyDate, today) : null
    const isLongTerm = holdingDays != null && holdingDays >= TAX_RULES.equity.ltcgThresholdDays
    const loss = Math.abs(m.pnl)
    const rate = isLongTerm ? ltcgRate : stcgRate
    const potentialTaxSaving = parseFloat((loss * rate).toFixed(2))

    candidates.push({
      id: f.id,
      symbol: f.schemeCode || f.schemeName,
      name: f.schemeName || f.name,
      icon: '📋',
      assetType: 'mutualFund',
      currentValue: m.current,
      unrealizedLoss: loss,
      pnlPct: m.pnlPct,
      isLongTerm,
      holdingDays,
      potentialTaxSaving,
      notes: isLongTerm ? `LTCG loss — offsets LTCG above ₹1L exemption` : `STCG loss — offsets STCG & LTCG`,
    })
  }

  // Sort by potential tax saving (largest first)
  return candidates.sort((a, b) => b.potentialTaxSaving - a.potentialTaxSaving)
}
