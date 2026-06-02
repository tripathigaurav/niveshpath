import { useState, useMemo } from 'react'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import SkeletonRows from './SkeletonRows'
import PnlBadge from './PnlBadge'
import { formatUSD, formatINR, formatChange, formatDate } from '../utils/formatters'
import { calcUsPnl } from '../utils/pnl'
import { USStockCard, HoldingCardSkeleton, HoldingCardsEmpty } from './HoldingCards'

const COL_SPAN = 8

const getSortVal = (stock, key) => {
  switch (key) {
    case 'symbol': return stock.symbol
    case 'pnlPct': return calcUsPnl(stock).pnlPct
    case 'currentValue': return stock.currentPrice != null ? stock.qty * stock.currentPrice : null
    case 'invested': return stock.qty * stock.buyPrice
    case 'buyPrice': return stock.buyPrice
    case 'qty': return stock.qty
    default: return stock[key]
  }
}

function StockRow({ stock, usdInr, showInr, onEdit, onDelete, showEtfBadge }) {
  const [expanded, setExpanded] = useState(false)
  const { investedUSD, currentUSD, pnlUSD, pnlPct } = calcUsPnl(stock)
  const rowCls = pnlUSD == null ? 'row-neutral' : pnlUSD > 0 ? 'row-gain' : 'row-loss'
  const fx = showInr && usdInr ? usdInr : null
  const fmt = fx ? formatINR : (v) => formatUSD(v)
  const conv = (usd) => (usd != null ? (fx ? usd * fx : usd) : null)

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
          <div className="cell-company-symbol" title={stock.name}>
            {stock.symbol}
            {showEtfBadge && stock.isEtf && (
              <span className="us-etf-badge in-etf-badge" title="Exchange-traded fund">ETF</span>
            )}
          </div>
          <div className="cell-company-name">{stock.name}</div>
        </td>
        <td className="right mono">{stock.qty.toLocaleString('en-US')}</td>
        <td className="right mono col-buy-price">{fmt(conv(stock.buyPrice))}</td>
        <td className="right mono">
          {stock.currentPrice != null ? (
            <span className="fw-600">{fmt(conv(stock.currentPrice))}</span>
          ) : (
            <span className="text-3">—</span>
          )}
        </td>
        <td className="right mono">{fmt(conv(investedUSD))}</td>
        <td className="right mono">
          {currentUSD != null ? fmt(conv(currentUSD)) : <span className="text-3">—</span>}
        </td>
        <td className="right">
          {pnlUSD != null ? (
            <span className={pnlUSD >= 0 ? 'text-gain' : 'text-loss'}>
              {fx ? formatChange(pnlUSD * fx) : formatChange(pnlUSD, 'USD')}
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
          <td colSpan={COL_SPAN}>
            <div className="row-details">
              <div className="row-details-meta">
                {stock.buyDate && (
                  <div className="row-details-meta-item">
                    Buy Date: <span>{formatDate(stock.buyDate)}</span>
                  </div>
                )}
                <div className="row-details-meta-item">
                  Invested: <span>{fx ? formatINR(investedUSD * fx) : formatUSD(investedUSD)}</span>
                </div>
              </div>
              <div className="row-details-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); onEdit(stock) }}
                >
                  Edit
                </button>
                <button
                  type="button"
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

/**
 * One holdings table block (Stocks, ESPP, or RSU).
 */
export default function USHoldingsSection({
  title,
  subtitle,
  holdings,
  loading,
  filter,
  usdInr,
  showInr,
  showEtfBadge = false,
  emptyMessage,
  onAdd,
  addLabel,
  onEdit,
  onDelete,
}) {
  const filtered = useMemo(() => {
    if (!filter) return holdings
    const q = filter.toLowerCase()
    return holdings.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [holdings, filter])

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    filtered, 'currentValue', 'desc', getSortVal
  )

  const priceLabel = showInr && usdInr ? 'Buy Price (₹)' : 'Buy Price ($)'
  const cmpLabel = showInr && usdInr ? 'CMP (₹)' : 'CMP (USD)'
  const pnlLabel = showInr && usdInr ? 'P&L (₹)' : 'P&L (USD)'

  return (
    <section className="us-holdings-section">
      <div className="us-section-head">
        <div>
          <h3 className="us-section-title">{title}</h3>
          {subtitle && <p className="us-section-subtitle">{subtitle}</p>}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAdd}>
          {addLabel}
        </button>
      </div>

      {holdings.length === 0 ? (
        <div className="us-section-empty">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="us-section-table">
          <div className="table-scroll">
            <table className="holdings-table holdings-table--us">
              <caption className="sr-only">{title} holdings</caption>
              <colgroup>
                <col style={{ width: '24%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr>
                  <SortTh col="symbol" label="Company" className="cell-company" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="qty" label="Qty" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="buyPrice" label={priceLabel} className="right col-buy-price" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <th className="right">{cmpLabel}</th>
                  <SortTh col="invested" label="Invested" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="currentValue" label="Networth" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <th className="right">{pnlLabel}</th>
                  <SortTh col="pnlPct" label="P&amp;L %" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows count={holdings.length || 2} cols={COL_SPAN} />
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={COL_SPAN} className="filter-no-results">
                      No holdings match &quot;{filter}&quot;
                    </td>
                  </tr>
                ) : (
                  sorted.map((s) => (
                    <StockRow
                      key={s.id}
                      stock={s}
                      usdInr={usdInr}
                      showInr={showInr}
                      showEtfBadge={showEtfBadge}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </tbody>
            </table>

            {loading ? (
              <HoldingCardSkeleton count={holdings.length || 2} />
            ) : sorted.length === 0 ? (
              <HoldingCardsEmpty message={`No holdings match "${filter}"`} />
            ) : (
              <div className="holding-cards">
                {sorted.map((s) => (
                  <USStockCard
                    key={s.id}
                    stock={s}
                    usdInr={usdInr}
                    showEtfBadge={showEtfBadge}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
