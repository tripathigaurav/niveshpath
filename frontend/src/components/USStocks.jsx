import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useUSStocks } from '../hooks/usePortfolio'
import AddStockModal from './AddStockModal'
import ConfirmDialog from './ConfirmDialog'
import FilterBar from './FilterBar'
import LiveBadge from './LiveBadge'
import SummaryBar from './SummaryBar'
import USHoldingsSection from './USHoldingsSection'
import { formatUSD, formatINR, formatPct, formatChange } from '../utils/formatters'
import { calcTotals, pnlColorClass } from '../utils/pnl'
import { calcRealizedGain } from '../utils/summaryMetrics'
import { storage } from '../utils/storage'
import { partitionUsHoldings, US_CATEGORY } from '../utils/usHoldings'

function EmptyState({ onAddStock }) {
  return (
    <div className="empty-state">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="8" y="20" width="64" height="44" rx="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
        <text x="40" y="48" textAnchor="middle" fontSize="22" fill="var(--blue)" fontWeight="700">$</text>
        <polyline points="15,55 30,40 45,47 65,28" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="65" cy="28" r="3.5" fill="var(--green)" />
      </svg>
      <h3>No US holdings yet</h3>
      <p>Track stocks &amp; ETFs, ESPP, and RSU in separate tables with live USD prices.</p>
      <button className="btn btn-primary" onClick={onAddStock}>
        + Add Your First US Stock
      </button>
    </div>
  )
}

function buildStockSubtitle(partition) {
  const parts = []
  if (partition.stockCount > 0) {
    parts.push(`${partition.stockCount} stock${partition.stockCount !== 1 ? 's' : ''}`)
  }
  if (partition.etfCount > 0) {
    parts.push(`${partition.etfCount} ETF${partition.etfCount !== 1 ? 's' : ''}`)
  }
  if (!parts.length) return 'Listed equities and exchange-traded funds'
  return parts.join(' · ')
}

