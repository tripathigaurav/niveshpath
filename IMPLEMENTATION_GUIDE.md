# Implementation Guide: Critical Broker Standards

> **Quick-start guide for implementing the top 5 critical features to bring Portfolio Tracker to production-ready, broker-standard quality.**

---

## 🎯 Priority Queue (Implement in Order)

### ✅ Already Excellent
- Modal-based holding details (all categories)
- Transaction ledger with CSV export
- XIRR calculations
- Responsive design
- Dividend suggestions

### 🔴 Critical Gaps (Do First - 2-3 weeks)

1. **Portfolio Validation & Health Check**
2. **Tax Calculator (STCG/LTCG)**
3. **Price Reliability (Fallback System)**
4. **CSV Import (Zerodha/Groww)**
5. **Corporate Actions Auto-Apply**

---

## 1️⃣ Portfolio Validation (Days 1-3)

### Implementation Steps

#### Step 1: Create Audit Trail (Day 1)

```bash
# Create new files
touch frontend/src/utils/auditTrail.js
touch frontend/src/utils/portfolioValidator.js
touch frontend/src/components/PortfolioHealthWidget.jsx
```

**File:** `frontend/src/utils/auditTrail.js`

```javascript
import { v4 as uuidv4 } from 'uuid'
import { openDB } from 'idb'

const DB_NAME = 'portfolioAudit'
const STORE_NAME = 'auditLog'

async function getAuditDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
        store.createIndex('entityType', 'entityType')
      }
    },
  })
}

export async function logAudit(action, entityType, entityId, before, after) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action, // 'create', 'update', 'delete', 'import'
    entityType, // 'transaction', 'holding', 'settings'
    entityId,
    before,
    after,
  }
  
  const db = await getAuditDB()
  await db.add(STORE_NAME, entry)
  
  return entry
}

export async function getAuditHistory(filters = {}) {
  const db = await getAuditDB()
  let entries = await db.getAll(STORE_NAME)
  
  if (filters.entityType) {
    entries = entries.filter(e => e.entityType === filters.entityType)
  }
  if (filters.entityId) {
    entries = entries.filter(e => e.entityId === filters.entityId)
  }
  if (filters.since) {
    entries = entries.filter(e => e.timestamp >= filters.since)
  }
  
  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function clearAuditLog() {
  const db = await getAuditDB()
  await db.clear(STORE_NAME)
}
```

#### Step 2: Portfolio Validator (Day 2)

**File:** `frontend/src/utils/portfolioValidator.js`

