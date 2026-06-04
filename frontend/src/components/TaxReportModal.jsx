import { useMemo, useState, useRef, useCallback } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { formatINR } from '../utils/formatters'
import {
  calculateEquityTaxReport,
  getAvailableFinancialYears,
  getPreGrandfatheringSymbols,
} from '../utils/taxCalculator'
import { downloadTaxReportPdf } from '../utils/taxReportPdf'
import { api } from '../utils/api'

export default function TaxReportModal({ open, onClose, showToast }) {
  const modalRef = useRef(null)
  const years = useMemo(() => getAvailableFinancialYears(), [open])
  const [fy, setFy] = useState(() => years[0] ?? new Date().getFullYear() - 1)
  const [fmvInputs, setFmvInputs] = useState({}) // { [symbol]: string }
  const [showFmv, setShowFmv] = useState(false)
  const [fmvFetching, setFmvFetching] = useState(false)

  useFocusTrap(modalRef, open, onClose)

  const preGrandfatheringSymbols = useMemo(() => (open ? getPreGrandfatheringSymbols() : []), [open])

  /** Auto-fetch closing prices for all pre-2018 symbols from the backend. */
  const handleAutoFetchFmv = useCallback(async () => {
    if (!preGrandfatheringSymbols.length) return
    setFmvFetching(true)
    const results = {}
    await Promise.allSettled(
      preGrandfatheringSymbols.map(async (sym) => {
        try {
          const nseSymbol = sym.includes('.') ? sym : `${sym}.NS`
          const data = await api.getStockHistoryPrice(nseSymbol, '2018-01-31')
          if (data?.price != null) {
            results[sym] = String(data.price)
          }
        } catch {
          // Skip symbols that fail
        }
      })
    )
    setFmvInputs((prev) => ({ ...prev, ...results }))
    setFmvFetching(false)
    showToast?.(`FMV fetched for ${Object.keys(results).length} / ${preGrandfatheringSymbols.length} symbol(s)`, 'success')
  }, [preGrandfatheringSymbols, showToast])

  const fmvData = useMemo(() => {
    const result = {}
    for (const [sym, val] of Object.entries(fmvInputs)) {
      const n = parseFloat(val)
      if (Number.isFinite(n) && n > 0) result[sym] = n
    }
    return result
  }, [fmvInputs])

  const report = useMemo(
    () => calculateEquityTaxReport({ fyStartYear: fy, fmvData }),
    [fy, fmvData, open]
  )

  if (!open) return null

  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tax-report-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal--wide tax-report-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="tax-report-title">Tax Report (Indian Equities)</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <p className="tax-disclaimer">{report.disclaimer}</p>
          <div className="tax-fy-row">
            <label htmlFor="tax-fy-select">Financial year</label>
            <select
              id="tax-fy-select"
              className="form-select"
              value={fy}
              onChange={(e) => setFy(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  FY {y}-{String(y + 1).slice(-2)} (Apr {y} – Mar {y + 1})
                </option>
              ))}
            </select>
          </div>

          {preGrandfatheringSymbols.length > 0 && (
            <div className="tax-fmv-section">
              <button
                type="button"
                className="btn btn-ghost btn-sm tax-fmv-toggle"
                aria-expanded={showFmv}
                onClick={() => setShowFmv((v) => !v)}
              >
                {showFmv ? '▼' : '▶'} Grandfathering FMV (Jan 31, 2018) — {preGrandfatheringSymbols.length} symbol{preGrandfatheringSymbols.length !== 1 ? 's' : ''}
              </button>
              {showFmv && (
                <div className="tax-fmv-grid">
                  <div className="tax-fmv-header-row">
                    <p className="tax-fmv-note">
                      For LTCG on shares bought before Jan 31 2018, enter the closing price on that date.
                      Cost of acquisition = max(actual cost, min(FMV, sale price)).
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={fmvFetching}
                      onClick={handleAutoFetchFmv}
                      title="Fetch Jan 31 2018 closing prices from Yahoo Finance via backend"
                    >
                      {fmvFetching ? 'Fetching…' : '⬇ Auto-fetch FMV'}
                    </button>
                  </div>
                  {preGrandfatheringSymbols.map((sym) => (
                    <div key={sym} className="tax-fmv-row">
                      <label className="tax-fmv-label" htmlFor={`fmv-${sym}`}>{sym}</label>
                      <input
                        id={`fmv-${sym}`}
                        type="number"
                        min="0"
                        step="any"
                        className="form-input tax-fmv-input"
                        placeholder="₹ FMV on 31 Jan 2018"
                        value={fmvInputs[sym] ?? ''}
                        onChange={(e) => setFmvInputs((p) => ({ ...p, [sym]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="tax-summary-grid">
            <div className="tax-summary-card">
              <span className="tax-summary-label">STCG (realized)</span>
              <span className="tax-summary-val">{formatINR(report.summary.totalStcg, true)}</span>
            </div>
            <div className="tax-summary-card">
              <span className="tax-summary-label">LTCG (realized)</span>
              <span className="tax-summary-val">{formatINR(report.summary.totalLtcg, true)}</span>
            </div>
            <div className="tax-summary-card">
              <span className="tax-summary-label">LTCG exemption</span>
              <span className="tax-summary-val">{formatINR(report.summary.ltcgExemption, true)}</span>
            </div>
            <div className="tax-summary-card tax-summary-card--accent">
              <span className="tax-summary-label">Est. tax due</span>
              <span className="tax-summary-val">{formatINR(report.summary.estimatedTax, true)}</span>
            </div>
            <div className="tax-summary-card">
              <span className="tax-summary-label">Total STT paid</span>
              <span className="tax-summary-val">{formatINR(report.summary.totalStt, true)}</span>
            </div>
          </div>

          {report.rows.length === 0 ? (
            <p className="tax-empty">No sell transactions in this financial year.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table tax-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Symbol</th>
                    <th scope="col" className="num">Qty</th>
                    <th scope="col" className="num">Proceeds</th>
                    <th scope="col" className="num">Cost</th>
                    <th scope="col" className="num">Gain</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="num">Days</th>
                    <th scope="col" className="num">Est. tax</th>
                    <th scope="col" className="num">STT</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={`${r.saleDate}-${r.symbol}-${i}`}>
                      <td>{r.saleDate}</td>
                      <td>{r.symbol}</td>
                      <td className="num mono">{r.qty}</td>
                      <td className="num">{formatINR(r.proceeds)}</td>
                      <td className="num">{formatINR(r.costBasis)}</td>
                      <td className={`num ${r.gain >= 0 ? 'pos' : 'neg'}`}>{formatINR(r.gain)}</td>
                      <td>{r.taxType}</td>
                      <td className="num">{r.holdingDays}</td>
                      <td className="num">{formatINR(r.taxDue)}</td>
                      <td className="num">{formatINR(r.stt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!report.rows.length}
            onClick={() => {
              try {
                downloadTaxReportPdf(report, fyLabel)
                showToast?.('PDF downloaded', 'success')
              } catch {
                showToast?.('PDF export failed', 'error')
              }
            }}
          >
            Download PDF
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
