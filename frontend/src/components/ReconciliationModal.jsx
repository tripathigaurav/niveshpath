/**
 * ReconciliationModal — compares quantities derived from transaction history
 * against the stored holding quantities, flagging discrepancies.
 *
 * A discrepancy means the "Add/Edit" form was used directly without logging
 * a buy/sell transaction, or transactions were deleted after being recorded.
 */
import { useMemo, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { storage } from '../utils/storage'

function computeExpectedQty(transactions, symbol, assetType) {
  let qty = 0
  for (const tx of transactions) {
    if (tx.symbol !== symbol || tx.assetType !== assetType) continue
    if (tx.type === 'buy') qty += tx.qty ?? 0
    else if (tx.type === 'sell') qty -= tx.qty ?? 0
  }
  return parseFloat(qty.toFixed(6))
}

function buildReconciliation() {
  const txs = storage.getTransactions()
  const rows = []

  // Indian stocks
  for (const s of storage.getIndianStocks()) {
    const expected = computeExpectedQty(txs, s.symbol, 'indianStock')
    const stored = s.qty ?? 0
    const diff = parseFloat((stored - expected).toFixed(6))
    if (Math.abs(diff) > 0.0001) {
      rows.push({
        id: s.id,
        symbol: s.symbol,
        name: s.name || s.symbol,
        assetType: 'indianStock',
        icon: '🇮🇳',
        storedQty: stored,
        txQty: expected,
        diff,
      })
    }
  }

  // US stocks
  for (const s of storage.getUSStocks()) {
    const expected = computeExpectedQty(txs, s.symbol, 'usStock')
    const stored = s.qty ?? 0
    const diff = parseFloat((stored - expected).toFixed(6))
    if (Math.abs(diff) > 0.0001) {
      rows.push({
        id: s.id,
        symbol: s.symbol,
        name: s.name || s.symbol,
        assetType: 'usStock',
        icon: '🇺🇸',
        storedQty: stored,
        txQty: expected,
        diff,
      })
    }
  }

  // Mutual funds (use schemeCode as symbol)
  for (const f of storage.getMutualFunds()) {
    const sym = f.schemeCode || f.schemeName
    const expected = computeExpectedQty(txs, sym, 'mutualFund')
    const stored = f.units ?? 0
    const diff = parseFloat((stored - expected).toFixed(6))
    if (Math.abs(diff) > 0.0001) {
      rows.push({
        id: f.id,
        symbol: sym,
        name: f.schemeName || sym,
        assetType: 'mutualFund',
        icon: '📋',
        storedQty: stored,
        txQty: expected,
        diff,
      })
    }
  }

  return rows
}

export default function ReconciliationModal({ open, onClose }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, open, onClose)

  const rows = useMemo(() => (open ? buildReconciliation() : []), [open])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recon-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal--wide modal--tall" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="recon-title">Holdings Reconciliation</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <p className="recon-intro">
            Compares each holding's stored quantity against the sum of recorded buy/sell transactions.
            Discrepancies mean holdings were edited directly without logging transactions, or transactions were deleted.
          </p>

          {rows.length === 0 ? (
            <div className="recon-ok">
              <span className="recon-ok-icon">✅</span>
              <p>All holdings match their transaction history — no discrepancies found.</p>
            </div>
          ) : (
            <>
              <p className="recon-count">{rows.length} discrepanc{rows.length === 1 ? 'y' : 'ies'} found</p>
              <div className="table-wrap recon-table-wrap">
                <table className="data-table recon-table">
                  <colgroup>
                    <col className="recon-col-holding" />
                    <col className="recon-col-qty" />
                    <col className="recon-col-qty" />
                    <col className="recon-col-qty" />
                    <col className="recon-col-cause" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Holding</th>
                      <th scope="col" className="num">Stored qty</th>
                      <th scope="col" className="num">Tx-derived qty</th>
                      <th scope="col" className="num">Difference</th>
                      <th scope="col">Likely cause</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="recon-holding">
                          <div className="recon-holding-line">
                            <span className="recon-icon" aria-hidden="true">{r.icon}</span>
                            <strong className="recon-symbol">{r.symbol}</strong>
                          </div>
                          {r.name !== r.symbol && (
                            <div className="recon-name">{r.name}</div>
                          )}
                        </td>
                        <td className="num mono">{r.storedQty}</td>
                        <td className="num mono">
                          {r.txQty === 0 ? <em className="recon-no-tx">no transactions</em> : r.txQty}
                        </td>
                        <td className={`num mono ${r.diff > 0 ? 'pnl-gain' : r.diff < 0 ? 'pnl-loss' : ''}`}>
                          {r.diff > 0 ? '+' : ''}{r.diff}
                        </td>
                        <td className="recon-cause">
                          {r.txQty === 0
                            ? 'Holding added manually without logging a buy transaction'
                            : r.diff > 0
                              ? 'Stored qty higher — missing buy transaction(s) or sell was deleted'
                              : 'Stored qty lower — missing sell transaction(s) or buy was deleted'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="recon-hint">
                To fix: go to the holding's transaction log and add the missing buy/sell entries,
                or manually edit the holding quantity to match the transaction total.
              </p>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
