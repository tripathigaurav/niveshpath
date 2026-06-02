/** Indian listed equity vs ETF (BeES, NSE ETFs, etc.) */

const KNOWN_INDIAN_ETF_SYMBOLS = new Set([
  'NIFTYBEES.NS', 'NIFTYBEES.BO',
  'SETFNIF50.NS', 'SETFNIF50.BO',
  'GOLDBEES.NS', 'GOLDBEES.BO',
  'JUNIORBEES.NS', 'BANKBEES.NS',
  'ITBEES.NS', 'PSUBNKBEES.NS',
  'MON100.NS', 'MAFANG.NS',
  'CPSEETF.NS', 'LIQUIDBEES.NS',
  'HDFCNIFETF.NS', 'ICICINIFTY.NS',
])

export function isIndianEtf(symbol, name = '') {
  const sym = String(symbol || '').toUpperCase()
  const base = sym.replace(/\.(NS|BO)$/i, '')
  if (KNOWN_INDIAN_ETF_SYMBOLS.has(sym)) return true
  if (/BEES$/i.test(base) || /ETF$/i.test(base)) return true

  const n = String(name || '').toUpperCase()
  if (/\bETF\b/.test(n) || /\bBEES\b/.test(n)) return true
  if (n.includes('EXCHANGE TRADED FUND') || n.includes('EXCHANGE-TRADED')) return true
  if (/\bNIFTY\s*50\b/.test(n) && /\b(ETF|BEES|FUND)\b/.test(n)) return true

  return false
}

export function normalizeIndianHolding(stock) {
  const isEtf = Boolean(stock.isEtf ?? isIndianEtf(stock.symbol, stock.name))
  return { ...stock, isEtf }
}

export function partitionIndianHoldings(stocks) {
  const all = (stocks || []).map(normalizeIndianHolding)
  const etfs = all.filter((s) => s.isEtf)
  const stocksOnly = all.filter((s) => !s.isEtf)
  return {
    all,
    stocksOnly,
    etfs,
    etfCount: etfs.length,
    stockCount: stocksOnly.length,
  }
}
