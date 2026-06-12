import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useIndianStocks } from '../hooks/usePortfolio'
import AddStockModal from './AddStockModal'
import ConfirmDialog from './ConfirmDialog'
import PnlBadge from './PnlBadge'
import styles from './IndianStocks.module.css'
import SkeletonRows from './SkeletonRows'
import { formatINR, formatPct, formatChange } from '../utils/formatters'
import { calcTotals, calcIndianStockMetrics, pnlColorClass } from '../utils/pnl'
import {
  buildHoldingsSummaryMetrics,
  calcRealizedGain,
  sumTodayPnl,
} from '../utils/summaryMetrics'
import { storage } from '../utils/storage'
import {
  calcCategoryXirr,
  calcHoldingXirr,
  formatXirrDisplay,
  buildHoldingXirrMap,
} from '../utils/xirrMetrics'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import FilterBar from './FilterBar'
import LiveBadge from './LiveBadge'
import SummaryBar from './SummaryBar'
import PageActions from './PageActions'
import {
  IndianStockCard,
  HoldingCardSkeleton,
  HoldingCardsEmpty,
} from './HoldingCards'
import IndianHoldingDetailModal from './IndianHoldingDetailModal'
import MarketStatusBar from './MarketStatusBar'
import HoldingsSubTabs from './HoldingsSubTabs'
import ExchangeToggle from './ExchangeToggle'
import IrrTable from './IrrTable'
import MarketDataTable from './MarketDataTable'
import HoldingsPnlChart from './HoldingsPnlChart'
import { useWindowedXirr } from '../hooks/useWindowedXirr'
import { useIndianExchangeQuotes } from '../hooks/useIndianExchangeQuotes'
import { getPastHoldings, currentSymbolSet } from '../utils/holdingLedger'
import { currentValueHint } from '../utils/holdingTabMessages'

const COL_SPAN = 12

function ColoredValue({ value, format = formatChange }) {
  if (value == null) return <span className="text-3">—</span>
  return <span className={pnlColorClass(value)}>{format(value)}</span>
}

const getSortVal = (stock, key) => {
  if (stock.isPast) {
    switch (key) {
      case 'symbol':
        return stock.symbol
      case 'buyPrice':
        return stock.buyPrice
      case 'invested':
        return stock.totalInvested
      case 'pnl':
        return stock.realizedPnl
      case 'pnlPct':
        return stock.realizedPct
      default:
        return stock[key]
    }
  }
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
    case 'xirr':
      return calcHoldingXirr(stock, 'indianStock', storage.getTransactions())
    default:
      return stock[key]
  }
}

function StockRow({ stock, xirr, onOpenDetail }) {
  const m = calcIndianStockMetrics(stock)
  const rowCls = m.pnl == null ? 'row-neutral' : m.pnl > 0 ? 'row-gain' : 'row-loss'

  return (
      <tr
        className={`${rowCls} holdings-row--clickable`}
        onClick={() => onOpenDetail(stock)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenDetail(stock)
          }
        }}
      >
        <td className="cell-company">
          <div className="cell-company-symbol">
            {stock.symbol}
            {stock.isEtf && (
              <span className={`us-etf-badge ${styles.inEtfBadge}`} title="Exchange-traded fund">ETF</span>
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
        <td className="right mono">
          <span className={xirr != null ? pnlColorClass(xirr) : 'text-3'}>
            {formatXirrDisplay(xirr)}
          </span>
        </td>
      </tr>
  )
}

