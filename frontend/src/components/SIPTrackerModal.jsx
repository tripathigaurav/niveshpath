import { useState, useRef, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { storage } from '../utils/storage'
import { formatINR, formatDate } from '../utils/formatters'
import { logAudit } from '../utils/auditTrail'
import { logBuy } from '../utils/transactions'
import { notifyDataChanged } from '../hooks/useNotifications'
import { calcXirr } from '../utils/xirr'
import { formatXirrDisplay } from '../utils/xirrMetrics'

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'quarterly', label: 'Quarterly', days: 91 },
  { value: 'yearly', label: 'Yearly', days: 365 },
]

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function sipStatus(sip) {
  if (!sip.active) return 'inactive'
  const today = todayISO()
  if (sip.nextDate < today) return 'overdue'
  const diff = Math.ceil((new Date(`${sip.nextDate}T12:00:00`) - new Date(`${today}T12:00:00`)) / (1000 * 60 * 60 * 24))
  if (diff <= 7) return 'upcoming'
  return 'scheduled'
}

function emptyDraft() {
  return {
    fundName: '',
    symbol: '',
    amount: '',
    frequency: 'monthly',
    startDate: todayISO(),
    notes: '',
  }
}

function persistSIPs(next) {
  storage.setSIPs(next)
  logAudit('update', 'sip', null, null, { count: next.length })
  notifyDataChanged()
}

/**
 * Compute SIP XIRR and lump-sum XIRR for a given SIP.
 * Uses actual logged transactions if symbol is present, otherwise synthesises.
 */
function computeSipXirr(sip, allTransactions) {
  const today = todayISO()

  // Gather buy cashflows for this SIP
  const flows = []
  if (sip.symbol) {
    // Use real transaction log
    const sipTxs = allTransactions.filter(
      (t) => t.symbol === sip.symbol &&
      t.type === 'buy' &&
      t.assetType === 'mutualFund' &&
      t.date >= sip.startDate
    )
    for (const tx of sipTxs) {
      const amt = tx.amount ?? (tx.qty != null && tx.price != null ? tx.qty * tx.price : null)
      if (amt != null && amt > 0) flows.push({ date: tx.date, amount: -amt })
    }
  }

  // If no real transactions, synthesise from startDate + frequency
  if (!flows.length) {
    const freq = FREQUENCIES.find((f) => f.value === sip.frequency)
    const days = freq?.days ?? 30
    let d = sip.startDate
    while (d <= today) {
      flows.push({ date: d, amount: -sip.amount })
      d = addDays(d, days)
    }
  }

  if (!flows.length) return { sipXirr: null, lumpXirr: null, totalInvested: 0 }

  const totalInvested = flows.reduce((s, f) => s + Math.abs(f.amount), 0)

  // For terminal value: look for current NAV of related MF holding
  let terminalValue = null
  if (sip.symbol) {
    const fund = storage.getMutualFunds().find(
      (f) => f.schemeCode === sip.symbol || f.schemeName?.toLowerCase() === sip.symbol.toLowerCase()
    )
    if (fund?.currentNAV != null && fund?.units != null) {
      terminalValue = fund.currentNAV * fund.units
    }
  }
  // Fall back: assume invested = current (0% gain placeholder)
  if (terminalValue == null) terminalValue = totalInvested

  const sipFlows = [...flows, { date: today, amount: terminalValue }]
  const sipXirr = calcXirr(sipFlows).value

  // Lump-sum: one outflow at start, same terminal value today
  const lumpFlows = [
    { date: sip.startDate, amount: -totalInvested },
    { date: today, amount: terminalValue },
  ]
  const lumpXirr = calcXirr(lumpFlows).value

  return { sipXirr, lumpXirr, totalInvested }
}

