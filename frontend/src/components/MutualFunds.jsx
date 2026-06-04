import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useMutualFunds } from '../hooks/usePortfolio'
import AddMFModal from './AddMFModal'
import ConfirmDialog from './ConfirmDialog'
import PnlBadge from './PnlBadge'
import SkeletonRows from './SkeletonRows'
import { formatINR, formatPct, formatChange, formatDate, formatNumber } from '../utils/formatters'
import { calcMfPnl, calcTotals } from '../utils/pnl'
import {
  buildHoldingsSummaryMetrics,
  calcRealizedGain,
  sumMfTodayPnl,
} from '../utils/summaryMetrics'
import { storage } from '../utils/storage'
import {
  calcCategoryXirr,
  formatXirrDisplay,
  buildHoldingXirrMap,
} from '../utils/xirrMetrics'
import { pnlColorClass } from '../utils/pnl'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import FilterBar from './FilterBar'
import LiveBadge from './LiveBadge'
import SummaryBar from './SummaryBar'
import MutualFundDetailModal from './MutualFundDetailModal'
import MfNavStatusBar from './MfNavStatusBar'
import { formatNavDate } from '../utils/mfNavDisplay'
import PageActions from './PageActions'
import {
  MutualFundCard,
  HoldingCardSkeleton,
  HoldingCardsEmpty,
} from './HoldingCards'

const getSortVal = (fund, key) => {
  switch (key) {
    case 'symbol': return fund.schemeName
    case 'pnlPct': return calcMfPnl(fund).pnlPct
    case 'currentValue': return fund.currentNAV != null ? fund.units * fund.currentNAV : null
    case 'invested': return fund.units * fund.buyNAV
    case 'buyNAV': return fund.buyNAV
    case 'qty': return fund.units
    case 'xirr':
      return calcHoldingXirr(fund, 'mutualFund', storage.getTransactions())
    default: return fund[key]
  }
}

function FundRow({ fund, xirr, onOpenDetail }) {
  const { invested, current, pnl, pnlPct } = calcMfPnl(fund)
  const rowCls = pnl == null ? 'row-neutral' : pnl > 0 ? 'row-gain' : 'row-loss'

  return (
      <tr
        className={`${rowCls} holdings-row--clickable`}
        onClick={() => onOpenDetail(fund)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenDetail(fund)
          }
        }}
      >
        <td className="cell-scheme">
          <div className="cell-scheme-name" title={fund.schemeName}>
            {fund.schemeName}
          </div>
          <div className="text-muted-sm">Code: {fund.schemeCode}</div>
        </td>
        <td className="right mono col-day-change">{formatNumber(fund.units, 3)}</td>
        <td className="right mono col-buy-price">{formatINR(fund.buyNAV)}</td>
        <td className="right mono col-nav">
          {fund.currentNAV != null ? (
            <>
              <span className="fw-600">{formatINR(fund.currentNAV)}</span>
              {fund.navDate && (
                <div className="mf-nav-cell-date" title="AMFI NAV date">
                  {formatNavDate(fund.navDate, { shortYear: true })}
                </div>
              )}
            </>
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
        <td className="right mono">
          <span className={xirr != null ? pnlColorClass(xirr) : 'text-3'}>
            {formatXirrDisplay(xirr)}
          </span>
        </td>
      </tr>
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
      <p>Add mutual fund holdings. NAV from AMFI (published on business days).</p>
      <button className="btn btn-primary" onClick={onAdd}>
        + Add Your First Fund
      </button>
    </div>
  )
}

