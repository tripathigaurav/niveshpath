import { useMemo, useRef, useState, useCallback } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { storage } from '../utils/storage'
import { calcIndianStockMetrics, calcUsPnl, calcMfPnl } from '../utils/pnl'
import { calculateRebalance, equalWeightTargets, currentWeightTargets } from '../utils/rebalancer'
import { formatINR } from '../utils/formatters'

const CATEGORIES = [
  { id: 'indianStocks', label: 'Indian Stocks', color: '#3b82f6' },
  { id: 'usStocks', label: 'US Stocks', color: '#8b5cf6' },
  { id: 'mutualFunds', label: 'Mutual Funds', color: '#06b6d4' },
  { id: 'otherAssets', label: 'Other Assets', color: '#f59e0b' },
]

function buildAllocations(usdInr) {
  const indStocks = storage.getIndianStocks()
  const usStocks = storage.getUSStocks()
  const mfs = storage.getMutualFunds()
  const others = storage.getOtherAssets()

  const inValue = indStocks.reduce((s, st) => {
    const m = calcIndianStockMetrics(st)
    return s + (m.current ?? m.invested)
  }, 0)

  const fx = usdInr || storage.getSettings().lastUsdInr || 83
  const usValue = usStocks.reduce((s, st) => {
    const m = calcUsPnl(st)
    return s + ((m.currentUSD ?? m.investedUSD) * fx)
  }, 0)

  const mfValue = mfs.reduce((s, f) => {
    const m = calcMfPnl(f)
    return s + (m.current ?? m.invested)
  }, 0)

  const otValue = others.reduce((s, a) => s + (a.currentValue ?? a.investedAmount ?? 0), 0)

  return [
    { id: 'indianStocks', label: 'Indian Stocks', currentValue: inValue },
    { id: 'usStocks', label: 'US Stocks', currentValue: usValue },
    { id: 'mutualFunds', label: 'Mutual Funds', currentValue: mfValue },
    { id: 'otherAssets', label: 'Other Assets', currentValue: otValue },
  ].filter((a) => a.currentValue > 0)
}

export default function RebalancingModal({ open, onClose, showToast, usdInr }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, open, onClose)

  const allocations = useMemo(() => (open ? buildAllocations(usdInr) : []), [open, usdInr])

  const [targets, setTargets] = useState(() => {
    const saved = storage.getRebalanceTargets()
    return saved.length ? saved : []
  })

  const activeTargets = useMemo(() => {
    if (targets.length && allocations.every((a) => targets.find((t) => t.id === a.id))) {
      return targets.filter((t) => allocations.find((a) => a.id === t.id))
    }
    return currentWeightTargets(allocations)
  }, [targets, allocations])

  const result = useMemo(
    () => calculateRebalance(allocations, activeTargets),
    [allocations, activeTargets]
  )

  const handleTargetChange = useCallback((id, val) => {
    const num = Math.max(0, Math.min(100, parseFloat(val) || 0))
    setTargets((prev) => {
      const base = prev.length ? prev : currentWeightTargets(allocations)
      const next = base.map((t) => (t.id === id ? { ...t, targetPct: num } : t))
      return next
    })
  }, [allocations])

  const handleEqualWeight = useCallback(() => {
    setTargets(equalWeightTargets(allocations.map((a) => a.id)))
  }, [allocations])

  const handleCurrentWeight = useCallback(() => {
    setTargets(currentWeightTargets(allocations))
  }, [allocations])

  const handleSave = useCallback(() => {
    storage.setRebalanceTargets(activeTargets)
    showToast?.('Rebalance targets saved', 'success')
  }, [activeTargets, showToast])

  if (!open) return null

  const totalTarget = activeTargets.reduce((s, t) => s + t.targetPct, 0)
  const isValid = Math.abs(totalTarget - 100) < 0.5

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rebal-title">
      <div className="modal modal--wide" ref={modalRef}>
        <div className="modal-header">
          <h2 id="rebal-title">Portfolio Rebalancing</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleEqualWeight}>
              Equal Weight
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCurrentWeight}>
              Current Weight
            </button>
          </div>

          {!isValid && (
            <p className="text-2" style={{ color: 'var(--red)', marginBottom: 12 }}>
              Targets sum to {totalTarget.toFixed(1)}% — adjust to reach 100%
            </p>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Current %</th>
                  <th style={{ textAlign: 'center' }}>Target %</th>
                  <th style={{ textAlign: 'right' }}>Current Value</th>
                  <th style={{ textAlign: 'right' }}>Target Value</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {result.actions.map((row) => {
                  const cat = CATEGORIES.find((c) => c.id === row.id)
                  const tgt = activeTargets.find((t) => t.id === row.id)
                  return (
                    <tr key={row.id}>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          width: 10, height: 10,
                          borderRadius: '50%',
                          background: cat?.color || 'var(--text-3)',
                          marginRight: 8,
                          verticalAlign: 'middle',
                        }} />
                        {row.label}
                      </td>
                      <td style={{ textAlign: 'right' }}>{row.currentPct.toFixed(1)}%</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={tgt?.targetPct ?? ''}
                          onChange={(e) => handleTargetChange(row.id, e.target.value)}
                          className="form-input"
                          style={{ width: 72, textAlign: 'center', padding: '4px 6px' }}
                          aria-label={`Target % for ${row.label}`}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatINR(row.currentValue, true)}</td>
                      <td style={{ textAlign: 'right' }}>{formatINR(row.targetValue, true)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {row.action === 'buy' && (
                          <span className="pnl-badge gain">Buy +{formatINR(row.delta, true)}</span>
                        )}
                        {row.action === 'sell' && (
                          <span className="pnl-badge loss">Sell {formatINR(row.delta, true)}</span>
                        )}
                        {row.action === 'hold' && (
                          <span className="pnl-badge neutral">On Target</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 600 }}>
                  <td>Total</td>
                  <td style={{ textAlign: 'right' }}>100%</td>
                  <td style={{ textAlign: 'center' }}>{totalTarget.toFixed(1)}%</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(result.totalValue, true)}</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(result.totalValue, true)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!isValid}>
            Save Targets
          </button>
        </div>
      </div>
    </div>
  )
}