export default function SIPTrackerModal({ open, onClose, showToast }) {
  const modalRef = useRef(null)
  const [sips, setSIPs] = useState(() => storage.getSIPs())
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)

  useFocusTrap(modalRef, open, onClose)

  const reload = () => setSIPs(storage.getSIPs())

  // Pre-compute XIRR for all SIPs
  const xirrMap = useMemo(() => {
    const txs = storage.getTransactions()
    const map = {}
    for (const sip of sips) {
      map[sip.id] = computeSipXirr(sip, txs)
    }
    return map
  }, [sips])

  const handleAdd = () => {
    const name = draft.fundName.trim()
    const amount = parseFloat(draft.amount)
    if (!name) { showToast?.('Fund name is required', 'error'); return }
    if (!Number.isFinite(amount) || amount <= 0) { showToast?.('Enter a valid amount', 'error'); return }

    const freq = FREQUENCIES.find((f) => f.value === draft.frequency)
    const nextDate = addDays(draft.startDate, freq?.days ?? 30)

    const entry = {
      id: uuidv4(),
      fundName: name,
      symbol: draft.symbol.trim().toUpperCase() || '',
      amount,
      frequency: draft.frequency,
      startDate: draft.startDate,
      nextDate,
      active: true,
      notes: draft.notes.trim(),
      createdAt: new Date().toISOString(),
    }
    const next = [...sips, entry]
    persistSIPs(next)
    setSIPs(next)
    setDraft(emptyDraft())
    setAdding(false)
    showToast?.(`SIP added: ${name}`, 'success')
  }

  const handleMarkPaid = (sip) => {
    // Advance next date by frequency
    const freq = FREQUENCIES.find((f) => f.value === sip.frequency)
    const newNext = addDays(sip.nextDate, freq?.days ?? 30)
    const next = sips.map((s) => s.id === sip.id ? { ...s, nextDate: newNext } : s)
    persistSIPs(next)
    setSIPs(next)

    // Log a buy transaction if symbol is known
    if (sip.symbol) {
      logBuy({
        assetType: 'mutualFund',
        symbol: sip.symbol,
        name: sip.fundName,
        qty: null,
        price: null,
        amount: sip.amount,
        date: sip.nextDate,
        notes: `SIP installment (${sip.frequency})`,
      })
    }
    showToast?.(`SIP marked as paid — next: ${newNext}`, 'success')
  }

  const handleToggleActive = (id) => {
    const next = sips.map((s) => s.id === id ? { ...s, active: !s.active } : s)
    persistSIPs(next)
    setSIPs(next)
  }

  const handleDelete = (id) => {
    const next = sips.filter((s) => s.id !== id)
    persistSIPs(next)
    setSIPs(next)
  }

  if (!open) return null

  const sortedSIPs = [...sips].sort((a, b) => {
    const order = { overdue: 0, upcoming: 1, scheduled: 2, inactive: 3 }
    return (order[sipStatus(a)] ?? 4) - (order[sipStatus(b)] ?? 4)
  })

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sip-tracker-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal--wide" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="sip-tracker-title">SIP Tracker</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">

          {adding ? (
            <div className="sip-form card">
              <h3 className="sip-form-title">New SIP</h3>
              <div className="sip-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="sip-fund">Fund / Stock name *</label>
                  <input id="sip-fund" className="form-input" type="text" placeholder="e.g. Nifty 50 Index Fund"
                    value={draft.fundName} onChange={(e) => setDraft((d) => ({ ...d, fundName: e.target.value }))} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sip-symbol">Symbol (optional)</label>
                  <input id="sip-symbol" className="form-input" type="text" placeholder="e.g. NIFTYINDX"
                    value={draft.symbol} onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value.toUpperCase() }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sip-amount">Amount (₹) *</label>
                  <input id="sip-amount" className="form-input" type="number" min="1" step="any" placeholder="e.g. 5000"
                    value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sip-freq">Frequency</label>
                  <select id="sip-freq" className="form-select" value={draft.frequency}
                    onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}>
                    {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sip-start">Start date</label>
                  <input id="sip-start" className="form-input" type="date" value={draft.startDate}
                    onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sip-notes">Notes</label>
                  <input id="sip-notes" className="form-input" type="text" placeholder="Optional"
                    value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
                </div>
              </div>
              <div className="sip-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setAdding(false); setDraft(emptyDraft()) }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAdd}>Add SIP</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-sm sip-add-btn" onClick={() => setAdding(true)}>
              + New SIP
            </button>
          )}

          {sortedSIPs.length === 0 && !adding ? (
            <div className="sip-empty">
              <p>No SIPs yet. Set up recurring investment schedules to track them here.</p>
            </div>
          ) : (
            <div className="sip-list">
              {sortedSIPs.map((sip) => {
                const status = sipStatus(sip)
                const xirr = xirrMap[sip.id]
                return (
                  <div key={sip.id} className={`sip-card card sip-card--${status}`}>
                    <div className="sip-card-header">
                      <div className="sip-card-info">
                        <span className="sip-fund-name">{sip.fundName}</span>
                        {sip.symbol && <span className="badge badge-muted">{sip.symbol}</span>}
                        <span className={`badge sip-status-badge sip-status--${status}`}>
                          {status === 'overdue' ? '⚠️ Overdue' :
                           status === 'upcoming' ? '📅 Due soon' :
                           status === 'inactive' ? 'Paused' : 'Scheduled'}
                        </span>
                      </div>
                      <div className="sip-card-actions">
                        {sip.active && (
                          <button type="button" className="btn btn-primary btn-sm"
                            onClick={() => handleMarkPaid(sip)} title="Mark this installment as paid and advance next date">
                            ✓ Paid
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleActive(sip.id)}
                          title={sip.active ? 'Pause SIP' : 'Resume SIP'}>
                          {sip.active ? '⏸' : '▶'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(sip.id)} aria-label={`Delete SIP ${sip.fundName}`}>
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="sip-card-details">
                      <span>{formatINR(sip.amount)} / {sip.frequency}</span>
                      <span>Next: <strong>{formatDate(sip.nextDate)}</strong></span>
                      <span>Started: {formatDate(sip.startDate)}</span>
                      {xirr && xirr.totalInvested > 0 && (
                        <span className="sip-xirr-row">
                          SIP XIRR: <strong className={xirr.sipXirr != null ? (xirr.sipXirr >= 0 ? 'pnl-gain' : 'pnl-loss') : ''}>
                            {formatXirrDisplay(xirr.sipXirr)}
                          </strong>
                          {' '}vs lump sum:{' '}
                          <strong className={xirr.lumpXirr != null ? (xirr.lumpXirr >= 0 ? 'pnl-gain' : 'pnl-loss') : ''}>
                            {formatXirrDisplay(xirr.lumpXirr)}
                          </strong>
                          <span className="sip-xirr-hint"> (invested {formatINR(xirr.totalInvested)})</span>
                        </span>
                      )}
                    </div>
                    {sip.notes && <div className="sip-card-notes">{sip.notes}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
