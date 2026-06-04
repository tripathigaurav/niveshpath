/**
 * CAMS/KARVY CAS statement text parser.
 *
 * When you open a CAMS consolidated account statement (CAS) PDF and copy-paste
 * the text, the structure looks like:
 *
 *   Folio No: 12345678 / HDFC Mutual Fund
 *   Scheme: HDFC Flexi Cap Fund - Growth
 *   Opening Balance: 100.000 Units
 *   01-Jan-2023  P  Purchase           10,000.00    100.000  100.00  200.000
 *   15-Feb-2023  P  Purchase           20,000.00    181.818  110.00  381.818
 *   Closing Balance: 381.818 Units
 *
 * This parser:
 * 1. Extracts scheme names from lines starting with "Scheme:" or matching fund patterns
 * 2. Extracts transactions (date, type P/R, amount, units, NAV) from data rows
 * 3. Returns holdings as {schemeName, units, avgNavCost, latestDate} for MF import
 */

// Matches lines like:  01-Jan-2023  P  Purchase  10,000.00  100.000  110.00  200.000
// Groups: date, txCode, txType, amount, units, nav, balance
const TX_LINE_RE =
  /^(\d{1,2}[-/]\w{3,9}[-/]\d{2,4})\s+([PRTSDprstd])\s+(\w[\w\s]*?)\s{2,}([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)/

// Matches: "Scheme: HDFC Flexi Cap Fund - Growth" or "SchemeName:"
const SCHEME_RE = /^scheme\s*(?:name)?\s*:\s*(.+)/i

// Matches: "Folio No: 12345678 / HDFC Mutual Fund" — we capture the fund house
const FOLIO_RE = /folio\s*no\s*[:\-]\s*[\w/\s,]+/i

// Matches closing balance line to extract final units
const CLOSING_RE = /closing\s+balance\s*[:\-]?\s*([\d,]+(?:\.\d+)?)\s*units?/i

function parseNum(s) {
  return parseFloat(String(s).replace(/,/g, ''))
}

function parseDate(s) {
  // Handles dd-Mon-yyyy or dd/Mon/yyyy or dd-mm-yyyy
  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
  const parts = s.split(/[-/]/)
  if (parts.length !== 3) return s
  const d = parts[0].padStart(2, '0')
  const mRaw = parts[1]
  const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
  const mNum = months[mRaw.toLowerCase().slice(0, 3)]
  if (mNum) return `${y}-${String(mNum).padStart(2, '0')}-${d}`
  // Already numeric
  return `${y}-${mRaw.padStart(2, '0')}-${d}`
}

/**
 * @param {string} text — paste of CAMS/KARVY CAS PDF text
 * @returns {{ holdings: Array<{schemeName, units, avgNavCost, latestDate}>, skipped: number }}
 */
export function parseCamsText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const schemes = []
  let currentScheme = null
  let skipped = 0

  for (const line of lines) {
    const schemeMatch = line.match(SCHEME_RE)
    if (schemeMatch) {
      if (currentScheme) schemes.push(currentScheme)
      currentScheme = {
        schemeName: schemeMatch[1].trim(),
        buys: [],           // { units, nav, date }
        closingUnits: null,
      }
      continue
    }

    if (!currentScheme) continue

    const closingMatch = line.match(CLOSING_RE)
    if (closingMatch) {
      currentScheme.closingUnits = parseNum(closingMatch[1])
      continue
    }

    const txMatch = line.match(TX_LINE_RE)
    if (txMatch) {
      const [, dateRaw, txCode, , amtRaw, unitsRaw, navRaw] = txMatch
      const isPurchase = /^[Pp]/.test(txCode)
      if (isPurchase) {
        const units = parseNum(unitsRaw)
        const nav = parseNum(navRaw)
        const date = parseDate(dateRaw)
        if (units > 0 && nav > 0) {
          currentScheme.buys.push({ units, nav, date })
        }
      }
    }
  }
  if (currentScheme) schemes.push(currentScheme)

  const holdings = []
  for (const s of schemes) {
    if (!s.schemeName) { skipped++; continue }

    // Use closing balance if available; otherwise sum of buys
    const totalUnits =
      s.closingUnits != null
        ? s.closingUnits
        : s.buys.reduce((a, b) => a + b.units, 0)

    if (totalUnits <= 0) { skipped++; continue }

    // Weighted average cost
    const totalCost = s.buys.reduce((a, b) => a + b.units * b.nav, 0)
    const totalBuyUnits = s.buys.reduce((a, b) => a + b.units, 0)
    const avgNavCost = totalBuyUnits > 0 ? totalCost / totalBuyUnits : 0

    const latestDate = s.buys.length
      ? s.buys.reduce((a, b) => (b.date > a ? b.date : a), s.buys[0].date)
      : new Date().toISOString().slice(0, 10)

    holdings.push({
      schemeName: s.schemeName,
      units: parseFloat(totalUnits.toFixed(3)),
      avgNavCost: parseFloat(avgNavCost.toFixed(4)),
      latestDate,
    })
  }

  return { holdings, skipped }
}