function PastStockRow({ stock }) {
  return (
    <tr className="row-neutral holdings-row--past">
      <td className="cell-company">
        <div className="cell-company-symbol">{stock.symbol}</div>
        <div className="cell-company-name">{stock.name}</div>
      </td>
      <td className="right text-3">—</td>
      <td className="right mono">0</td>
      <td className="right mono">{stock.buyPrice != null ? formatINR(stock.buyPrice) : '—'}</td>
      <td className="right mono">{formatINR(stock.totalInvested)}</td>
      <td className="right text-3">—</td>
      <td className="right text-3">—</td>
      <td className="right text-3">—</td>
      <td className="right text-3">—</td>
      <td className="right">
        <ColoredValue value={stock.realizedPnl} />
      </td>
      <td className="right">
        {stock.realizedPct != null ? (
          <span className={pnlColorClass(stock.realizedPct)}>{formatPct(stock.realizedPct)}</span>
        ) : (
          <span className="text-3">—</span>
        )}
      </td>
      <td className="right text-3">—</td>
    </tr>
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

export default function IndianStocks({ showToast, onOpenTransactions }) {
  const { stocks, loading, lastUpdated, addStock, removeStock, updateStock, refreshPrices } =
    useIndianStocks()

  const [showAdd, setShowAdd] = useState(false)
  const [editStock, setEditStock] = useState(null)
  const [deleteStock, setDeleteStock] = useState(null)
  const [detailStock, setDetailStock] = useState(null)
  const [filter, setFilter] = useState('')
  const [subTab, setSubTab] = useState('basic')
  const [holdingFilter, setHoldingFilter] = useState('current')
  const [marketExchange, setMarketExchange] = useState(() => {
    try {
      return localStorage.getItem('pt_indian_market_exchange') || 'NSE'
    } catch {
      return 'NSE'
    }
  })

  const handleMarketExchangeChange = useCallback((ex) => {
    setMarketExchange(ex)
    try {
      localStorage.setItem('pt_indian_market_exchange', ex)
    } catch {
      /* ignore */
    }
  }, [])
  const filterRef = useRef(null)

  const transactions = useMemo(() => storage.getTransactions(), [stocks])
  const pastHoldings = useMemo(
    () => getPastHoldings(transactions, 'indianStock', currentSymbolSet(stocks, 'indianStock')),
    [transactions, stocks]
  )

  const { displayStocks } = useIndianExchangeQuotes(stocks, marketExchange, true)

  const basicSource = useMemo(() => {
    if (holdingFilter === 'past') return pastHoldings
    if (holdingFilter === 'all') return [...displayStocks, ...pastHoldings]
    return displayStocks
  }, [displayStocks, pastHoldings, holdingFilter])

  const filtered = useMemo(() => {
    if (!filter) return basicSource
    const q = filter.toLowerCase()
    return basicSource.filter(
      (s) => s.symbol.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q)
    )
  }, [basicSource, filter])

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    filtered, 'currentValue', 'desc', getSortVal, 'indian'
  )

  const totals = useMemo(() => calcTotals(displayStocks), [displayStocks])
  const totalTodayPnl = useMemo(() => sumTodayPnl(displayStocks), [displayStocks])
  const realizedPnl = useMemo(
    () => calcRealizedGain(storage.getTransactions(), 'indianStock'),
    [stocks]
  )
  const { windowedXirr, windowedLoading } = useWindowedXirr(
    displayStocks,
    'indianStock',
    transactions,
    { exchange: marketExchange, enabled: subTab === 'irr' }
  )

  const xirrById = useMemo(
    () => buildHoldingXirrMap(stocks, 'indianStock', transactions),
    [stocks, transactions]
  )
  const xirrRate = useMemo(
    () => calcCategoryXirr('indianStock', stocks, transactions),
    [stocks, transactions]
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

  const allPricesNull =
    displayStocks.length > 0 && displayStocks.every((s) => s.currentPrice === null)
  const hasAnyHoldings = stocks.length > 0 || pastHoldings.length > 0

  return (
    <div className="page page--category">
      <div className="section-header">
        <div>
          <div className="section-title">Indian Stocks</div>
          <div className="section-subtitle">
            {stocks.length} holding{stocks.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="section-header-right">
          <LiveBadge lastUpdated={lastUpdated} />
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={loading || !stocks.length}
          >
            {loading ? <><span className="btn-spinner" aria-hidden="true" />Refreshing...</> : '↻ Refresh Prices'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add Stock
          </button>
        </div>
      </div>

      <MarketStatusBar market="indian" />

      <PageActions actions={[
        onOpenTransactions && { icon: '📋', label: 'Transactions', onClick: onOpenTransactions },
      ].filter(Boolean)} />

      {!hasAnyHoldings ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="category-holdings-panel">
          {!loading && stocks.length > 0 && (
            <SummaryBar
              variant="elevated"
              metrics={buildHoldingsSummaryMetrics({
                totalCurrent: totals.totalCurrent,
                totalInvested: totals.totalInvested,
                todayPnl: totalTodayPnl,
                totalPnl: totals.totalPnl,
                totalPnlPct: totals.totalPnlPct,
                realizedPnl,
                xirrRate,
                pulsing,
                assetType: 'indianStock',
                currentSubHint:
                  totals.totalCurrent == null ? currentValueHint('indianStock') : null,
              })}
            />
          )}

          <HoldingsSubTabs
            activeTab={subTab}
            onTabChange={setSubTab}
            showHoldingFilter={subTab === 'basic'}
            holdingFilter={holdingFilter}
            onHoldingFilterChange={setHoldingFilter}
            subtabBarRight={
              subTab !== 'pnl' ? (
                <ExchangeToggle value={marketExchange} onChange={handleMarketExchangeChange} />
              ) : null
            }
          />

          {subTab === 'basic' && (
            <>
              <FilterBar
                value={filter}
                onChange={setFilter}
                total={basicSource.length}
                filtered={filtered.length}
                inputRef={filterRef}
              />

              {allPricesNull && !loading && holdingFilter !== 'past' && (
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
                <col style={{ width: '8%' }} />  {/* P&L % */}
                <col style={{ width: '8%' }} />  {/* XIRR */}
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
                  <SortTh col="xirr" label="XIRR" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
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
                  sorted.map((s) =>
                    s.isPast ? (
                      <PastStockRow key={s.id} stock={s} />
                    ) : (
                      <StockRow
                        key={s.id}
                        stock={s}
                        xirr={xirrById.get(s.id)}
                        onOpenDetail={setDetailStock}
                      />
                    )
                  )
                )}
              </tbody>
            </table>

            {loading ? (
              <HoldingCardSkeleton count={stocks.length || 4} />
            ) : sorted.length === 0 ? (
              <HoldingCardsEmpty message={`No holdings match "${filter}"`} />
            ) : (
              <div className="holding-cards">
                {sorted.filter((s) => !s.isPast).map((s) => (
                  <IndianStockCard
                    key={s.id}
                    stock={s}
                    onOpenDetail={setDetailStock}
                    onEdit={setEditStock}
                    onDelete={setDeleteStock}
                  />
                ))}
              </div>
            )}
          </div>
            </>
          )}

          {subTab === 'irr' && (
            <IrrTable
              holdings={displayStocks}
              assetType="indianStock"
              windowedXirr={windowedXirr}
              loading={windowedLoading}
              formatPrice={formatINR}
              getQty={(h) => h.qty}
              getLabel={(h) => h.symbol}
              getPrice={(h) => h.currentPrice}
            />
          )}

          {subTab === 'market' && (
            <MarketDataTable
              holdings={displayStocks}
              assetType="indianStock"
              formatPrice={formatINR}
              exchange={marketExchange}
            />
          )}

          {subTab === 'pnl' && (
            <HoldingsPnlChart
              transactions={transactions}
              assetType="indianStock"
              liveCurrentValue={totals.totalCurrent}
              liveInvestedValue={totals.totalInvested}
            />
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

      <IndianHoldingDetailModal
        stock={detailStock}
        open={!!detailStock}
        onClose={() => setDetailStock(null)}
        onEdit={setEditStock}
        onDelete={setDeleteStock}
        lastUpdated={lastUpdated}
        showToast={showToast}
      />
    </div>
  )
}
