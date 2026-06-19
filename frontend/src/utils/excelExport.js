import * as XLSX from 'xlsx'
import { storage } from './storage'

/**
 * Export entire portfolio to a multi-sheet .xlsx workbook with live formulas.
 */
export function exportPortfolioToExcel() {
  const indianStocks = storage.getIndianStocks()
  const usStocks = storage.getUSStocks()
  const mutualFunds = storage.getMutualFunds()
  const otherAssets = storage.getOtherAssets()
  const insurance = storage.getInsurance()
  const transactions = storage.getTransactions()
  const settings = storage.getSettings()
  const usdInr = settings.lastUsdInr || 85

  const wb = XLSX.utils.book_new()

  // --- Sheet 1: Summary ---
  buildSummarySheet(wb, indianStocks, usStocks, mutualFunds, otherAssets, usdInr)

  // --- Sheet 2: Indian Stocks ---
  buildIndianStocksSheet(wb, indianStocks)

  // --- Sheet 3: US Stocks ---
  buildUSStocksSheet(wb, usStocks, usdInr)

  // --- Sheet 4: Mutual Funds ---
  buildMutualFundsSheet(wb, mutualFunds)

  // --- Sheet 5: Other Assets ---
  buildOtherAssetsSheet(wb, otherAssets)

  // --- Sheet 6: Insurance ---
  buildInsuranceSheet(wb, insurance)

  // --- Sheet 7: Dividends ---
  buildDividendsSheet(wb, transactions)

  // --- Sheet 8: Transactions ---
  buildTransactionsSheet(wb, transactions)

  // Generate filename
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `NiveshPath-Portfolio-${date}.xlsx`)
}

// ─── Helpers ───────────────────────────────────────────────

function colWidth(arr, key, minW = 10) {
  const max = arr.reduce((m, r) => Math.max(m, String(r[key] ?? '').length), key.length)
  return Math.max(max + 2, minW)
}

function autoWidths(ws, headers) {
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 12) }))
}

// ─── Sheet Builders ────────────────────────────────────────

