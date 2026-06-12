/** Map Indian holding symbols between NSE (.NS) and BSE (.BO). */

export function indianBaseSymbol(symbol) {
  return String(symbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '')
}

export function indianSymbolForExchange(symbol, exchange = 'NSE') {
  const base = indianBaseSymbol(symbol)
  if (!base) return symbol
  return exchange === 'BSE' ? `${base}.BO` : `${base}.NS`
}

export function holdingExchange(symbol) {
  return String(symbol || '').toUpperCase().endsWith('.BO') ? 'BSE' : 'NSE'
}
