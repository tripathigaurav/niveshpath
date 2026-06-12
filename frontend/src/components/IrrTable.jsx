import { useMemo, useCallback } from 'react'
import { formatXirrDisplay } from '../utils/xirrMetrics'
import { pnlColorClass } from '../utils/pnl'
import {
  irrFootnote,
  irrInsufficientTooltip,
  irrWindowedColumnsHint,
  irrWindowedUnavailableMessage,
} from '../utils/holdingTabMessages'
import { isWindowedIrrIncomplete } from '../utils/xirrWindowed'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import SkeletonRows from './SkeletonRows'

function IrrCell({ rate, assetType }) {
  if (rate == null) {
    return (
      <span className="text-3 irr-insufficient" title={irrInsufficientTooltip(assetType)}>
        N/A
      </span>
    )
  }
  return (
    <span className={pnlColorClass(rate)}>
      {formatXirrDisplay(rate)}
    </span>
  )
}

export default function IrrTable({
  holdings,
  assetType,
  windowedXirr,
  loading,
  loadError = null,
  onRetry = null,
  formatPrice,
  getQty,
  getLabel,
  getPrice,
  usdInr = null,
}) {
  const isMf = assetType === 'mutualFund'
  const nameCol = isMf ? 'Scheme' : 'Company'
  const priceCol = isMf ? 'NAV' : 'LTP'
  const qtyCol = isMf ? 'Units' : 'Qty'

  const rows = useMemo(
    () =>
      holdings.map((h) => ({
        ...h,
        _irr: windowedXirr.get(h.id) || {},
      })),
    [holdings, windowedXirr]
  )

  const getSortVal = useCallback(
    (h, key) => {
      const irr = h._irr || {}
      switch (key) {
        case 'symbol':
          return getLabel(h)
        case 'price':
          return getPrice(h)
        case 'qty':
          return getQty(h)
        case 'irr90':
          return irr.irr90
        case 'irr365':
          return irr.irr365
        case 'irrSinceApr':
          return irr.irrSinceApr
        case 'irrTotal':
          return irr.irrTotal
        default:
          return h[key]
      }
    },
    [getLabel, getPrice, getQty]
  )

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    rows,
    'irrTotal',
    'desc',
    getSortVal,
    `irr-${assetType}`
  )

  const windowedIncomplete = useMemo(
    () => !loading && isWindowedIrrIncomplete(windowedXirr, holdings),
    [loading, windowedXirr, holdings]
  )

  return (
    <div className="irr-table-wrap">
      {!loading && windowedIncomplete && (
        <div className="holdings-data-issue holdings-data-issue--info irr-windowed-notice" role="status">
          <div className="holdings-data-issue-body">
            <span className="holdings-data-issue-icon" aria-hidden="true">i</span>
            <div className="holdings-data-issue-text">
              <strong className="holdings-data-issue-title">Windowed IRR needs historical prices</strong>
              <p className="holdings-data-issue-message">
                {irrWindowedUnavailableMessage(assetType)}
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              className="btn btn-secondary btn-sm holdings-data-issue-retry"
              onClick={onRetry}
            >
              ↻ Retry
            </button>
          )}
        </div>
      )}
      <p className="irr-columns-hint text-muted-sm">{irrWindowedColumnsHint(assetType)}</p>
    <div className="table-scroll">
      <table className="holdings-table holdings-table--irr">
        <caption className="sr-only">Windowed IRR by holding</caption>
        <thead>
          <tr>
            <SortTh col="symbol" label={nameCol} className="cell-company" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            <SortTh col="price" label={priceCol} className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            <SortTh col="qty" label={qtyCol} className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            <SortTh col="irr90" label="Last 90 Days" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            <SortTh col="irr365" label="Last 365 Days" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            <SortTh col="irrSinceApr" label="Since 1st April" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            <SortTh col="irrTotal" label="Total Holding Period" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows count={holdings.length || 4} cols={7} />
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={7} className="filter-no-results">No holdings to show</td>
            </tr>
          ) : (
            sorted.map((h) => {
              const irr = h._irr || {}
              const price = getPrice(h)
              const qty = getQty(h)
              return (
                <tr key={h.id}>
                  <td className="cell-company">
                    <div className="cell-company-symbol">{getLabel(h)}</div>
                    {!isMf && h.name && h.name !== h.symbol && (
                      <div className="cell-company-name">{h.name}</div>
                    )}
                    {!isMf && h.isEtf && (
                      <span className="us-etf-badge in-etf-badge" title="Exchange-traded fund">ETF</span>
                    )}
                  </td>
                  <td className="right mono">
                    {price != null ? formatPrice(price) : <span className="text-3">—</span>}
                  </td>
                  <td className="right mono">{qty != null ? qty.toLocaleString('en-IN') : '—'}</td>
                  <td className="right"><IrrCell rate={irr.irr90} assetType={assetType} /></td>
                  <td className="right"><IrrCell rate={irr.irr365} assetType={assetType} /></td>
                  <td className="right"><IrrCell rate={irr.irrSinceApr} assetType={assetType} /></td>
                  <td className="right"><IrrCell rate={irr.irrTotal} assetType={assetType} /></td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      {!loading && loadError && !windowedIncomplete && (
        <p className="irr-footnote irr-footnote--warn text-muted-sm" role="status">
          {loadError} Windowed columns need recent price history — tap Retry on this tab.
        </p>
      )}
      {!loading && (
        <p className="irr-footnote text-muted-sm">
          {irrFootnote(assetType, { usdInr })}
        </p>
      )}
    </div>
    </div>
  )
}
