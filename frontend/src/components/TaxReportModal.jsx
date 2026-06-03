import { useMemo, useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { formatINR } from '../utils/formatters'
import {
  calculateEquityTaxReport,
  getAvailableFinancialYears,
} from '../utils/taxCalculator'
import { downloadTaxReportPdf } from '../utils/taxReportPdf'

export default function TaxReportModal({ open, onClose, showToast }) {
  const modalRef = useRef(null)
  const years = useMemo(() => getAvailableFinancialYears(), [open])
  const [fy, setFy] = useState(() => years[0] ?? new Date().getFullYear() - 1)

  useFocusTrap(modalRef, open, onClose)

  const report = useMemo(
    () => calculateEquityTaxReport({ fyStartYear: fy }),
    [fy, open]
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
          </div>

          {report.rows.length === 0 ? (
            <p className="tax-empty">No sell transactions in this financial year.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table tax-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Qty</th>
                    <th>Proceeds</th>
                    <th>Cost</th>
                    <th>Gain</th>
                    <th>Type</th>
                    <th>Days</th>
                    <th>Est. tax</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={`${r.saleDate}-${r.symbol}-${i}`}>
                      <td>{r.saleDate}</td>
                      <td>{r.symbol}</td>
                      <td>{r.qty}</td>
                      <td>{formatINR(r.proceeds)}</td>
                      <td>{formatINR(r.costBasis)}</td>
                      <td className={r.gain >= 0 ? 'pos' : 'neg'}>{formatINR(r.gain)}</td>
                      <td>{r.taxType}</td>
                      <td>{r.holdingDays}</td>
                      <td>{formatINR(r.taxDue)}</td>
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