```javascript
import { storage } from './storage'

export function validatePortfolioIntegrity() {
  const transactions = storage.getTransactions()
  const indianStocks = storage.getIndianStocks()
  const usStocks = storage.getUSStocks()
  const mutualFunds = storage.getMutualFunds()
  
  const issues = []
  
  // 1. Quantity mismatches
  const checkQuantity = (holdings, assetType, symbolKey, qtyKey) => {
    for (const holding of holdings) {
      const symbol = holding[symbolKey]
      const holdingQty = holding[qtyKey] || 0
      
      const txQty = transactions
        .filter(t => t.assetType === assetType && t.symbol === symbol)
        .reduce((sum, t) => {
          if (t.type === 'buy' || t.type === 'bonus') return sum + (t.qty || 0)
          if (t.type === 'sell') return sum - (t.qty || 0)
          return sum
        }, 0)
      
      const diff = Math.abs(holdingQty - txQty)
      if (diff > 0.01) {
        issues.push({
          severity: 'error',
          type: 'quantity_mismatch',
          symbol,
          category: assetType,
          expected: txQty,
          actual: holdingQty,
          diff,
          fix: () => {
            // Auto-fix: Update holding quantity to match transactions
            const updated = holdings.map(h => 
              h[symbolKey] === symbol ? { ...h, [qtyKey]: txQty } : h
            )
            if (assetType === 'indianStock') storage.setIndianStocks(updated)
            if (assetType === 'usStock') storage.setUSStocks(updated)
            if (assetType === 'mutualFund') storage.setMutualFunds(updated)
          },
        })
      }
    }
  }
  
  checkQuantity(indianStocks, 'indianStock', 'symbol', 'qty')
  checkQuantity(usStocks, 'usStock', 'symbol', 'qty')
  checkQuantity(mutualFunds, 'mutualFund', 'schemeCode', 'units')
  
  // 2. Orphaned transactions
  const allHoldingIds = new Set([
    ...indianStocks.map(h => h.id),
    ...usStocks.map(h => h.id),
    ...mutualFunds.map(h => h.id),
  ])
  
  for (const tx of transactions) {
    if (tx.holdingId && !allHoldingIds.has(tx.holdingId)) {
      issues.push({
        severity: 'warning',
        type: 'orphaned_transaction',
        transactionId: tx.id,
        symbol: tx.symbol,
        holdingId: tx.holdingId,
        fix: () => {
          // Auto-fix: Remove holdingId reference
          const updated = transactions.map(t => 
            t.id === tx.id ? { ...t, holdingId: null } : t
          )
          storage.setTransactions(updated)
        },
      })
    }
  }
  
  // 3. Negative quantities (selling more than owned)
  const qtyBySymbol = {}
  const sortedTx = transactions.sort((a, b) => a.date.localeCompare(b.date))
  
  for (const tx of sortedTx) {
    const key = `${tx.assetType}:${tx.symbol}`
    if (!qtyBySymbol[key]) qtyBySymbol[key] = 0
    
    if (tx.type === 'buy' || tx.type === 'bonus') {
      qtyBySymbol[key] += tx.qty || 0
    } else if (tx.type === 'sell') {
      qtyBySymbol[key] -= tx.qty || 0
    }
    
    if (qtyBySymbol[key] < -0.01) {
      issues.push({
        severity: 'error',
        type: 'negative_quantity',
        symbol: tx.symbol,
        date: tx.date,
        quantity: qtyBySymbol[key],
        transactionId: tx.id,
      })
    }
  }
  
  // 4. Missing buy dates (XIRR requires dates)
  const checkDates = (holdings, symbolKey) => {
    for (const holding of holdings) {
      if (!holding.buyDate) {
        issues.push({
          severity: 'warning',
          type: 'missing_buy_date',
          symbol: holding[symbolKey],
          holdingId: holding.id,
        })
      }
    }
  }
  
  checkDates(indianStocks, 'symbol')
  checkDates(usStocks, 'symbol')
  checkDates(mutualFunds, 'schemeCode')
  
  return {
    healthy: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    summary: {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
    },
  }
}

export function autoFixIssues(issues) {
  let fixed = 0
  
  for (const issue of issues) {
    if (issue.fix) {
      try {
        issue.fix()
        fixed++
      } catch (err) {
        console.error('Auto-fix failed for issue:', issue, err)
      }
    }
  }
  
  return fixed
}
```

#### Step 3: Health Widget UI (Day 3)

**File:** `frontend/src/components/PortfolioHealthWidget.jsx`