export default function MutualFunds({ showToast, onOpenSIPTracker, onOpenTransactions }) {
  const { funds, loading, lastUpdated, addFund, removeFund, updateFund, refreshNAVs } =
    useMutualFunds()

  const [showAdd, setShowAdd] = useState(false)
  const [editFund, setEditFund] = useState(null)
  const [deleteFund, setDeleteFund] = useState(null)
  const [detailFund, setDetailFund] = useState(null)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return funds
    const q = filter.toLowerCase()
    return funds.filter(
      (f) => f.schemeName.toLowerCase().includes(q) || String(f.schemeCode).includes(q)
    )
  }, [funds, filter])

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    filtered, 'currentValue', 'desc', getSortVal, 'mf'
  )

  const totals = useMemo(() => calcTotals(funds), [funds])
  const totalTodayPnl = useMemo(() => sumMfTodayPnl(funds), [funds])
  const realizedPnl = useMemo(
    () => calcRealizedGain(storage.getTransactions(), 'mutualFund'),
    [funds]
  )
  const transactions = useMemo(() => storage.getTransactions(), [funds])
  const xirrById = useMemo(
    () => buildHoldingXirrMap(funds, 'mutualFund', transactions),
    [funds, transactions]
  )
  const xirrRate = useMemo(
    () => calcCategoryXirr('mutualFund', funds, transactions),
    [funds, transactions]
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
  return (
    <div className="page page--category">
      <div className="section-header">
        <div>
          <div className="section-title">Mutual Funds</div>
          <div className="section-subtitle">
            {funds.length} holding{funds.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="section-header-right">
          <LiveBadge lastUpdated={lastUpdated} />
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={loading || !funds.length}
          >
            {loading ? <><span className="btn-spinner" aria-hidden="true" />Refreshing...</> : '↻ Refresh NAVs'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add Fund
          </button>
        </div>
      </div>

      <MfNavStatusBar funds={funds} />

      <PageActions actions={[
        onOpenSIPTracker && { icon: '🔁', label: 'SIP Tracker', onClick: onOpenSIPTracker },
        onOpenTransactions && { icon: '📋', label: 'Transactions', onClick: onOpenTransactions },
      ].filter(Boolean)} />

      {funds.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="category-holdings-panel">
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
                xirrRate,
                pulsing,
                currentSubHint: totals.totalCurrent == null ? 'Refresh NAV to see value' : null,
              })}
            />
          )}

          <FilterBar
            value={filter}
            onChange={setFilter}
            total={funds.length}
            filtered={filtered.length}
          />

          {allNavNull && !loading && (
            <div className="prices-unavailable">
              <span>NAVs unavailable</span>
              <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>↻ Retry</button>
            </div>
          )}

          <div className="table-scroll">
            <table className="holdings-table holdings-table--mf">
              <caption className="sr-only">Mutual fund holdings with current NAV and performance</caption>
              <colgroup>
                <col style={{ width: '30%' }} />  {/* Scheme */}
                <col style={{ width: '8%' }} />   {/* Units */}
                <col style={{ width: '9%' }} />   {/* Buy NAV */}
                <col style={{ width: '9%' }} />   {/* Current NAV */}
                <col style={{ width: '11%' }} />  {/* Invested */}
                <col style={{ width: '12%' }} />  {/* Current Value */}
                <col style={{ width: '11%' }} />  {/* P&L */}
                <col style={{ width: '9%' }} />  {/* P&L % */}
                <col style={{ width: '9%' }} />  {/* XIRR */}
              </colgroup>
              <thead>
                <tr>
                  <SortTh col="symbol" label="Scheme" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="qty" label="Units" className="right col-day-change" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="buyNAV" label="Buy NAV" className="right col-buy-price" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <th className="right col-nav" title="Latest AMFI NAV and its publication date">
                    Current NAV
                  </th>
                  <SortTh col="invested" label="Invested" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="currentValue" label="Current Value" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <th className="right">P&amp;L</th>
                  <SortTh col="pnlPct" label="P&amp;L %" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="xirr" label="XIRR" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows count={funds.length || 3} cols={9} />
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="filter-no-results">No holdings match "{filter}"</td>
                  </tr>
                ) : (
                  sorted.map((f) => (
                    <FundRow
                      key={f.id}
                      fund={f}
                      xirr={xirrById.get(f.id)}
                      onOpenDetail={setDetailFund}
                    />
                  ))
                )}
              </tbody>
            </table>

            {loading ? (
              <HoldingCardSkeleton count={funds.length || 3} />
            ) : sorted.length === 0 ? (
              <HoldingCardsEmpty message={`No holdings match "${filter}"`} />
            ) : (
              <div className="holding-cards">
                {sorted.map((f) => (
                  <MutualFundCard
                    key={f.id}
                    fund={f}
                    onEdit={setEditFund}
                    onDelete={setDeleteFund}
                    onOpenDetail={setDetailFund}
                  />
                ))}
              </div>
            )}
          </div>

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

      <MutualFundDetailModal
        fund={detailFund}
        open={!!detailFund}
        onClose={() => setDetailFund(null)}
        onEdit={setEditFund}
        onDelete={setDeleteFund}
        lastUpdated={lastUpdated}
        showToast={showToast}
      />
    </div>
  )
}