export default function USStocks({ showToast }) {
  const { stocks, loading, lastUpdated, usdInr, addStock, removeStock, updateStock, refreshPrices } =
    useUSStocks()

  const [addCategory, setAddCategory] = useState(null)
  const [editStock, setEditStock] = useState(null)
  const [deleteStock, setDeleteStock] = useState(null)
  const [filter, setFilter] = useState('')
  const [showInr, setShowInr] = useState(false)

  const partition = useMemo(() => partitionUsHoldings(stocks), [stocks])

  const stockTableHoldings = useMemo(
    () => [...partition.stocksOnly, ...partition.etfs],
    [partition.stocksOnly, partition.etfs]
  )

  useEffect(() => {
    if (stocks.length > 0 && stocks.some((s) => s.currentPrice === null)) {
      refreshPrices()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = useMemo(() => calcTotals(stocks), [stocks])
  const totalDayChange = useMemo(() => {
    let sum = 0
    let hasAny = false
    for (const s of stocks) {
      if (s.dayChange != null && s.qty != null) {
        sum += s.dayChange * s.qty
        hasAny = true
      }
    }
    return hasAny ? sum : null
  }, [stocks])

  const realizedPnl = useMemo(
    () => calcRealizedGain(storage.getTransactions(), 'usStock'),
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
      setAddCategory(null)
      const labels = { stock: 'US stock', espp: 'ESPP holding', rsu: 'RSU holding' }
      showToast(`${labels[data.category] || 'Holding'} added successfully`, 'success')
    },
    [addStock, showToast]
  )

  const handleEdit = useCallback(
    (data) => {
      updateStock(editStock.id, { ...data, category: editStock.category || US_CATEGORY.STOCK })
      setEditStock(null)
      showToast('Holding updated', 'success')
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
  const pnlClr = totals.totalPnl != null ? (totals.totalPnl >= 0 ? 'text-gain' : 'text-loss') : ''

  const stockSubtitle = buildStockSubtitle(partition)

  const filteredCount = useMemo(() => {
    if (!filter) return stocks.length
    const q = filter.toLowerCase()
    return stocks.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).length
  }, [stocks, filter])

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">US Stocks</div>
          <div className="section-subtitle">
            {stocks.length} holding{stocks.length !== 1 ? 's' : ''}
            {partition.etfCount > 0 && (
              <span className="us-etf-summary-pill">{partition.etfCount} ETF</span>
            )}
            {usdInr && (
              <span className="fx-rate-badge">1 USD = ₹{usdInr.toFixed(2)}</span>
            )}
          </div>
        </div>
        <div className="section-header-right">
          <LiveBadge lastUpdated={lastUpdated} />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={loading || !stocks.length}
          >
            {loading ? 'Refreshing...' : '↻ Refresh Prices'}
          </button>
          {usdInr && stocks.length > 0 && (
            <button
              type="button"
              className={`btn btn-sm${showInr ? ' btn-primary' : ' btn-secondary'}`}
              onClick={() => setShowInr((v) => !v)}
              title={showInr ? 'Switch to USD' : `Convert to ₹ (1 USD = ₹${usdInr.toFixed(2)})`}
            >
              {showInr ? '$ USD' : '₹ INR'}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setAddCategory('stock')}>
            + Add Stock
          </button>
        </div>
      </div>

      {stocks.length === 0 ? (
        <EmptyState onAddStock={() => setAddCategory('stock')} />
      ) : (
        <div className="us-holdings-panel">
          {!loading && (() => {
            const fx = showInr && usdInr ? usdInr : null
            const fmtMain = fx ? (v) => formatINR(v * fx, true) : (v) => formatUSD(v)
            const fmtSub = fx ? (v) => formatINR(v * fx) : (v) => (usdInr ? formatINR(v * usdInr, true) : null)
            const fmtChgMain = fx ? (v) => formatINR(v * fx, true) : (v) => formatChange(v, 'USD')
            const fmtChgSub = fx ? (v) => formatChange(v * fx) : null
            const todayVal = totalDayChange != null ? fx ? totalDayChange * fx : totalDayChange : null
            const realizedVal = realizedPnl != null ? (fx ? realizedPnl * fx : realizedPnl) : null
            return (
              <SummaryBar
                variant="elevated"
                metrics={[
                  {
                    label: 'Current Value',
                    value: totals.totalCurrent != null ? fmtMain(totals.totalCurrent) : '—',
                    sub: totals.totalCurrent != null ? (fmtSub(totals.totalCurrent) || null) : null,
                  },
                  {
                    label: 'Investments',
                    value: fmtMain(totals.totalInvested),
                    sub: fmtSub(totals.totalInvested) || null,
                  },
                  {
                    label: "Today's Gain/Loss",
                    value: todayVal != null ? fmtChgMain(todayVal) : '—',
                    sub: todayVal != null && fmtChgSub ? fmtChgSub(totalDayChange) : (todayVal != null && !fx ? formatChange(totalDayChange, 'USD') : null),
                    colorClass: todayVal != null ? pnlColorClass(todayVal) : '',
                    accent: todayVal != null ? (todayVal > 0 ? 'gain' : todayVal < 0 ? 'loss' : null) : null,
                  },
                  {
                    label: 'Notional Gain/Loss',
                    value: totals.totalPnl != null ? fmtChgMain(fx ? totals.totalPnl * fx : totals.totalPnl) : '—',
                    sub: totals.totalPnl != null
                      ? `${fmtChgSub ? fmtChgSub(totals.totalPnl) : formatChange(totals.totalPnl, 'USD')} (${formatPct(totals.totalPnlPct)})`
                      : null,
                    colorClass: pnlClr,
                    accent: totals.totalPnl != null ? (totals.totalPnl >= 0 ? 'gain' : 'loss') : null,
                    pulse: pulsing,
                  },
                  {
                    label: 'Total Realized Gain/Loss',
                    value: realizedVal != null ? fmtChgMain(realizedVal) : '—',
                    sub: realizedVal != null && fmtChgSub
                      ? fmtChgSub(realizedPnl)
                      : (realizedVal != null ? formatChange(realizedPnl, 'USD') : null),
                    colorClass: realizedVal != null ? pnlColorClass(realizedVal) : '',
                    accent: realizedVal != null ? (realizedVal > 0 ? 'gain' : realizedVal < 0 ? 'loss' : null) : null,
                  },
                ]}
              />
            )
          })()}

          <FilterBar
            value={filter}
            onChange={setFilter}
            total={stocks.length}
            filtered={filteredCount}
          />

          {allPricesNull && !loading && (
            <div className="prices-unavailable">
              <span>Prices unavailable</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleRefresh}>
                ↻ Retry
              </button>
            </div>
          )}

          <div className="us-sections-stack">
            <USHoldingsSection
              title="Stocks & ETFs"
              subtitle={stockSubtitle}
              holdings={stockTableHoldings}
              loading={loading}
              filter={filter}
              usdInr={usdInr}
              showInr={showInr}
              showEtfBadge
              emptyMessage="Add US-listed stocks or ETFs — ETFs are auto-tagged when detected."
              onAdd={() => setAddCategory('stock')}
              addLabel="+ Add Stock"
              onEdit={setEditStock}
              onDelete={setDeleteStock}
            />


            <USHoldingsSection
              title="ESPP"
              subtitle="Employee Stock Purchase Plan"
              holdings={partition.espp}
              loading={loading}
              filter={filter}
              usdInr={usdInr}
              showInr={showInr}
              emptyMessage="No ESPP holdings — add shares from your company purchase plan."
              onAdd={() => setAddCategory('espp')}
              addLabel="+ Add ESPP"
              onEdit={setEditStock}
              onDelete={setDeleteStock}
            />

            <USHoldingsSection
              title="RSU"
              subtitle="Restricted Stock Units"
              holdings={partition.rsu}
              loading={loading}
              filter={filter}
              usdInr={usdInr}
              showInr={showInr}
              emptyMessage="No RSU holdings — add vested units with vest date and cost basis."
              onAdd={() => setAddCategory('rsu')}
              addLabel="+ Add RSU"
              onEdit={setEditStock}
              onDelete={setDeleteStock}
            />
          </div>
        </div>
      )}

      {addCategory && (
        <AddStockModal
          mode="us"
          usCategory={addCategory}
          onSave={handleAdd}
          onClose={() => setAddCategory(null)}
        />
      )}
      {editStock && (
        <AddStockModal
          mode="us"
          usCategory={editStock.category || US_CATEGORY.STOCK}
          initial={editStock}
          onSave={handleEdit}
          onClose={() => setEditStock(null)}
        />
      )}
      {deleteStock && (
        <ConfirmDialog
          title="Remove Holding"
          message={`Remove ${deleteStock.name} (${deleteStock.symbol}) from your portfolio?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteStock(null)}
        />
      )}
    </div>
  )
}