```javascript
import { useState, useEffect } from 'react'
import { validatePortfolioIntegrity, autoFixIssues } from '../utils/portfolioValidator'

export default function PortfolioHealthWidget({ showToast }) {
  const [validation, setValidation] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  
  useEffect(() => {
    const result = validatePortfolioIntegrity()
    setValidation(result)
  }, [])
  
  if (!validation) return null
  
  const handleAutoFix = () => {
    const fixable = validation.issues.filter(i => i.fix)
    if (fixable.length === 0) {
      showToast('No auto-fixable issues', 'info')
      return
    }
    
    const fixed = autoFixIssues(fixable)
    showToast(`Fixed ${fixed} issue(s)`, 'success')
    
    // Re-validate
    setValidation(validatePortfolioIntegrity())
  }
  
  if (validation.healthy) {
    return (
      <div className="portfolio-health portfolio-health--ok">
        <span className="health-icon">✓</span>
        <div>
          <div className="health-title">Portfolio Health</div>
          <div className="health-subtitle">All systems operational</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="portfolio-health portfolio-health--issues">
      <span className="health-icon">⚠</span>
      <div className="health-content">
        <div className="health-title">
          {validation.summary.errors} Error(s), {validation.summary.warnings} Warning(s)
        </div>
        <div className="health-subtitle">Portfolio needs attention</div>
      </div>
      <div className="health-actions">
        <button className="btn btn-sm btn-secondary" onClick={() => setShowDetails(true)}>
          View Details
        </button>
        {validation.issues.some(i => i.fix) && (
          <button className="btn btn-sm btn-primary" onClick={handleAutoFix}>
            Auto-Fix
          </button>
        )}
      </div>
      
      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Portfolio Validation Issues</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              {validation.issues.map((issue, i) => (
                <div key={i} className={`issue-card issue-card--${issue.severity}`}>
                  <div className="issue-type">{issue.type.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className="issue-details">
                    <div><strong>Symbol:</strong> {issue.symbol}</div>
                    {issue.expected && <div><strong>Expected:</strong> {issue.expected}</div>}
                    {issue.actual && <div><strong>Actual:</strong> {issue.actual}</div>}
                  </div>
                  {issue.fix && (
                    <button className="btn btn-sm btn-primary" onClick={() => {
                      issue.fix()
                      setValidation(validatePortfolioIntegrity())
                      showToast('Issue fixed', 'success')
                    }}>
                      Fix Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Add to Dashboard.jsx:**

```javascript
import PortfolioHealthWidget from './PortfolioHealthWidget'

