import { useMemo, useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { storage } from '../utils/storage'
import { formatINR, formatDate } from '../utils/formatters'

const ASSET_TYPES = [
  { value: '', label: 'All asset types' },
  { value: 'indianStock', label: 'Indian Stocks' },
  { value: 'usStock', label: 'US Stocks' },
  { value: 'mutualFund', label: 'Mutual Funds' },
]

const TX_TYPES = [
  { value: '', label: 'All types' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'dividend', label: 'Dividend' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'split', label: 'Split' },
]

function txTypeLabel(type) {
  const m = { buy: 'BUY', sell: 'SELL', dividend: 'DIV', bonus: 'BONUS', split: 'SPLIT' }
  return m[type] || String(type).toUpperCase()
}

function assetTypeLabel(type) {
  const m = { indianStock: 'IN', usStock: 'US', mutualFund: 'MF' }
  return m[type] || type
}

function txTypeCls(type) {
  if (type === 'buy') return 'tx-type-buy'
  if (type === 'sell') return 'tx-type-sell'
  if (type === 'dividend') return 'tx-type-div'
  return 'tx-type-other'
}

function last5DaysFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 5)
  return d.toISOString().slice(0, 10)
}

function downloadCsv(rows) {
  const headers = ['Date', 'Type', 'Asset', 'Symbol', 'Name', 'Qty', 'Price', 'Amount', 'Charges', 'Notes']
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.date,
        r.type,
        r.assetType,
        r.symbol,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        r.qty ?? '',
        r.price ?? '',
        r.amount ?? '',
        r.charges ?? '',
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TransactionsModal({ open, onClose, defaultAssetType = '' }) {
  const modalRef = useRef(null)
  const [assetFilter, setAssetFilter] = useState(defaultAssetType)
  const [typeFilter, setTypeFilter] = useState('')
  const [symbolSearch, setSymbolSearch] = useState('')
  const [fromDate, setFromDate] = useState(last5DaysFrom)
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  // Re-apply defaultAssetType when the modal is opened with a different filter
  const prevDefault = useRef(defaultAssetType)
  if (open && defaultAssetType !== prevDefault.current) {
    prevDefault.current = defaultAssetType
  }

  useFocusTrap(modalRef, open, onClose)

  const allTxs = useMemo(() => {
    if (!open) return []
    return storage
      .getTransactions()
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [open])

  const filtered = useMemo(() => {
    let rows = allTxs
    if (assetFilter) rows = rows.filter((r) => r.assetType === assetFilter)
    if (typeFilter) rows = rows.filter((r) => r.type === typeFilter)
    if (symbolSearch.trim()) {
      const q = symbolSearch.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          String(r.symbol || '').toLowerCase().includes(q) ||
          String(r.name || '').toLowerCase().includes(q)
      )
    }
    if (fromDate) rows = rows.filter((r) => String(r.date) >= fromDate)
    if (toDate) rows = rows.filter((r) => String(r.date) <= toDate)
    return rows
  }, [allTxs, assetFilter, typeFilter, symbolSearch, fromDate, toDate])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value)
    setPage(0)
  }

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-history-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal--wide modal--tall" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="tx-history-title">
            {defaultAssetType === 'indianStock' ? 'Indian Stock Transactions'
              : defaultAssetType === 'usStock' ? 'US Stock Transactions'
              : defaultAssetType === 'mutualFund' ? 'Mutual Fund Transactions'
              : 'Transaction History'}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="tx-filters">
            <input
              type="text"
              className="form-input tx-search"
              placeholder="Search symbol or name…"
              value={symbolSearch}
              onChange={handleFilterChange(setSymbolSearch)}
              aria-label="Search transactions"
            />
            <select
              className="form-select"
              value={assetFilter}
              onChange={handleFilterChange(setAssetFilter)}
              aria-label="Filter by asset type"
            >
              {ASSET_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={typeFilter}
              onChange={handleFilterChange(setTypeFilter)}
              aria-label="Filter by transaction type"
            >
              {TX_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={handleFilterChange(setFromDate)}
              aria-label="From date"
              title="From date"
            />
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={handleFilterChange(setToDate)}
              aria-label="To date"
              title="To date"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setAssetFilter(defaultAssetType)
                setTypeFilter('')
                setSymbolSearch('')
                setFromDate(last5DaysFrom())
                setToDate('')
                setPage(0)
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setFromDate(''); setToDate(''); setPage(0) }}
              title="Remove date filter — show all transactions"
            >
              All time
            </button>
          </div>

          <p className="tx-count">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== allTxs.length ? ` of ${allTxs.length} total` : ''}
            {fromDate && !toDate ? ` · showing from ${formatDate(fromDate)} (default: last 5 days — click All time to see everything)` : ''}
          </p>

          {filtered.length === 0 ? (
            <p className="tx-empty">
              No transactions in this date range.{' '}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFromDate(''); setToDate(''); setPage(0) }}>Show all time</button>
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table tx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Asset</th>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th className="num">Qty</th>
                    <th className="num">Price</th>
                    <th className="num">Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(String(r.date || '').slice(0, 10))}</td>
                      <td>
                        <span className={`tx-badge ${txTypeCls(r.type)}`}>
                          {txTypeLabel(r.type)}
                        </span>
                      </td>
                      <td><span className="asset-badge">{assetTypeLabel(r.assetType)}</span></td>
                      <td className="mono">{r.symbol}</td>
                      <td className="tx-name">{r.name}</td>
                      <td className="num">{r.qty != null ? r.qty : '—'}</td>
                      <td className="num">{r.price != null ? formatINR(r.price) : '—'}</td>
                      <td className="num">
                        {r.amount != null
                          ? formatINR(r.amount)
                          : r.qty != null && r.price != null
                          ? formatINR(r.qty * r.price)
                          : '—'}
                      </td>
                      <td className="tx-notes">{r.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="tx-pagination">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={filtered.length === 0}
            onClick={() => downloadCsv(filtered)}
          >
            Export CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
