import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useOtherAssets } from '../hooks/usePortfolio'
import AddOtherAssetModal, { ASSET_TYPES } from './AddOtherAssetModal'
import ConfirmDialog from './ConfirmDialog'
import PnlBadge from './PnlBadge'
import { formatINR, formatPct, formatChange, formatDate } from '../utils/formatters'
import { calcOtherPnl, calcTotals } from '../utils/pnl'
import { useSortable } from '../hooks/useSortable'

const TYPE_LABEL = Object.fromEntries(ASSET_TYPES.map((t) => [t.value, t.label]))

function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <span className="sort-icon neutral">⇅</span>
  return <span className="sort-icon active">{sortDir === 'asc' ? '▲' : '▼'}</span>
}

const getSortVal = (asset, key) => {
  switch (key) {
    case 'symbol': return asset.name
    case 'pnlPct': return calcOtherPnl(asset).pnlPct
    case 'currentValue': return asset.currentValue
    case 'invested': return asset.investedAmount
    default: return asset[key]
  }
}

function AssetRow({ asset, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { pnl, pnlPct } = calcOtherPnl(asset)
  const rowCls = pnl == null ? 'row-neutral' : pnl > 0 ? 'row-gain' : 'row-loss'

  return (
    <>
      <tr className={rowCls} onClick={() => setExpanded((v) => !v)}>
        <td><div className="fw-600 fs-13">{asset.name}</div></td>
        <td>
          <span className="asset-type-badge">{TYPE_LABEL[asset.type] ?? asset.type}</span>
        </td>
        <td className="right mono">{formatINR(asset.investedAmount)}</td>
        <td className="right mono">
          {asset.currentValue != null ? (
            <span className="fw-600">{formatINR(asset.currentValue)}</span>
          ) : (
            <span className="text-3">—</span>
          )}
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
      </tr>
      {expanded && (
        <tr className="expanded-row">
          <td colSpan={6}>
            <div className="row-details">
              <div className="row-details-meta">
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
              <div className="row-details-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); onEdit(asset) }}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(asset) }}
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
        <rect x="10" y="18" width="60" height="50" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="20" y="30" width="20" height="20" rx="4" fill="var(--blue)" opacity="0.2" stroke="var(--blue)" strokeWidth="1.5" />
        <rect x="46" y="30" width="14" height="8" rx="3" fill="var(--green)" opacity="0.5" />
        <rect x="46" y="42" width="10" height="8" rx="3" fill="var(--border)" />
        <text x="30" y="44" textAnchor="middle" fontSize="12" fill="var(--blue)" fontWeight="700">₹</text>
      </svg>
      <h3>No other assets yet</h3>
      <p>Track FDs, PPF, EPF, NPS, Real Estate, Gold, and more with manual entry.</p>
      <button className="btn btn-primary" onClick={onAdd}>
        + Add Your First Asset
      </button>
    </div>
  )
}

export default function OtherAssets({ showToast }) {
  const { assets, addAsset, removeAsset, updateAsset } = useOtherAssets()

  const [showAdd, setShowAdd] = useState(false)
  const [editAsset, setEditAsset] = useState(null)
  const [deleteAsset, setDeleteAsset] = useState(null)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return assets
    const q = filter.toLowerCase()
    return assets.filter(
      (a) => a.name.toLowerCase().includes(q) || (TYPE_LABEL[a.type] ?? a.type).toLowerCase().includes(q)
    )
  }, [assets, filter])

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    filtered, 'currentValue', 'desc', getSortVal
  )

  const totals = useMemo(
    () => calcTotals(assets, { investedKey: 'investedAmount', currentKey: 'currentValue' }),
    [assets]
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
      addAsset(data)
      setShowAdd(false)
      showToast('Asset added', 'success')
    },
    [addAsset, showToast]
  )

  const handleEdit = useCallback(
    (data) => {
      updateAsset(editAsset.id, data)
      setEditAsset(null)
      showToast('Asset updated', 'success')
    },
    [editAsset, updateAsset, showToast]
  )

  const handleDelete = useCallback(() => {
    removeAsset(deleteAsset.id)
    setDeleteAsset(null)
    showToast(`"${deleteAsset.name}" removed`, 'info')
  }, [deleteAsset, removeAsset, showToast])

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
          <div className="section-title">Other Assets</div>
          <div className="section-subtitle">
            {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="section-header-right">
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add Asset
          </button>
        </div>
      </div>

      {assets.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="table-wrap">
          <div className="table-filter-bar">
            <div className="filter-input-wrap">
              <input
                className="filter-input"
                type="text"
                placeholder="Filter assets…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter assets"
              />
              {filter && (
                <button className="filter-clear" onClick={() => setFilter('')} aria-label="Clear filter">×</button>
              )}
            </div>
            {filter && (
              <span className="filter-count" aria-live="polite">{filtered.length} of {assets.length}</span>
            )}
          </div>

          <div className="table-scroll">
            <table>
              <caption className="sr-only">Other asset holdings with current value and performance</caption>
              <thead>
                <tr>
                  <SortTh col="symbol">Asset</SortTh>
                  <th>Type</th>
                  <SortTh col="invested" className="right">Invested</SortTh>
                  <SortTh col="currentValue" className="right">Current Value</SortTh>
                  <th className="right">Gain / Loss</th>
                  <SortTh col="pnlPct" className="right">Return %</SortTh>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="filter-no-results">No assets match "{filter}"</td>
                  </tr>
                ) : (
                  sorted.map((a) => (
                    <AssetRow
                      key={a.id}
                      asset={a}
                      onEdit={setEditAsset}
                      onDelete={setDeleteAsset}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={`table-summary${summaryClass}`}>
            <div className="table-summary-item">
              <span className="label">Total Invested</span>
              <span className="value">{formatINR(totals.totalInvested)}</span>
            </div>
            {totals.totalCurrent != null && (
              <>
                <div className="table-summary-item">
                  <span className="label">Known Current Value</span>
                  <span className="value">{formatINR(totals.totalCurrent)}</span>
                </div>
                <div className="table-summary-item">
                  <span className="label">Gain / Loss</span>
                  <span className={`value pnl-value${pulsing ? ' pnl-pulse' : ''} ${totals.totalPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {formatChange(totals.totalPnl)} ({formatPct(totals.totalPnlPct)})
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <AddOtherAssetModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editAsset && (
        <AddOtherAssetModal
          initial={editAsset}
          onSave={handleEdit}
          onClose={() => setEditAsset(null)}
        />
      )}
      {deleteAsset && (
        <ConfirmDialog
          title="Remove Asset"
          message={`Remove "${deleteAsset.name}" from your portfolio?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteAsset(null)}
        />
      )}
    </div>
  )
}
