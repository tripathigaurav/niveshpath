import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useUSStocks } from '../hooks/usePortfolio'
import AddStockModal from './AddStockModal'
import ConfirmDialog from './ConfirmDialog'
import PnlBadge from './PnlBadge'
import SkeletonRows from './SkeletonRows'
import { formatUSD, formatINR, formatPct, formatChange, formatDate } from '../utils/formatters'
import { calcUsPnl, calcTotals } from '../utils/pnl'
import { useSortable } from '../hooks/useSortable'

function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <span className="sort-icon neutral">⇅</span>
  return <span className="sort-icon active">{sortDir === 'asc' ? '▲' : '▼'}</span>
}

const getSortVal = (stock, key) => {
  switch (key) {
    case 'symbol': return stock.symbol
    case 'pnlPct': return calcUsPnl(stock).pnlPct
    case 'currentValue': return stock.currentPrice != null ? stock.qty * stock.currentPrice : null
    case 'invested': return stock.qty * stock.buyPrice
    case 'qty': return stock.qty
    default: return stock[key]
  }
}

function StockRow({ stock, usdInr, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { investedUSD, currentUSD, pnlUSD, pnlPct } = calcUsPnl(stock)
  const rowCls = pnlUSD == null ? 'row-neutral' : pnlUSD > 0 ? 'row-gain' : 'row-loss'
  const toINR = (usd) => (usdInr && usd != null ? usd * usdInr : null)

  return (
    <>
      <tr className={rowCls} onClick={() => setExpanded((v) => !v)}>
        <td><div className="fw-700 fs-13">{stock.symbol}</div></td>
        <td className="cell-name text-2">{stock.name}</td>
        <td className="right mono">{stock.qty.toLocaleString('en-US')}</td>
        <td className="right mono">{formatUSD(stock.buyPrice)}</td>
        <td className="right mono">
          {stock.currentPrice != null ? (
            <span className="fw-600">{formatUSD(stock.currentPrice)}</span>
          ) : (
            <span className="text-3">—</span>
          )}
        </td>
        <td className="right mono">
          <div>{formatUSD(investedUSD)}</div>
          {usdInr && <div className="text-muted-sm">{formatINR(toINR(investedUSD))}</div>}
        </td>
        <td className="right mono">
          {currentUSD != null ? (
            <>
              <div>{formatUSD(currentUSD)}</div>
              {usdInr && <div className="text-muted-sm">{formatINR(toINR(currentUSD))}</div>}
            </>
          ) : (
            <span className="text-3">—</span>
          )}
        </td>
        <td className="right">
          {pnlUSD != null ? (
            <span className={pnlUSD >= 0 ? 'text-gain' : 'text-loss'}>
              {formatChange(pnlUSD, 'USD')}
            </span>
          ) : (
            <span className="text-3">—</span>
          )}
        </td>
        <td className="right">
          <PnlBadge value={pnlUSD} pct={pnlPct} />
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
                      {formatChange(stock.dayChange, 'USD')} ({formatPct(stock.dayChangePct)})
                    </span>
                  </div>
                )}
                {usdInr && (
                  <div className="row-details-meta-item">
                    USD/INR Rate: <span className="fw-600">₹{usdInr.toFixed(2)}</span>
                  </div>
                )}
              </div>
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
        <rect x="8" y="20" width="64" height="44" rx="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
        <text x="40" y="48" textAnchor="middle" fontSize="22" fill="var(--blue)" fontWeight="700">$</text>
        <polyline points="15,55 30,40 45,47 65,28" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="65" cy="28" r="3.5" fill="var(--green)" />
      </svg>
      <h3>No US stocks yet</h3>
      <p>Add your NASDAQ/NYSE holdings to track live USD prices and P&amp;L.</p>
      <button className="btn btn-primary" onClick={onAdd}>
        + Add Your First US Stock
      </button>
    </div>
  )
}

export default function USStocks({ showToast }) {
  const { stocks, loading, lastUpdated, usdInr, addStock, removeStock, updateStock, refreshPrices } =
    useUSStocks()

  const [showAdd, setShowAdd] = useState(false)
  const [editStock, setEditStock] = useState(null)
  const [deleteStock, setDeleteStock] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (stocks.length > 0 && stocks.some((s) => s.currentPrice === null)) {
      refreshPrices()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      showToast('US stock added successfully', 'success')
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
          <div className="section-title">US Stocks</div>
          <div className="section-subtitle">
            {stocks.length} holding{stocks.length !== 1 ? 's' : ''}
            {usdInr && (
              <span className="fx-rate-badge">1 USD = ₹{usdInr.toFixed(2)}</span>
            )}
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
              <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>↻ Retry</button>
            </div>
          )}

          <div className="table-scroll">
            <table>
              <caption className="sr-only">US stock holdings with current prices and performance</caption>
              <thead>
                <tr>
                  <SortTh col="symbol">Symbol</SortTh>
                  <th>Name</th>
                  <SortTh col="qty" className="right">Qty</SortTh>
                  <SortTh col="invested" className="right">Buy Price</SortTh>
                  <th className="right">CMP (USD)</th>
                  <SortTh col="invested" className="right">Invested</SortTh>
                  <SortTh col="currentValue" className="right">Current Value</SortTh>
                  <th className="right">P&amp;L (USD)</th>
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
                      usdInr={usdInr}
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
                <span className="value">
                  {formatUSD(totals.totalInvested)}
                  {usdInr && (
                    <span className="summary-inr-hint">({formatINR(totals.totalInvested * usdInr)})</span>
                  )}
                </span>
              </div>
              {totals.totalCurrent != null && (
                <>
                  <div className="table-summary-item">
                    <span className="label">Current Value</span>
                    <span className="value">
                      {formatUSD(totals.totalCurrent)}
                      {usdInr && (
                        <span className="summary-inr-hint">({formatINR(totals.totalCurrent * usdInr)})</span>
                      )}
                    </span>
                  </div>
                  <div className="table-summary-item">
                    <span className="label">Total P&amp;L</span>
                    <span className={`value pnl-value${pulsing ? ' pnl-pulse' : ''} ${totals.totalPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                      {formatChange(totals.totalPnl, 'USD')} ({formatPct(totals.totalPnlPct)})
                    </span>
                  </div>
                  {totalDayChange !== 0 && (
                    <div className="table-summary-item">
                      <span className="label">Today</span>
                      <span className={`value ${totalDayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {formatChange(totalDayChange, 'USD')}
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
        <AddStockModal mode="us" onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editStock && (
        <AddStockModal
          mode="us"
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
