import { useState } from 'react'
import { formatINR, formatUSD, formatPct, formatChange, formatDate, formatNumber } from '../utils/formatters'
import { calcPnl, calcUsPnl, calcMfPnl, calcOtherPnl, calcIndianStockMetrics, pnlColorClass } from '../utils/pnl'

function CardActions({ onEdit, onDelete, item }) {
  return (
    <div className="row-details-actions">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={(e) => { e.stopPropagation(); onEdit(item) }}
      >
        Edit
      </button>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={(e) => { e.stopPropagation(); onDelete(item) }}
      >
        Delete
      </button>
    </div>
  )
}

export function HoldingCardSkeleton({ count = 4 }) {
  return (
    <div className="holding-cards" aria-busy="true" aria-label="Loading holdings">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="holding-card holding-card-skeleton">
          <div className="holding-card-row">
            <span className="skeleton skeleton-cell" style={{ width: 100, height: 14 }} />
            <span className="skeleton skeleton-cell" style={{ width: 72, height: 14 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function HoldingCardsEmpty({ message }) {
  return (
    <div className="holding-cards">
      <div className="holding-cards-empty">{message}</div>
    </div>
  )
}

export function IndianStockCard({ stock, onEdit, onDelete, showEtfBadge = true }) {
  const [expanded, setExpanded] = useState(false)
  const m = calcIndianStockMetrics(stock)

  return (
    <div
      className="holding-card"
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v) } }}
      role="button"
      tabIndex={0}
    >
      <div className="holding-card-row">
        <div className="holding-card-left">
          <div className="holding-card-symbol">
            {stock.symbol}
            {showEtfBadge && stock.isEtf && (
              <span className="us-etf-badge us-etf-badge--card in-etf-badge">ETF</span>
            )}
          </div>
          <div className="holding-card-name">{stock.name}</div>
        </div>
        <div>
          <div className="holding-card-value">
            {m.current != null ? formatINR(m.current) : '—'}
          </div>
          <div className={`holding-card-sub ${pnlColorClass(m.pnl)}`}>
            {m.pnl != null ? `Notional ${formatChange(m.pnl)} (${formatPct(m.pnlPct)})` : '—'}
          </div>
          {m.todayPnl != null && (
            <div className={`holding-card-sub ${pnlColorClass(m.todayPnl)}`}>
              Today {formatChange(m.todayPnl)}
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="holding-card-details" onClick={(e) => e.stopPropagation()}>
          <div className="row-details-meta">
            <div className="row-details-meta-item">
              LTP: <span>{m.ltp != null ? formatINR(m.ltp) : '—'}</span>
            </div>
            <div className="row-details-meta-item">
              Qty: <span>{stock.qty.toLocaleString('en-IN')}</span>
            </div>
            <div className="row-details-meta-item">
              Avg. Cost: <span>{formatINR(stock.buyPrice)}</span>
            </div>
            <div className="row-details-meta-item">
              Invested: <span>{formatINR(m.invested)}</span>
            </div>
            {stock.buyDate && (
              <div className="row-details-meta-item">
                Buy Date: <span>{formatDate(stock.buyDate)}</span>
              </div>
            )}
            {m.dayChangePerShare != null && (
              <div className="row-details-meta-item">
                Day Change:{' '}
                <span className={pnlColorClass(m.dayChangePerShare)}>
                  {formatChange(m.dayChangePerShare)} ({formatPct(m.dayChangePct)})
                </span>
              </div>
            )}
          </div>
          <CardActions onEdit={onEdit} onDelete={onDelete} item={stock} />
        </div>
      )}
    </div>
  )
}

