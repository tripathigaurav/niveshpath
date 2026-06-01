import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useMutualFunds } from '../hooks/usePortfolio'
import AddMFModal from './AddMFModal'
import ConfirmDialog from './ConfirmDialog'
import PnlBadge from './PnlBadge'
import SkeletonRows from './SkeletonRows'
import { formatINR, formatPct, formatChange, formatDate, formatNumber } from '../utils/formatters'
import { calcMfPnl, calcTotals } from '../utils/pnl'
import { useSortable } from '../hooks/useSortable'

function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <span className="sort-icon neutral">⇅</span>
  return <span className="sort-icon active">{sortDir === 'asc' ? '▲' : '▼'}</span>
}

const getSortVal = (fund, key) => {
  switch (key) {
    case 'symbol': return fund.schemeName
    case 'pnlPct': return calcMfPnl(fund).pnlPct
    case 'currentValue': return fund.currentNAV != null ? fund.units * fund.currentNAV : null
    case 'invested': return fund.units * fund.buyNAV
    case 'qty': return fund.units
    default: return fund[key]
  }
}

function FundRow({ fund, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { invested, current, pnl, pnlPct } = calcMfPnl(fund)
  const rowCls = pnl == null ? 'row-neutral' : pnl > 0 ? 'row-gain' : 'row-loss'

  return (
    <>
      <tr className={rowCls} onClick={() => setExpanded((v) => !v)}>
        <td className="cell-scheme">
          <div className="fw-600 fs-13 ellipsis">{fund.schemeName}</div>
          <div className="text-muted-sm">Code: {fund.schemeCode}</div>
        </td>
        <td className="right mono">{formatNumber(fund.units, 3)}</td>
        <td className="right mono">{formatINR(fund.buyNAV)}</td>
        <td className="right mono">
          {fund.currentNAV != null ? (
            <span className="fw-600">{formatINR(fund.currentNAV)}</span>
          ) : (
            <span className="text-3">—</span>
          )}
        </td>
        <td className="right mono">{formatINR(invested)}</td>
        <td className="right mono">
          {current != null ? formatINR(current) : <span className="text-3">—</span>}
        </td>
        <td className="right">
          {pnl != null ? (
            <span className={pnl >= 0 ? 'text-gain' : 'text-loss'}>{formatChange(pnl)}</span>
          ) : (
            <span className="text-3">—</span>
          )}
        </td>
        <td className="right">
          <PnlBadge value={pnl} pct={pnlPct} />
        </td>
      </tr>
      {expanded && (
        <tr className="expanded-row">
          <td colSpan={8}>
            <div className="row-details">
              <div className="row-details-meta">
                {fund.buyDate && (
                  <div className="row-details-meta-item">
                    Purchase Date: <span>{formatDate(fund.buyDate)}</span>
                  </div>
                )}
                {fund.navDate && (
                  <div className="row-details-meta-item">
                    NAV Date: <span>{fund.navDate}</span>
                  </div>
                )}
                <div className="row-details-meta-item">
                  Invested: <span>{formatINR(invested)}</span>
                </div>
              </div>
              <div className="row-details-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); onEdit(fund) }}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(fund) }}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="empty-state">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="12" y="16" width="56" height="52" rx="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="20" y="28" width="40" height="5" rx="2" fill="var(--blue)" opacity="0.5" />
        <rect x="20" y="37" width="30" height="4" rx="2" fill="var(--border)" />
        <rect x="20" y="45" width="35" height="4" rx="2" fill="var(--border)" />
        <rect x="20" y="53" width="25" height="4" rx="2" fill="var(--green)" opacity="0.6" />
      </svg>
      <h3>No mutual funds yet</h3>
      <p>Add your mutual fund holdings. NAV is fetched live from AMFI.</p>
      <button className="btn btn-primary" onClick={onAdd}>
        + Add Your First Fund
      </button>
    </div>
  )
}

export default function MutualFunds({ showToast }) {
  const { funds, loading, lastUpdated, addFund, removeFund, updateFund, refreshNAVs } =
    useMutualFunds()

  const [showAdd, setShowAdd] = useState(false)
  const [editFund, setEditFund] = useState(null)
  const [deleteFund, setDeleteFund] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (funds.length > 0 && funds.some((f) => f.currentNAV === null)) {
      refreshNAVs()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (!filter) return funds
    const q = filter.toLowerCase()
    return funds.filter(
      (f) => f.schemeName.toLowerCase().includes(q) || String(f.schemeCode).includes(q)
    )
  }, [funds, filter])

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    filtered, 'currentValue', 'desc', getSortVal
  )

  const totals = useMemo(() => calcTotals(funds), [funds])

  const [pulsing, setPulsing] = useState(false)
  const prevPnl = useRef(totals.totalPnl)
  useEffect(() => {
    if (prevPnl.current !== totals.totalPnl && totals.totalPnl != null) {
      setPulsing(true)
      const t = setTimeout(() => setPulsing(false), 400)
      prevPnl.current = totals.totalPnl
      return () => clearTimeout(t)
    }
  }, [totals.totalPnl])

  const handleAdd = useCallback(
    (data) => {
      addFund(data)
      setShowAdd(false)
      showToast('Mutual fund added', 'success')
    },
    [addFund, showToast]
  )

  const handleEdit = useCallback(
    (data) => {
      updateFund(editFund.id, data)
      setEditFund(null)
      showToast('Fund updated', 'success')
    },
    [editFund, updateFund, showToast]
  )

  const handleDelete = useCallback(() => {
    removeFund(deleteFund.id)
    setDeleteFund(null)
    showToast('Fund removed', 'info')
  }, [deleteFund, removeFund, showToast])

  const handleRefresh = useCallback(async () => {
    await refreshNAVs()
    showToast('NAVs refreshed', 'success')
  }, [refreshNAVs, showToast])

  const allNavNull = funds.length > 0 && funds.every((f) => f.currentNAV === null)
  const summaryClass = totals.totalPnl == null ? '' : totals.totalPnl >= 0 ? ' summary-gain' : ' summary-loss'

  const SortTh = ({ col, children, className = '' }) => (
    <th className={`sortable-th${className ? ' ' + className : ''}`} onClick={() => setSort(col)}>
      {children} <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  )

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">Mutual Funds</div>
          <div className="section-subtitle">
            {funds.length} holding{funds.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="section-header-right">
          {lastUpdated && (
            <div className="live-badge">
              <span className="live-dot" />
              Last updated:{' '}
              {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={loading || !funds.length}
          >
            {loading ? '⏳ Refreshing...' : '↻ Refresh NAVs'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add Fund
          </button>
        </div>
      </div>

      {funds.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="table-wrap">
          <div className="table-filter-bar">
            <div className="filter-input-wrap">
              <input
                className="filter-input"
                type="text"
                placeholder="Filter holdings…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter holdings"
              />
              {filter && (
                <button className="filter-clear" onClick={() => setFilter('')} aria-label="Clear filter">×</button>
              )}
            </div>
            {filter && (
              <span className="filter-count" aria-live="polite">{filtered.length} of {funds.length}</span>
            )}
          </div>

          {allNavNull && !loading && (
            <div className="prices-unavailable">
              <span>NAVs unavailable</span>
              <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>↻ Retry</button>
            </div>
          )}

          <div className="table-scroll">
            <table>
              <caption className="sr-only">Mutual fund holdings with current NAV and performance</caption>
              <thead>
                <tr>
                  <SortTh col="symbol">Scheme</SortTh>
                  <SortTh col="qty" className="right">Units</SortTh>
                  <SortTh col="invested" className="right">Buy NAV</SortTh>
                  <th className="right">Current NAV</th>
                  <SortTh col="invested" className="right">Invested</SortTh>
                  <SortTh col="currentValue" className="right">Current Value</SortTh>
                  <th className="right">P&amp;L</th>
                  <SortTh col="pnlPct" className="right">P&amp;L %</SortTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows count={funds.length || 3} cols={8} />
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="filter-no-results">No holdings match "{filter}"</td>
                  </tr>
                ) : (
                  sorted.map((f) => (
                    <FundRow
                      key={f.id}
                      fund={f}
                      onEdit={setEditFund}
                      onDelete={setDeleteFund}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div className={`table-summary${summaryClass}`}>
              <div className="table-summary-item">
                <span className="label">Total Invested</span>
                <span className="value">{formatINR(totals.totalInvested)}</span>
              </div>
              {totals.totalCurrent != null && (
                <>
                  <div className="table-summary-item">
                    <span className="label">Current Value</span>
                    <span className="value">{formatINR(totals.totalCurrent)}</span>
                  </div>
                  <div className="table-summary-item">
                    <span className="label">Total P&amp;L</span>
                    <span className={`value pnl-value${pulsing ? ' pnl-pulse' : ''} ${totals.totalPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                      {formatChange(totals.totalPnl)} ({formatPct(totals.totalPnlPct)})
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {showAdd && <AddMFModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editFund && (
        <AddMFModal
          initial={editFund}
          onSave={handleEdit}
          onClose={() => setEditFund(null)}
        />
      )}
      {deleteFund && (
        <ConfirmDialog
          title="Remove Fund"
          message={`Remove "${deleteFund.schemeName}" from your portfolio?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteFund(null)}
        />
      )}
    </div>
  )
}
