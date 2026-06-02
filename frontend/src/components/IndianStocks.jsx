import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useIndianStocks } from '../hooks/usePortfolio'
import AddStockModal from './AddStockModal'
import ConfirmDialog from './ConfirmDialog'
import PnlBadge from './PnlBadge'
import SkeletonRows from './SkeletonRows'
import { formatINR, formatPct, formatChange, formatDate } from '../utils/formatters'
import { calcTotals, calcIndianStockMetrics, pnlColorClass } from '../utils/pnl'
import {
  buildHoldingsSummaryMetrics,
  calcRealizedGain,
  sumTodayPnl,
} from '../utils/summaryMetrics'
import { storage } from '../utils/storage'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import FilterBar from './FilterBar'
import LiveBadge from './LiveBadge'
import SummaryBar from './SummaryBar'
import {
  IndianStockCard,
  HoldingCardSkeleton,
  HoldingCardsEmpty,
} from './HoldingCards'
import { partitionIndianHoldings } from '../utils/indianHoldings'

const COL_SPAN = 11

function ColoredValue({ value, format = formatChange }) {
  if (value == null) return <span className="text-3">—</span>
  return <span className={pnlColorClass(value)}>{format(value)}</span>
}

const getSortVal = (stock, key) => {
  const m = calcIndianStockMetrics(stock)
  switch (key) {
    case 'symbol':
      return stock.symbol
    case 'ltp':
      return m.ltp
    case 'qty':
      return stock.qty
    case 'buyPrice':
      return stock.buyPrice
    case 'invested':
      return m.invested
    case 'dayChange':
      return m.dayChangePerShare
    case 'dayChangePct':
      return m.dayChangePct
    case 'currentValue':
    case 'networth':
      return m.current
    case 'todayPnl':
      return m.todayPnl
    case 'pnl':
      return m.pnl
    case 'pnlPct':
      return m.pnlPct
    default:
      return stock[key]
  }
}

