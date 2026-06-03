import { useCallback, useMemo, useState } from 'react'
import { formatINR, formatDate } from '../utils/formatters'
import {
  filterByDateRange,
  downloadLedgerCsv,
  txDisplayAmount,
  txTypeLabel,
} from '../utils/holdingLedger'
import {
  logTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactions,
} from '../utils/transactions'

const TX_TYPE_OPTIONS = [
  { value: 'buy', label: 'BUY' },
  { value: 'sell', label: 'SELL' },
  { value: 'dividend', label: 'DIVIDEND' },
  { value: 'bonus', label: 'BONUS' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function toInputDate(iso) {
  if (!iso) return ''
  return `${iso}`.slice(0, 10)
}

function draftFromTx(tx) {
  return {
    id: tx.id,
    type: tx.type || 'buy',
    date: toInputDate(tx.date),
    qty: tx.qty != null ? String(tx.qty) : '',
    price: tx.price != null ? String(tx.price) : '',
    amount: tx.amount != null ? String(tx.amount) : '',
    charges: tx.charges != null ? String(tx.charges) : '0',
    notes: tx.notes || '',
  }
}

function newDraft() {
  return {
    id: `new-${Date.now()}`,
    isNew: true,
    type: 'buy',
    date: todayISO(),
    qty: '',
    price: '',
    amount: '',
    charges: '0',
    notes: '',
  }
}

export default function HoldingTransactionTable({
  stock,
  transactions,
  suggestions = [],
  suggestionsLoading,
  suggestionsError,
  onRefresh,
  showToast,
}) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => `${b.date}`.localeCompare(`${a.date}`)),
    [transactions]
  )

  const filtered = useMemo(
    () => filterByDateRange(sorted, fromDate || null, toDate || null),
    [sorted, fromDate, toDate]
  )

  const allSelected =
    filtered.length > 0 && filtered.every((t) => selected.has(t.id))

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map((t) => t.id)))
  }

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startEdit = (tx) => {
    setEditingId(tx.id)
    setDraft(draftFromTx(tx))
  }

  const startAdd = (type = 'buy') => {
    const d = newDraft()
    d.type = type
    setEditingId(d.id)
    setDraft(d)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const saveDraft = useCallback(() => {
    if (!draft || !stock) return
    const payload = {
      assetType: 'indianStock',
      symbol: stock.symbol,
      name: stock.name,
      holdingId: stock.id,
      type: draft.type,
      date: draft.date,
      qty: draft.qty === '' ? null : draft.qty,
      price: draft.price === '' ? null : draft.price,
      amount: draft.amount === '' ? null : draft.amount,
      charges: draft.charges === '' ? 0 : draft.charges,
      notes: draft.notes,
    }

    if (draft.isNew) {
      logTransaction(payload)
      showToast?.(`${txTypeLabel(draft.type)} added`, 'success')
    } else {
      updateTransaction(draft.id, payload)
      showToast?.('Transaction saved', 'success')
    }
    cancelEdit()
    onRefresh?.()
  }, [draft, stock, onRefresh, showToast])

  const handleDelete = (id) => {
    deleteTransaction(id)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    onRefresh?.()
    showToast?.('Transaction removed', 'info')
  }

  const handleBulkDelete = () => {
    if (!selected.size) return
    const n = selected.size
    deleteTransactions([...selected])
    setSelected(new Set())
    onRefresh?.()
    showToast?.(`${n} transaction(s) removed`, 'info')
  }

  const handleDownload = () => {
    const slug = stock.symbol.replace(/\.(NS|BO)$/i, '')
    downloadLedgerCsv(filtered, `${slug}-transactions.csv`)
    showToast?.('Download started', 'success')
  }

  const addSuggestion = (s) => {
    if (!s.eligible || s.amount == null) {
      showToast?.('Not eligible — no holding on record date', 'info')
      return
    }
    logTransaction({
      assetType: 'indianStock',
      symbol: stock.symbol,
      name: stock.name,
      holdingId: stock.id,
      type: 'dividend',
      date: s.date,
      price: s.price,
      amount: s.amount,
      charges: 0,
      notes: s.notes,
    })
    onRefresh?.()
    showToast?.('Dividend added to ledger', 'success')
  }

  const renderRow = (tx, isDraftRow) => {
    const d = isDraftRow ? draft : draftFromTx(tx)
    const id = isDraftRow ? draft.id : tx.id
    const isEditing = editingId === id

    if (isEditing && d) {
      return (
        <tr key={id} className="ledger-row ledger-row--edit">
          <td>
            <input
              type="checkbox"
              disabled
              aria-label="Select row"
            />
          </td>
          <td>
            <input
              type="date"
              className="ledger-input"
              value={d.date}
              onChange={(e) => setDraft((x) => ({ ...x, date: e.target.value }))}
            />
          </td>
          <td>
            <select
              className="ledger-input"
              value={d.type}
              onChange={(e) => setDraft((x) => ({ ...x, type: e.target.value }))}
            >
              {TX_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </td>
          <td>
            <input
              type="number"
              className="ledger-input ledger-input--num"
              placeholder="—"
              value={d.qty}
              disabled={d.type === 'dividend'}
              onChange={(e) => setDraft((x) => ({ ...x, qty: e.target.value }))}
            />
          </td>
          <td>
            <input
              type="number"
              className="ledger-input ledger-input--num"
              placeholder="—"
              value={d.price}
              disabled={d.type === 'bonus'}
              onChange={(e) => setDraft((x) => ({ ...x, price: e.target.value }))}
            />
          </td>
          <td>
            <input
              type="number"
              className="ledger-input ledger-input--num"
              placeholder="—"
              value={d.amount}
              onChange={(e) => setDraft((x) => ({ ...x, amount: e.target.value }))}
            />
          </td>
          <td>
            <input
              type="number"
              className="ledger-input ledger-input--num"
              value={d.charges}
              onChange={(e) => setDraft((x) => ({ ...x, charges: e.target.value }))}
            />
          </td>
          <td>
            <input
              type="text"
              className="ledger-input"
              value={d.notes}
              onChange={(e) => setDraft((x) => ({ ...x, notes: e.target.value }))}
            />
          </td>
          <td className="ledger-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveDraft}>
              Save
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
              Cancel
            </button>
          </td>
        </tr>
      )
    }

    const amt = txDisplayAmount(tx)
    return (
      <tr key={tx.id} className="ledger-row">
        <td>
          <input
            type="checkbox"
            checked={selected.has(tx.id)}
            onChange={() => toggleOne(tx.id)}
            aria-label={`Select ${txTypeLabel(tx.type)} on ${tx.date}`}
          />
        </td>
        <td>{formatDate(tx.date)}</td>
        <td>
          <span className={`ledger-type ledger-type--${tx.type}`}>{txTypeLabel(tx.type)}</span>
        </td>
        <td className="right mono">{tx.qty != null ? tx.qty.toLocaleString('en-IN') : '—'}</td>
        <td className="right mono">{tx.price != null ? formatINR(tx.price) : '—'}</td>
        <td className="right mono">{amt != null ? formatINR(amt) : '—'}</td>
        <td className="right mono">
          {tx.charges != null && tx.charges !== 0 ? formatINR(tx.charges) : '—'}
        </td>
        <td className="ledger-notes" title={tx.notes}>{tx.notes || '—'}</td>
        <td className="ledger-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(tx)}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => handleDelete(tx.id)}
          >
            Del
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div className="ledger-panel">
      <div className="ledger-toolbar">
        <div className="ledger-dates">
          <label>
            <span className="ledger-label">From</span>
            <input
              type="date"
              className="ledger-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label>
            <span className="ledger-label">To</span>
            <input
              type="date"
              className="ledger-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>
        <div className="ledger-toolbar-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownload}>
            Download CSV
          </button>
          <div className="ledger-add-group">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => startAdd('buy')}>
              + Add
            </button>
          </div>
          {selected.size > 0 && (
            <button type="button" className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
              Delete ({selected.size})
            </button>
          )}
        </div>
      </div>

      <div className="ledger-table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th>Date</th>
              <th>Type</th>
              <th className="right">Quantity</th>
              <th className="right">Unit Price</th>
              <th className="right">Amount (Rs.)</th>
              <th className="right">Charges (Rs.)</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {editingId && draft?.isNew && renderRow(null, true)}
            {filtered.length === 0 && !(editingId && draft?.isNew) ? (
              <tr>
                <td colSpan={9} className="ledger-empty">
                  No transactions in this range. Add a BUY or import from your broker later.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                if (editingId === tx.id && draft && !draft.isNew) {
                  return renderRow(tx, true)
                }
                if (editingId === tx.id) return null
                return renderRow(tx, false)
              })
            )}
          </tbody>
        </table>
      </div>

      {(suggestionsLoading || suggestions.length > 0 || suggestionsError) && (
        <div className="ledger-suggestions">
          <h4 className="ledger-suggestions-title">Suggested from company data</h4>
          {suggestionsLoading && <p className="ledger-suggestions-hint">Loading…</p>}
          {suggestionsError && (
            <p className="ledger-suggestions-hint">{suggestionsError}</p>
          )}
          {!suggestionsLoading && suggestions.length === 0 && !suggestionsError && (
            <p className="ledger-suggestions-hint">No recent dividends found.</p>
          )}
          <ul className="ledger-suggestions-list">
            {suggestions.map((s) => (
              <li key={s.id} className={!s.eligible ? 'ledger-suggestion--ineligible' : ''}>
                <span>
                  {formatDate(s.date)} — DIVIDEND{' '}
                  {s.amount != null ? formatINR(s.amount) : '—'}
                  {!s.eligible && ' (not eligible — no holding on date)'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!s.eligible || s.amount == null}
                  onClick={() => addSuggestion(s)}
                >
                  Add to ledger
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
