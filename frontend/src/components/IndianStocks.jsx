import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useIndianStocks } from '../hooks/usePortfolio'
import AddStockModal from './AddStockModal'
import ConfirmDialog from './ConfirmDialog'
import PnlBadge from './PnlBadge'
import SkeletonRows from './SkeletonRows'
import { formatINR, formatPct, formatChange, formatDate } from '../utils/formatters'
import { calcPnl, calcTotals } from '../utils/pnl'
import { useSortable } from '../hooks/useSortable'

function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <span className="sort-icon neutral">⇅</span>
  return <span className="sort-icon active">{sortDir === 'asc' ? '▲' : '▼'}</span>
}

const getSortVal = (stock, key) => {
  switch (key) {
    case 'symbol': return stock.symbol
    case 'pnlPct': return calcPnl(stock).pnlPct
    case 'currentValue': return stock.currentPrice != null ? stock.qty * stock.currentPrice : null
    case 'invested': return stock.qty * stock.buyPrice
    case 'qty': return stock.qty
    default: return stock[key]
  }
}

function StockRow({ stock, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { invested, current, pnl, pnlPct } = calcPnl(stock)
  const rowCls = pnl == null ? 'row-neutral' : pnl > 0 ? 'row-gain' : 'row-loss'

  return (
    <>
      <tr className={rowCls} onClick={() => setExpanded((v) => !v)}>
        <td><div className="fw-700 fs-13">{stock.symbol}</div></td>
        <td className="cell-name text-2">{stock.name}</td>
        <td className="right mono">{stock.qty.toLocaleString('en-IN')}</td>
        <td className="right mono">{formatINR(stock.buyPrice)}</td>
        <td className="right mono">
          {stock.currentPrice != null ? (
            <span className="fw-600">{formatINR(stock.currentPrice)}</span>
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
          ) : <span className="text-3">—</span>}
        </td>
        <td className="right">
          <PnlBadge value={pnl} pct={pnlPct} />
        </td>
      </tr>
      {expanded && (
        <tr className="expanded-row">
          <td colSpan={9}>
            <div className="row-details">
              <div className="row-details-meta">
                <div className="row-details-meta-item">
                  Buy Date: <span>{stock.buyDate ? formatDate(stock.buyDate) : '—'}</span>
                </div>
                {stock.dayChange != null && (
                  <div className="row-details-meta-item">
                    Day Change:{' '}
                    <span className={stock.dayChange >= 0 ? 'text-gain' : 'text-loss'}>
                      {formatChange(stock.dayChange)} ({formatPct(stock.dayChangePct)})
                    </span>
                  </div>
                )}
              </div>
              <div className="text-muted-sm">Corporate actions will appear here in Phase 4.</div>
              <div className="row-details-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); onEdit(stock) }}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(stock) }}
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
        <rect x="10" y="50" width="10" height="20" rx="2" fill="var(--green)" opacity="0.7" />
        <rect x="25" y="35" width="10" height="35" rx="2" fill="var(--blue)" opacity="0.7" />
        <rect x="40" y="42" width="10" height="28" rx="2" fill="var(--red)" opacity="0.5" />
        <rect x="55" y="25" width="10" height="45" rx="2" fill="var(--green)" opacity="0.9" />
        <line x1="8" y1="70" x2="72" y2="70" stroke="var(--border)" strokeWidth="2" />
        <polyline points="15,45 30,30 45,38 60,20" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="60" cy="20" r="3.5" fill="var(--green)" />
      </svg>
      <h3>No Indian stocks yet</h3>
      <p>Add your NSE/BSE holdings to track their live prices and P&L.</p>
      <button className="btn btn-primary" onClick={onAdd}>
        + Add Your First Stock
      </button>
    </div>
  )
}

export default function IndianStocks({ showToast }) {
  const { stocks, loading, lastUpdated, addStock, removeStock, updateStock, refreshPrices } =
    useIndianStocks()

  const [showAdd, setShowAdd] = useState(false)
  const [editStock, setEditStock] = useState(null)
  const [deleteStock, setDeleteStock] = useState(null)
  const [filter, setFilter] = useState('')
  const filterRef = useRef(null)

  const filtered = useMemo(() => {
    if (!filter) return stocks
    const q = filter.toLowerCase()
    return stocks.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [stocks, filter])

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    filtered, 'currentValue', 'desc', getSortVal
  )

  const totals = useMemo(() => calcTotals(stocks), [stocks])
  const totalDayChange = useMemo(
    () => stocks.reduce((sum, s) => sum + (s.dayChange ?? 0), 0),
    [stocks]
  )

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
      addStock(data)
      setShowAdd(false)
      showToast('Stock added successfully', 'success')
    },
    [addStock, showToast]
  )

  const handleEdit = useCallback(
    (data) => {
      updateStock(editStock.id, data)
      setEditStock(null)
      showToast('Stock updated', 'success')
    },
    [editStock, updateStock, showToast]
  )

  const handleDelete = useCallback(() => {
    removeStock(deleteStock.id)
    setDeleteStock(null)
    showToast(`${deleteStock.symbol} removed`, 'info')
  }, [deleteStock, removeStock, showToast])

  const handleRefresh = useCallback(async () => {
    await refreshPrices()
    showToast('Prices refreshed', 'success')
  }, [refreshPrices, showToast])

  const allPricesNull = stocks.length > 0 && stocks.every((s) => s.currentPrice === null)
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
          <div className="section-title">Indian Stocks</div>
          <div className="section-subtitle">{stocks.length} holding{stocks.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="section-header-right">
          {lastUpdated && (
            <div className="live-badge">
              <span className="live-dot" />
              Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={loading || !stocks.length}
          >
            {loading ? '⏳ Refreshing...' : '↻ Refresh Prices'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add Stock
          </button>
        </div>
      </div>

      {stocks.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="table-wrap">
          <div className="table-filter-bar">
            <div className="filter-input-wrap">
              <input
                ref={filterRef}
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
              <span className="filter-count" aria-live="polite">{filtered.length} of {stocks.length}</span>
            )}
          </div>

          {allPricesNull && !loading && (
            <div className="prices-unavailable">
              <span>Prices unavailable</span>
              <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
                ↻ Retry
              </button>
            </div>
          )}

          <div className="table-scroll">
            <table>
              <caption className="sr-only">Indian stock holdings with current prices and performance</caption>
              <thead>
                <tr>
                  <SortTh col="symbol">Symbol</SortTh>
                  <th>Name</th>
                  <SortTh col="qty" className="right">Qty</SortTh>
                  <SortTh col="invested" className="right">Buy Price</SortTh>
                  <th className="right">CMP</th>
                  <SortTh col="invested" className="right">Invested</SortTh>
                  <SortTh col="currentValue" className="right">Current Value</SortTh>
                  <th className="right">P&amp;L</th>
                  <SortTh col="pnlPct" className="right">P&amp;L %</SortTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows count={stocks.length || 4} />
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="filter-no-results">No holdings match "{filter}"</td>
                  </tr>
                ) : (
                  sorted.map((s) => (
                    <StockRow
                      key={s.id}
                      stock={s}
                      onEdit={setEditStock}
                      onDelete={setDeleteStock}
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
                  {totalDayChange !== 0 && (
                    <div className="table-summary-item">
                      <span className="label">Today</span>
                      <span className={`value ${totalDayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {formatChange(totalDayChange)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddStockModal mode="indian" onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editStock && (
        <AddStockModal
          mode="indian"
          initial={editStock}
          onSave={handleEdit}
          onClose={() => setEditStock(null)}
        />
      )}
      {deleteStock && (
        <ConfirmDialog
          title="Remove Stock"
          message={`Remove ${deleteStock.name} (${deleteStock.symbol}) from your portfolio?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteStock(null)}
        />
      )}
    </div>
  )
}