function StockRow({ stock, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const m = calcIndianStockMetrics(stock)
  const rowCls = m.pnl == null ? 'row-neutral' : m.pnl > 0 ? 'row-gain' : 'row-loss'

  return (
    <>
      <tr
        className={rowCls}
        onClick={() => setExpanded((v) => !v)}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
      >
        <td className="cell-company">
          <div className="cell-company-symbol">
            {stock.symbol}
            {stock.isEtf && (
              <span className="us-etf-badge in-etf-badge" title="Exchange-traded fund">ETF</span>
            )}
          </div>
          <div className="cell-company-name">{stock.name}</div>
        </td>
        <td className="right mono">
          {m.ltp != null ? (
            <span className="fw-600">{formatINR(m.ltp)}</span>
          ) : (
            <span className="text-3">—</span>
          )}
        </td>
        <td className="right mono">{stock.qty.toLocaleString('en-IN')}</td>
        <td className="right mono">{formatINR(stock.buyPrice)}</td>
        <td className="right mono">{formatINR(m.invested)}</td>
        <td className="right">
          <ColoredValue value={m.dayChangePerShare} />
        </td>
        <td className="right">
          {m.dayChangePct != null ? (
            <span className={pnlColorClass(m.dayChangePct)}>{formatPct(m.dayChangePct)}</span>
          ) : (
            <span className="text-3">—</span>
          )}
        </td>
        <td className="right mono">
          {m.current != null ? formatINR(m.current) : <span className="text-3">—</span>}
        </td>
        <td className="right">
          <ColoredValue value={m.todayPnl} />
        </td>
        <td className="right">
          <ColoredValue value={m.pnl} />
        </td>
        <td className="right">
          <PnlBadge value={m.pnl} pct={m.pnlPct} />
        </td>
      </tr>
      {expanded && (
        <tr className="expanded-row">
          <td colSpan={COL_SPAN}>
            <div className="row-details">
              <div className="row-details-meta">
                <div className="row-details-meta-item">
                  Buy Date: <span>{stock.buyDate ? formatDate(stock.buyDate) : '—'}</span>
                </div>
              </div>
              <div className="text-muted-sm">Corporate actions will appear here in Phase 4.</div>
              <div className="row-details-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); onEdit(stock) }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(stock) }}
                >
                  Delete
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

  const partition = useMemo(() => partitionIndianHoldings(stocks), [stocks])

  const displaySorted = useMemo(() => {
    const stocksOnly = sorted.filter((s) => !s.isEtf)
    const etfs = sorted.filter((s) => s.isEtf)
    return [...stocksOnly, ...etfs]
  }, [sorted])

  const totals = useMemo(() => calcTotals(stocks), [stocks])
  const totalTodayPnl = useMemo(() => sumTodayPnl(stocks), [stocks])
  const realizedPnl = useMemo(
    () => calcRealizedGain(storage.getTransactions(), 'indianStock'),
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

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">Indian Stocks</div>
          <div className="section-subtitle">
            {stocks.length} holding{stocks.length !== 1 ? 's' : ''}
            {partition.etfCount > 0 && (
              <span className="us-etf-summary-pill">{partition.etfCount} ETF</span>
            )}
          </div>
        </div>
        <div className="section-header-right">
          <LiveBadge lastUpdated={lastUpdated} />
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={loading || !stocks.length}
          >
            {loading ? 'Refreshing...' : 'Refresh Prices'}
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
          {!loading && (
            <SummaryBar
              variant="elevated"
              metrics={buildHoldingsSummaryMetrics({
                totalCurrent: totals.totalCurrent,
                totalInvested: totals.totalInvested,
                todayPnl: totalTodayPnl,
                totalPnl: totals.totalPnl,
                totalPnlPct: totals.totalPnlPct,
                realizedPnl,
                pulsing,
              })}
            />
          )}

          <FilterBar
            value={filter}
            onChange={setFilter}
            total={stocks.length}
            filtered={filtered.length}
            inputRef={filterRef}
          />

          {allPricesNull && !loading && (
            <div className="prices-unavailable">
              <span>Prices unavailable</span>
              <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
                Retry
              </button>
            </div>
          )}


          <div className="table-scroll">
            <table className="holdings-table holdings-table--indian">
              <caption className="sr-only">Indian stock holdings with current prices and performance</caption>
              <colgroup>
                <col style={{ width: '17%' }} /> {/* Company */}
                <col style={{ width: '8%' }} />  {/* LTP */}
                <col style={{ width: '5%' }} />  {/* Qty */}
                <col style={{ width: '8%' }} />  {/* Avg Cost */}
                <col style={{ width: '9%' }} />  {/* Invested */}
                <col style={{ width: '8%' }} />  {/* Day ₹ */}
                <col style={{ width: '7%' }} />  {/* Day % */}
                <col style={{ width: '9%' }} />  {/* Networth */}
                <col style={{ width: '9%' }} />  {/* Today */}
                <col style={{ width: '11%' }} /> {/* P&L */}
                <col style={{ width: '9%' }} />  {/* P&L % */}
              </colgroup>
              <thead>
                <tr>
                  <SortTh col="symbol" label="Company" className="cell-company" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="ltp" label="LTP" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="qty" label="Qty" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="buyPrice" label="Avg Cost" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="invested" label="Invested" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="dayChange" label="Day ₹" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="dayChangePct" label="Day %" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="networth" label="Networth" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="todayPnl" label="Today" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="pnl" label="P&amp;L" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="pnlPct" label="P&amp;L %" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows count={stocks.length || 4} cols={COL_SPAN} />
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={COL_SPAN} className="filter-no-results">No holdings match "{filter}"</td>
                  </tr>
                ) : (
                  displaySorted.map((s) => (
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

            {loading ? (
              <HoldingCardSkeleton count={stocks.length || 4} />
            ) : sorted.length === 0 ? (
              <HoldingCardsEmpty message={`No holdings match "${filter}"`} />
            ) : (
              <div className="holding-cards">
                {displaySorted.map((s) => (
                  <IndianStockCard
                    key={s.id}
                    stock={s}
                    onEdit={setEditStock}
                    onDelete={setDeleteStock}
                  />
                ))}
              </div>
            )}
          </div>

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