// Inside Dashboard component, after allocation donut:
<PortfolioHealthWidget showToast={showToast} />
```

**Add CSS to App.css:**

```css
/* Portfolio Health Widget */
.portfolio-health {
  background: var(--surface-1);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.portfolio-health--ok {
  border: 2px solid var(--green);
}

.portfolio-health--issues {
  border: 2px solid var(--orange, #f59e0b);
  flex-wrap: wrap;
}

.health-icon {
  font-size: 32px;
  line-height: 1;
}

.portfolio-health--ok .health-icon {
  color: var(--green);
}

.portfolio-health--issues .health-icon {
  color: var(--orange, #f59e0b);
}

.health-content {
  flex: 1;
}

.health-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
}

.health-subtitle {
  font-size: 13px;
  color: var(--text-3);
}

.health-actions {
  display: flex;
  gap: 8px;
}

.issue-card {
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 12px;
  border-left: 4px solid;
}

.issue-card--error {
  border-left-color: var(--red);
}

.issue-card--warning {
  border-left-color: var(--orange, #f59e0b);
}

.issue-type {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 8px;
}

.issue-details {
  font-size: 13px;
  margin-bottom: 8px;
}

.issue-details > div {
  margin-bottom: 4px;
}
```

---

## 2️⃣ Tax Calculator (Days 4-7)

### Quick Start

```bash
touch frontend/src/utils/taxCalculator.js
touch frontend/src/components/TaxSummaryCard.jsx
```

**File:** `frontend/src/utils/taxCalculator.js`

```javascript
import { storage } from './storage'

// Tax rules as of FY 2024-25
const TAX_RULES = {
  equity: {
    ltcgThresholdDays: 365,
    ltcgRate: 0.10, // 10%
    ltcgExemption: 100000, // ₹1 lakh
    stcgRate: 0.15, // 15%
    sttRate: 0.00025, // 0.025% on sell
  },
  grandfatheringDate: '2018-01-31',
}

function getFY(dateStr) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return month >= 4 ? `FY${year}-${year + 1}` : `FY${year - 1}-${year}`
}

function getCurrentFY() {
  return getFY(new Date().toISOString())
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
}

function getMatchingBuys(transactions, sale) {
  // FIFO matching
  return transactions
    .filter(t => t.type === 'buy' && t.symbol === sale.symbol && t.date <= sale.date)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function calculateCostBasis(buys, qty) {
  let remaining = qty
  let cost = 0
  
  for (const buy of buys) {
    if (remaining <= 0) break
    
    const takeQty = Math.min(remaining, buy.qty)
    cost += takeQty * buy.price
    remaining -= takeQty
  }
  
  return cost
}

export function calculateTaxLiability(fy = getCurrentFY()) {
  const transactions = storage.getTransactions().filter(t => t.assetType === 'indianStock')
  const sales = transactions.filter(t => t.type === 'sell' && getFY(t.date) === fy)
  
  const taxEvents = []
  
  for (const sale of sales) {
    const buys = getMatchingBuys(transactions, sale)
    if (buys.length === 0) continue
    
    const oldestBuy = buys[0]
    const holdingPeriod = daysBetween(oldestBuy.date, sale.date)
    const isLongTerm = holdingPeriod >= TAX_RULES.equity.ltcgThresholdDays
    
    const costBasis = calculateCostBasis(buys, sale.qty)
    const saleValue = sale.price * sale.qty
    const stt = saleValue * TAX_RULES.equity.sttRate
    const capitalGain = saleValue - costBasis - stt - (sale.charges || 0)
    
    taxEvents.push({
      symbol: sale.symbol,
      saleDate: sale.date,
      qty: sale.qty,
      saleValue,
      costBasis,
      capitalGain,
      type: isLongTerm ? 'LTCG' : 'STCG',
      holdingPeriod,
      stt,
    })
  }
  
  const ltcg = taxEvents.filter(e => e.type === 'LTCG')
  const stcg = taxEvents.filter(e => e.type === 'STCG')
  
  const ltcgTotal = ltcg.reduce((sum, e) => Math.max(0, e.capitalGain), 0)
  const stcgTotal = stcg.reduce((sum, e) => Math.max(0, e.capitalGain), 0)
  
  const ltcgTaxable = Math.max(0, ltcgTotal - TAX_RULES.equity.ltcgExemption)
  const ltcgTax = ltcgTaxable * TAX_RULES.equity.ltcgRate
  const stcgTax = stcgTotal * TAX_RULES.equity.stcgRate
  
  return {
    fy,
    ltcg: {
      total: ltcgTotal,
      exemption: TAX_RULES.equity.ltcgExemption,
      taxable: ltcgTaxable,
      tax: ltcgTax,
      events: ltcg,
    },
    stcg: {
      total: stcgTotal,
      taxable: stcgTotal,
      tax: stcgTax,
      events: stcg,
    },
    totalTax: ltcgTax + stcgTax,
    totalSTT: taxEvents.reduce((sum, e) => sum + e.stt, 0),
  }
}
```

**Add to Dashboard as card** (similar to existing cards)

---

## 3️⃣ Price Fallback System (Days 8-10)

Create `frontend/src/utils/priceProvider.js` with fallback logic (see main analysis doc).

---

## 4️⃣ CSV Import (Days 11-15)

Install Papa Parse:

```bash
cd frontend
npm install papaparse
```

Create wizard component (see main analysis doc).

---

## 5️⃣ Corporate Actions (Days 16-21)

Backend endpoint + auto-apply engine (see main analysis doc).

---

## 📊 Testing Checklist

### After Each Feature
- [ ] Run `npm run build` — no errors
- [ ] Test in Chrome DevTools (mobile view)
- [ ] Verify LocalStorage/IndexedDB writes
- [ ] Check error handling (network failure)
- [ ] Test with demo data
- [ ] Verify audit log entries (if applicable)

---

## 🚀 Deployment

```bash
# Build frontend
cd frontend
npm run build

# Test locally
cd ..
./deploy-local.sh

# Open http://localhost:5199 (or the port shown by ./deploy-local.sh)
# Verify all features work
```

---

**Next:** After implementing these 5 critical features, move to Phase 6 (SIP tracker, broker imports) as per FUTURE_PLANS.md.

---

*Quick Start Version: 1.0*  
*Estimated Total Time: 3 weeks (one developer)*
