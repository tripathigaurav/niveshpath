/** US holding bucket: regular stock/ETF, ESPP, or RSU */
export const US_CATEGORY = {
  STOCK: 'stock',
  ESPP: 'espp',
  RSU: 'rsu',
}

const KNOWN_ETF_SYMBOLS = new Set([
  'SPY', 'QQQ', 'VTI', 'VOO', 'IVV', 'VEA', 'VWO', 'IWM', 'EFA', 'GLD', 'SLV',
  'ARKK', 'XLF', 'XLE', 'XLK', 'BND', 'AGG', 'SCHD', 'VGT', 'QQQM', 'VUG', 'VTV',
  'VXUS', 'IEMG', 'EEM', 'TLT', 'HYG', 'LQD', 'DIA', 'SMH', 'SOXX', 'VT', 'ITOT',
  'SPLG', 'JEPI', 'JEPQ', 'VNQ', 'IEF', 'SHY', 'IGSB', 'MUB', 'TIP', 'USO', 'UNG',
  'XBI', 'IBIT', 'FBTC', 'ETHA', 'SCHX', 'SCHB', 'SCHF', 'VYM', 'DVY', 'HDV',
  'IJR', 'IJH', 'MDY', 'RSP', 'MTUM', 'QUAL', 'USMV', 'DGRO', 'VIG', 'VOOG',
])

/**
 * Heuristic ETF detection for US symbols (used when category is "stock").
 */
export function isUsEtf(symbol, name = '') {
  const sym = String(symbol || '').toUpperCase().replace(/\.(US|NYSE|NASDAQ)$/i, '')
  if (KNOWN_ETF_SYMBOLS.has(sym)) return true

  const n = String(name || '').toUpperCase()
  if (/\bETF\b/.test(n) || /\bETF\b/.test(sym)) return true
  if (/ETF$/i.test(n.trim())) return true
  if (n.includes(' EXCHANGE TRADED') || n.includes(' EXCHANGE-TRADED')) return true
  if (/\bINDEX FUND\b/.test(n) && /\b(ISHARES|VANGUARD|SPDR|INVESCO)\b/.test(n)) return true
  if (/\b(SPDR|ISHARES|VANGUARD ETF|INVESCO QQQ)\b/.test(n)) return true

  return false
}

export function normalizeUsHolding(stock) {
  const category = stock.category && Object.values(US_CATEGORY).includes(stock.category)
    ? stock.category
    : US_CATEGORY.STOCK
  const isEtf =
    category === US_CATEGORY.STOCK
      ? Boolean(stock.isEtf ?? isUsEtf(stock.symbol, stock.name))
      : false
  return { ...stock, category, isEtf }
}

export function partitionUsHoldings(stocks) {
  const all = (stocks || []).map(normalizeUsHolding)
  const stockBucket = all.filter((s) => s.category === US_CATEGORY.STOCK)
  const espp = all.filter((s) => s.category === US_CATEGORY.ESPP)
  const rsu = all.filter((s) => s.category === US_CATEGORY.RSU)
  const etfs = stockBucket.filter((s) => s.isEtf)
  const stocksOnly = stockBucket.filter((s) => !s.isEtf)

  return {
    all,
    stockBucket,
    stocksOnly,
    etfs,
    espp,
    rsu,
    etfCount: etfs.length,
    stockCount: stocksOnly.length,
  }
}

export function usCategoryLabel(category) {
  switch (category) {
    case US_CATEGORY.ESPP: return 'ESPP'
    case US_CATEGORY.RSU: return 'RSU'
    default: return 'Stock'
  }
}
