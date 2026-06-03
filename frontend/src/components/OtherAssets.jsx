import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useOtherAssets } from '../hooks/usePortfolio'
import AddOtherAssetModal, { ASSET_TYPES } from './AddOtherAssetModal'
import ConfirmDialog from './ConfirmDialog'
import PnlBadge from './PnlBadge'
import { formatINR, formatPct, formatChange } from '../utils/formatters'
import { calcOtherPnl, calcTotals } from '../utils/pnl'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import FilterBar from './FilterBar'
import SummaryBar from './SummaryBar'
import OtherAssetDetailModal from './OtherAssetDetailModal'
import {
  OtherAssetCard,
  HoldingCardsEmpty,
} from './HoldingCards'

const TYPE_LABEL = Object.fromEntries(ASSET_TYPES.map((t) => [t.value, t.label]))

const getSortVal = (asset, key) => {
  switch (key) {
    case 'symbol': return asset.name
    case 'pnlPct': return calcOtherPnl(asset).pnlPct
    case 'currentValue': return asset.currentValue
    case 'invested': return asset.investedAmount
    default: return asset[key]
  }
}

function AssetRow({ asset, onOpenDetail }) {
  const { pnl, pnlPct } = calcOtherPnl(asset)
  const rowCls = pnl == null ? 'row-neutral' : pnl > 0 ? 'row-gain' : 'row-loss'

  return (
      <tr
        className={`${rowCls} holdings-row--clickable`}
        onClick={() => onOpenDetail(asset)}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenDetail(asset)
          }
        }}
      >
        <td><div className="fw-600 fs-13">{asset.name}</div></td>
        <td className="col-day-change">
          <span className="asset-type-badge">{TYPE_LABEL[asset.type] ?? asset.type}</span>
        </td>
        <td className="right mono col-buy-price">{formatINR(asset.investedAmount)}</td>
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
  const [detailAsset, setDetailAsset] = useState(null)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return assets
    const q = filter.toLowerCase()
    return assets.filter(
      (a) => a.name.toLowerCase().includes(q) || (TYPE_LABEL[a.type] ?? a.type).toLowerCase().includes(q)
    )
  }, [assets, filter])

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    filtered, 'currentValue', 'desc', getSortVal, 'other'
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

  return (
    <div className="page page--category">
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
        <div className="category-holdings-panel">
          <SummaryBar variant="elevated" metrics={[
            {
              label: 'Investments',
              value: formatINR(totals.totalInvested, true),
              sub: formatINR(totals.totalInvested),
            },
            {
              label: 'Current Value',
              value: totals.totalCurrent != null ? formatINR(totals.totalCurrent, true) : '—',
              sub: totals.totalCurrent != null ? formatINR(totals.totalCurrent) : 'Update assets to see value',
            },
            {
              label: 'Gain / Loss',
              value: totals.totalPnl != null ? formatINR(totals.totalPnl, true) : '—',
              sub: totals.totalPnl != null
                ? `${formatChange(totals.totalPnl)} (${formatPct(totals.totalPnlPct)})`
                : null,
              colorClass: totals.totalPnl != null ? (totals.totalPnl >= 0 ? 'text-gain' : 'text-loss') : '',
              accent: totals.totalPnl != null ? (totals.totalPnl >= 0 ? 'gain' : 'loss') : null,
              pulse: pulsing,
            },
          ]} />

          <FilterBar
            value={filter}
            onChange={setFilter}
            total={assets.length}
            filtered={filtered.length}
            placeholder="Filter assets…"
          />

          <div className="table-scroll">
            <table className="holdings-table">
              <caption className="sr-only">Other asset holdings with current value and performance</caption>
              <thead>
                <tr>
                  <SortTh col="symbol" label="Asset" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <th className="col-day-change">Type</th>
                  <SortTh col="invested" label="Invested" className="right col-buy-price" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <SortTh col="currentValue" label="Current Value" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
                  <th className="right">Gain / Loss</th>
                  <SortTh col="pnlPct" label="Return %" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
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
                      onOpenDetail={setDetailAsset}
                    />
                  ))
                )}
              </tbody>
            </table>

            {sorted.length === 0 ? (
              <HoldingCardsEmpty message={`No assets match "${filter}"`} />
            ) : (
              <div className="holding-cards">
                {sorted.map((a) => (
                  <OtherAssetCard
                    key={a.id}
                    asset={a}
                    typeLabel={TYPE_LABEL[a.type] ?? a.type}
                    onEdit={setEditAsset}
                    onDelete={setDeleteAsset}
                    onOpenDetail={setDetailAsset}
                  />
                ))}
              </div>
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

      <OtherAssetDetailModal
        asset={detailAsset}
        open={!!detailAsset}
        onClose={() => setDetailAsset(null)}
        onEdit={setEditAsset}
        onDelete={setDeleteAsset}
        showToast={showToast}
      />
    </div>
  )
}