function buildSummarySheet(wb, indian, us, mf, other, usdInr) {
  const headers = ['Category', 'Holdings', 'Invested (₹)', 'Current (₹)', 'P&L (₹)', 'P&L %']

  const inInv = indian.reduce((s, h) => s + h.qty * h.buyPrice, 0)
  const inCur = indian.reduce((s, h) => s + (h.currentPrice != null ? h.qty * h.currentPrice : h.qty * h.buyPrice), 0)

  const usInvUSD = us.reduce((s, h) => s + h.qty * h.buyPrice, 0)
  const usCurUSD = us.reduce((s, h) => s + (h.currentPrice != null ? h.qty * h.currentPrice : h.qty * h.buyPrice), 0)
  const usInvINR = usInvUSD * usdInr
  const usCurINR = usCurUSD * usdInr

  const mfInv = mf.reduce((s, f) => s + f.units * f.buyNAV, 0)
  const mfCur = mf.reduce((s, f) => s + (f.currentNAV != null ? f.units * f.currentNAV : f.units * f.buyNAV), 0)

  const otInv = other.reduce((s, a) => s + (a.investedAmount || 0), 0)
  const otCur = other.reduce((s, a) => s + (a.currentValue != null ? a.currentValue : a.investedAmount || 0), 0)

  const data = [
    headers,
    ['Indian Stocks', indian.length, inInv, inCur, { t: 'n', f: 'D2-C2' }, { t: 'n', f: 'IF(C2=0,0,E2/C2*100)' }],
    ['US Stocks', us.length, usInvINR, usCurINR, { t: 'n', f: 'D3-C3' }, { t: 'n', f: 'IF(C3=0,0,E3/C3*100)' }],
    ['Mutual Funds', mf.length, mfInv, mfCur, { t: 'n', f: 'D4-C4' }, { t: 'n', f: 'IF(C4=0,0,E4/C4*100)' }],
    ['Other Assets', other.length, otInv, otCur, { t: 'n', f: 'D5-C5' }, { t: 'n', f: 'IF(C5=0,0,E5/C5*100)' }],
    [],
    ['TOTAL', indian.length + us.length + mf.length + other.length,
      { t: 'n', f: 'SUM(C2:C5)' }, { t: 'n', f: 'SUM(D2:D5)' },
      { t: 'n', f: 'SUM(E2:E5)' }, { t: 'n', f: 'IF(C7=0,0,E7/C7*100)' }],
    [],
    ['USD/INR Rate', usdInr],
    ['Export Date', new Date().toISOString().slice(0, 10)],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  autoWidths(ws, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Summary')
}

function buildIndianStocksSheet(wb, stocks) {
  const headers = ['Symbol', 'Name', 'Qty', 'Buy Price', 'Current Price', 'Invested', 'Current Value', 'P&L', 'P&L %', 'Day Change %', 'Buy Date']
  const rows = [headers]

  stocks.forEach((s, i) => {
    const r = i + 2
    rows.push([
      s.symbol,
      s.name || s.symbol,
      s.qty,
      s.buyPrice,
      s.currentPrice ?? '',
      { t: 'n', f: `C${r}*D${r}` },           // Invested
      { t: 'n', f: `IF(E${r}="","",C${r}*E${r})` }, // Current
      { t: 'n', f: `IF(G${r}="","",G${r}-F${r})` }, // P&L
      { t: 'n', f: `IF(F${r}=0,"",H${r}/F${r}*100)` }, // P&L %
      s.dayChangePct ?? '',
      s.buyDate || '',
    ])
  })

  // Totals row
  const tr = stocks.length + 2
  rows.push([
    'TOTAL', '', '', '', '',
    { t: 'n', f: `SUM(F2:F${tr - 1})` },
    { t: 'n', f: `SUM(G2:G${tr - 1})` },
    { t: 'n', f: `SUM(H2:H${tr - 1})` },
    { t: 'n', f: `IF(F${tr}=0,"",H${tr}/F${tr}*100)` },
    '', '',
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Indian Stocks')
}

function buildUSStocksSheet(wb, stocks, usdInr) {
  const headers = ['Symbol', 'Name', 'Qty', 'Buy Price (USD)', 'Current Price (USD)', 'Invested USD', 'Current USD', 'P&L USD', 'P&L %', 'USD/INR', 'Invested INR', 'Current INR', 'Buy Date']
  const rows = [headers]

  stocks.forEach((s, i) => {
    const r = i + 2
    rows.push([
      s.symbol,
      s.name || s.symbol,
      s.qty,
      s.buyPrice,
      s.currentPrice ?? '',
      { t: 'n', f: `C${r}*D${r}` },                     // Invested USD
      { t: 'n', f: `IF(E${r}="","",C${r}*E${r})` },     // Current USD
      { t: 'n', f: `IF(G${r}="","",G${r}-F${r})` },     // P&L USD
      { t: 'n', f: `IF(F${r}=0,"",H${r}/F${r}*100)` },  // P&L %
      usdInr,
      { t: 'n', f: `F${r}*J${r}` },                     // Invested INR
      { t: 'n', f: `IF(G${r}="","",G${r}*J${r})` },     // Current INR
      s.buyDate || '',
    ])
  })

  const tr = stocks.length + 2
  rows.push([
    'TOTAL', '', '', '', '',
    { t: 'n', f: `SUM(F2:F${tr - 1})` },
    { t: 'n', f: `SUM(G2:G${tr - 1})` },
    { t: 'n', f: `SUM(H2:H${tr - 1})` },
    { t: 'n', f: `IF(F${tr}=0,"",H${tr}/F${tr}*100)` },
    usdInr,
    { t: 'n', f: `SUM(K2:K${tr - 1})` },
    { t: 'n', f: `SUM(L2:L${tr - 1})` },
    '',
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'US Stocks')
}

function buildMutualFundsSheet(wb, funds) {
  const headers = ['Scheme Name', 'Scheme Code', 'Units', 'Buy NAV', 'Current NAV', 'Invested', 'Current Value', 'P&L', 'P&L %', 'Buy Date']
  const rows = [headers]

  funds.forEach((f, i) => {
    const r = i + 2
    rows.push([
      f.schemeName || f.schemeCode,
      f.schemeCode,
      f.units,
      f.buyNAV,
      f.currentNAV ?? '',
      { t: 'n', f: `C${r}*D${r}` },                     // Invested
      { t: 'n', f: `IF(E${r}="","",C${r}*E${r})` },     // Current
      { t: 'n', f: `IF(G${r}="","",G${r}-F${r})` },     // P&L
      { t: 'n', f: `IF(F${r}=0,"",H${r}/F${r}*100)` },  // P&L %
      f.buyDate || '',
    ])
  })

  const tr = funds.length + 2
  rows.push([
    'TOTAL', '', '', '', '',
    { t: 'n', f: `SUM(F2:F${tr - 1})` },
    { t: 'n', f: `SUM(G2:G${tr - 1})` },
    { t: 'n', f: `SUM(H2:H${tr - 1})` },
    { t: 'n', f: `IF(F${tr}=0,"",H${tr}/F${tr}*100)` },
    '',
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Mutual Funds')
}

function buildOtherAssetsSheet(wb, assets) {
  const headers = ['Name', 'Type', 'Invested', 'Current Value', 'P&L', 'P&L %', 'Interest Rate', 'Maturity Date', 'Added Date', 'Notes']
  const rows = [headers]

  assets.forEach((a, i) => {
    const r = i + 2
    rows.push([
      a.name,
      a.type || '',
      a.investedAmount || 0,
      a.currentValue ?? '',
      { t: 'n', f: `IF(D${r}="","",D${r}-C${r})` },     // P&L
      { t: 'n', f: `IF(C${r}=0,"",E${r}/C${r}*100)` },  // P&L %
      a.interestRate ?? '',
      a.maturityDate || '',
      a.addedDate || '',
      a.notes || '',
    ])
  })

  const tr = assets.length + 2
  rows.push([
    'TOTAL', '',
    { t: 'n', f: `SUM(C2:C${tr - 1})` },
    { t: 'n', f: `SUM(D2:D${tr - 1})` },
    { t: 'n', f: `SUM(E2:E${tr - 1})` },
    { t: 'n', f: `IF(C${tr}=0,"",E${tr}/C${tr}*100)` },
    '', '', '', '',
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Other Assets')
}

function buildInsuranceSheet(wb, policies) {
  const headers = ['Name', 'Type', 'Premium (₹)', 'Cover Amount (₹)', 'Start Date', 'Renewal Date', 'Notes']
  const rows = [headers]

  for (const p of policies) {
    rows.push([
      p.name || '',
      p.type || '',
      p.premium ?? '',
      p.coverAmount ?? '',
      p.startDate || '',
      p.renewalDate || '',
      p.notes || '',
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Insurance')
}

function buildDividendsSheet(wb, transactions) {
  const dividends = transactions.filter((t) => t.type === 'dividend')
  const headers = ['Date', 'Symbol', 'Name', 'Per Share (₹)', 'Total Amount (₹)', 'Notes']
  const rows = [headers]

  dividends
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .forEach((d) => {
      rows.push([
        d.date || '',
        d.symbol || '',
        d.name || d.symbol || '',
        d.price ?? '',
        d.amount ?? '',
        d.notes || '',
      ])
    })

  // Total
  const tr = dividends.length + 2
  if (dividends.length > 0) {
    rows.push([
      'TOTAL', '', '', '',
      { t: 'n', f: `SUM(E2:E${tr - 1})` },
      '',
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Dividends')
}

function buildTransactionsSheet(wb, transactions) {
  const headers = ['Date', 'Type', 'Asset Type', 'Symbol', 'Name', 'Qty', 'Price', 'Amount', 'Charges', 'Notes']
  const rows = [headers]

  const sorted = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  for (const tx of sorted) {
    rows.push([
      tx.date || '',
      tx.type || '',
      tx.assetType || '',
      tx.symbol || '',
      tx.name || '',
      tx.qty ?? '',
      tx.price ?? '',
      tx.amount ?? '',
      tx.charges ?? '',
      tx.notes || '',
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidths(ws, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
}