export function USStockCard({ stock, usdInr, onEdit, onDelete, showEtfBadge = false }) {
  const [expanded, setExpanded] = useState(false)
  const { investedUSD, currentUSD, pnlUSD, pnlPct } = calcUsPnl(stock)
  const toINR = (usd) => (usdInr && usd != null ? usd * usdInr : null)

  return (
    <div
      className="holding-card"
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v) } }}
      role="button"
      tabIndex={0}
    >
      <div className="holding-card-row">
        <div className="holding-card-left">
          <div className="holding-card-symbol">
            {stock.symbol}
            {showEtfBadge && stock.isEtf && (
              <span className="us-etf-badge us-etf-badge--card">ETF</span>
            )}
          </div>
          <div className="holding-card-name">{stock.name}</div>
        </div>
        <div>
          <div className="holding-card-value">
            {currentUSD != null ? formatUSD(currentUSD) : '—'}
          </div>
          <div className={`holding-card-sub ${pnlUSD != null ? (pnlUSD >= 0 ? 'text-gain' : 'text-loss') : ''}`}>
            {pnlUSD != null ? `${formatChange(pnlUSD, 'USD')} (${formatPct(pnlPct)})` : '—'}
          </div>
          {usdInr && currentUSD != null && (
            <div className="holding-card-sub">{formatINR(toINR(currentUSD))}</div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="holding-card-details" onClick={(e) => e.stopPropagation()}>
          <div className="row-details-meta">
            <div className="row-details-meta-item">
              Qty: <span>{stock.qty.toLocaleString('en-US')}</span>
            </div>
            <div className="row-details-meta-item">
              Buy: <span>{formatUSD(stock.buyPrice)}</span>
            </div>
            <div className="row-details-meta-item">
              Invested: <span>{formatUSD(investedUSD)}</span>
            </div>
            {usdInr && (
              <div className="row-details-meta-item">
                USD/INR: <span>₹{usdInr.toFixed(2)}</span>
              </div>
            )}
          </div>
          <CardActions onEdit={onEdit} onDelete={onDelete} item={stock} />
        </div>
      )}
    </div>
  )
}

export function MutualFundCard({ fund, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { invested, current, pnl, pnlPct } = calcMfPnl(fund)

  return (
    <div
      className="holding-card"
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v) } }}
      role="button"
      tabIndex={0}
    >
      <div className="holding-card-row">
        <div className="holding-card-left holding-card-left--mf">
          <div className="holding-card-symbol holding-card-scheme-name" title={fund.schemeName}>
            {fund.schemeName}
          </div>
          <div className="holding-card-name">Code: {fund.schemeCode}</div>
        </div>
        <div>
          <div className="holding-card-value">
            {current != null ? formatINR(current) : '—'}
          </div>
          <div className={`holding-card-sub ${pnl != null ? (pnl >= 0 ? 'text-gain' : 'text-loss') : ''}`}>
            {pnl != null ? `${formatChange(pnl)} (${formatPct(pnlPct)})` : '—'}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="holding-card-details" onClick={(e) => e.stopPropagation()}>
          <div className="row-details-meta">
            <div className="row-details-meta-item">
              Units: <span>{formatNumber(fund.units, 3)}</span>
            </div>
            <div className="row-details-meta-item">
              Buy NAV: <span>{formatINR(fund.buyNAV)}</span>
            </div>
            <div className="row-details-meta-item">
              Invested: <span>{formatINR(invested)}</span>
            </div>
          </div>
          <CardActions onEdit={onEdit} onDelete={onDelete} item={fund} />
        </div>
      )}
    </div>
  )
}

export function OtherAssetCard({ asset, typeLabel, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { pnl, pnlPct } = calcOtherPnl(asset)

  return (
    <div
      className="holding-card"
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v) } }}
      role="button"
      tabIndex={0}
    >
      <div className="holding-card-row">
        <div className="holding-card-left">
          <div className="holding-card-symbol">{asset.name}</div>
          <div className="holding-card-name">{typeLabel}</div>
        </div>
        <div>
          <div className="holding-card-value">
            {asset.currentValue != null ? formatINR(asset.currentValue) : '—'}
          </div>
          <div className={`holding-card-sub ${pnl != null ? (pnl >= 0 ? 'text-gain' : 'text-loss') : ''}`}>
            {pnl != null ? `${formatChange(pnl)} (${formatPct(pnlPct)})` : '—'}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="holding-card-details" onClick={(e) => e.stopPropagation()}>
          <div className="row-details-meta">
            <div className="row-details-meta-item">
              Invested: <span>{formatINR(asset.investedAmount)}</span>
            </div>
            {asset.addedDate && (
              <div className="row-details-meta-item">
                Date: <span>{formatDate(asset.addedDate)}</span>
              </div>
            )}
            {asset.notes && (
              <div className="row-details-meta-item">
                Notes: <span>{asset.notes}</span>
              </div>
            )}
          </div>
          <CardActions onEdit={onEdit} onDelete={onDelete} item={asset} />
        </div>
      )}
    </div>
  )
}
