import { useCallback } from 'react'
import { useScreener } from '../hooks/useScreener'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import SkeletonRows from './SkeletonRows'
import { pnlColorClass } from '../utils/pnl'

const QUICK_FILTERS = [
  { label: 'High Dividend (>3%)', key: 'divYieldMin', value: '3' },
  { label: 'Low P/E (<15)', key: 'peMax', value: '15' },
]

function formatMCap(v) {
  if (v == null) return '—'
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`
  return v.toLocaleString()
}

function getSortVal(row, key) {
  switch (key) {
    case 'symbol': return row.symbol
    case 'name': return row.name
    case 'ltp': return row.ltp
    case 'pe': return row.pe
    case 'eps': return row.eps
    case 'divYield': return row.dividendYield
    case 'marketCap': return row.marketCap
    case 'sector': return row.sector
    case 'yearHigh': return row.yearHigh
    case 'yearLow': return row.yearLow
    case 'pnlPct': return row.pnlPct
    default: return row[key]
  }
}

export default function StockScreener() {
  const { data, allData, loading, error, refresh, filters, setFilters, sectors } = useScreener()
  const { sorted, sortKey, sortDir, setSort } = useSortable(data, 'symbol', 'asc', getSortVal, 'screener')

  const setFilter = useCallback(
    (key, value) => setFilters((prev) => ({ ...prev, [key]: value })),
    [setFilters]
  )

  const applyQuick = useCallback(
    (q) => setFilters((prev) => ({ ...prev, [q.key]: prev[q.key] === q.value ? '' : q.value })),
    [setFilters]
  )

  const resetFilters = useCallback(
    () => setFilters({ peMin: '', peMax: '', divYieldMin: '', marketCap: '', sector: '', exchange: 'all' }),
    [setFilters]
  )

  if (!allData.length && !loading && !error) {
    return (
      <div className="screener-empty">
        <p className="text-2">Add stocks to your portfolio to screen them.</p>
      </div>
    )
  }

  if (error && !allData.length) {
    return (
      <div className="screener-empty">
        <p className="text-2" style={{ color: 'var(--red)' }}>{error}</p>
        <button className="btn btn-sm btn-secondary" onClick={refresh} style={{ marginTop: 8 }}>Retry</button>
      </div>
    )
  }

  return (
    <div className="screener">
      <div className="screener-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select
          className="form-input"
          style={{ width: 'auto' }}
          value={filters.exchange}
          onChange={(e) => setFilter('exchange', e.target.value)}
          aria-label="Exchange filter"
        >
          <option value="all">All Exchanges</option>
          <option value="indian">Indian</option>
          <option value="us">US</option>
        </select>

        <input
          type="number"
          className="form-input"
          style={{ width: 80 }}
          placeholder="P/E min"
          value={filters.peMin}
          onChange={(e) => setFilter('peMin', e.target.value)}
          aria-label="Minimum P/E"
        />
        <input
          type="number"
          className="form-input"
          style={{ width: 80 }}
          placeholder="P/E max"
          value={filters.peMax}
          onChange={(e) => setFilter('peMax', e.target.value)}
          aria-label="Maximum P/E"
        />
        <input
          type="number"
          className="form-input"
          style={{ width: 90 }}
          placeholder="Div ≥ %"
          value={filters.divYieldMin}
          onChange={(e) => setFilter('divYieldMin', e.target.value)}
          aria-label="Minimum dividend yield"
        />

        <select
          className="form-input"
          style={{ width: 'auto' }}
          value={filters.marketCap}
          onChange={(e) => setFilter('marketCap', e.target.value)}
          aria-label="Market cap filter"
        >
          <option value="">All Caps</option>
          <option value="large">Large Cap</option>
          <option value="mid">Mid Cap</option>
          <option value="small">Small Cap</option>
        </select>

        {sectors.length > 0 && (
          <select
            className="form-input"
            style={{ width: 'auto', maxWidth: 160 }}
            value={filters.sector}
            onChange={(e) => setFilter('sector', e.target.value)}
            aria-label="Sector filter"
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
          Reset
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {QUICK_FILTERS.map((q) => (
          <button
            key={q.label}
            type="button"
            className={`btn btn-sm ${filters[q.key] === q.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => applyQuick(q)}
          >
            {q.label}
          </button>
        ))}
      </div>

      {error && <p className="text-2" style={{ color: 'var(--red)' }}>{error}</p>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <SortTh col="symbol" label="Symbol" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="ltp" label="LTP" className="num" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="pe" label="P/E" className="num" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="eps" label="EPS" className="num" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="divYield" label="Div %" className="num" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="marketCap" label="Mkt Cap" className="num" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="sector" label="Sector" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="yearHigh" label="52W High" className="num" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="yearLow" label="52W Low" className="num" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <SortTh col="pnlPct" label="P&amp;L %" className="num" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={10} count={8} />
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)' }}>
                  No stocks match current filters.{' '}
                  <button className="btn btn-sm btn-secondary" onClick={resetFilters}>Reset filters</button>
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={`${row.assetType}-${row.symbol}`}>
                  <td>
                    <strong>{row.symbol}</strong>
                    <div className="text-3" style={{ fontSize: 11 }}>{row.name}</div>
                  </td>
                  <td className="num">{row.ltp != null ? row.ltp.toFixed(2) : '—'}</td>
                  <td className="num">{row.pe != null ? row.pe.toFixed(1) : '—'}</td>
                  <td className="num">{row.eps != null ? row.eps.toFixed(2) : '—'}</td>
                  <td className="num">{row.dividendYield != null ? row.dividendYield.toFixed(2) + '%' : '—'}</td>
                  <td className="num">{formatMCap(row.marketCap)}</td>
                  <td>{row.sector || '—'}</td>
                  <td className="num">{row.yearHigh != null ? row.yearHigh.toFixed(2) : '—'}</td>
                  <td className="num">{row.yearLow != null ? row.yearLow.toFixed(2) : '—'}</td>
                  <td className={`num ${pnlColorClass(row.pnlPct)}`}>
                    {row.pnlPct != null ? `${row.pnlPct >= 0 ? '+' : ''}${row.pnlPct.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-3" style={{ marginTop: 8, fontSize: 12 }}>
        Showing {sorted.length} of {allData.length} holdings
      </div>
    </div>
  )
}
