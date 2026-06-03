import { useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  parseCsvText,
  detectBroker,
  mapRowsToHoldings,
  importIndianHoldingsFromCsv,
} from '../utils/csvImporter'

const STEPS = ['upload', 'preview', 'done']

export default function CSVImportWizard({ open, onClose, showToast }) {
  const modalRef = useRef(null)
  const fileRef = useRef(null)
  const [step, setStep] = useState('upload')
  const [brokerKey, setBrokerKey] = useState('zerodha')
  const [rawRows, setRawRows] = useState([])
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  useFocusTrap(modalRef, open, onClose)

  const reset = () => {
    setStep('upload')
    setRawRows([])
    setPreview(null)
    setResult(null)
    setBrokerKey('zerodha')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const rows = parseCsvText(text)
      setRawRows(rows)
      const headers = rows.length ? Object.keys(rows[0]) : []
      const detected = detectBroker(headers)
      setBrokerKey(detected.key)
      const mapped = mapRowsToHoldings(rows, detected.key)
      setPreview(mapped)
      setStep('preview')
    } catch (err) {
      showToast?.(err.message || 'Could not parse CSV', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleImport = () => {
    if (!preview?.holdings?.length) {
      showToast?.('No holdings to import', 'info')
      return
    }
    setBusy(true)
    try {
      const res = importIndianHoldingsFromCsv(preview.holdings)
      setResult(res)
      setStep('done')
      showToast?.(`Added ${res.added} holding(s)${res.duplicates ? `, ${res.duplicates} skipped (duplicate)` : ''}`, 'success')
    } catch (err) {
      showToast?.(err.message || 'Import failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDoneReload = () => {
    handleClose()
    window.setTimeout(() => window.location.reload(), 400)
  }

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-title"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal modal--wide csv-import-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="csv-import-title">Import Broker CSV</h2>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <p className="csv-import-note">
            CSV stays in your browser — nothing is uploaded. Supports Zerodha, Groww, and Upstox trade exports (buy rows).
          </p>

          {step === 'upload' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="csv-file-input"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? 'Reading…' : 'Choose CSV file'}
              </button>
            </>
          )}

          {step === 'preview' && preview && (
            <>
              <div className="csv-preview-meta">
                <span>Detected: <strong>{preview.broker}</strong></span>
                <label className="csv-broker-select">
                  Override:
                  <select
                    className="form-select"
                    value={brokerKey}
                    onChange={(e) => {
                      const key = e.target.value
                      setBrokerKey(key)
                      setPreview(mapRowsToHoldings(rawRows, key))
                    }}
                  >
                    <option value="zerodha">Zerodha</option>
                    <option value="groww">Groww</option>
                    <option value="upstox">Upstox</option>
                  </select>
                </label>
              </div>
              <p>{preview.holdings.length} holding(s) ready · {preview.skipped} row(s) skipped</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Qty</th>
                      <th>Avg price</th>
                      <th>Buy date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.holdings.slice(0, 20).map((h) => (
                      <tr key={h.symbol}>
                        <td>{h.symbol}</td>
                        <td>{h.qty}</td>
                        <td>{h.buyPrice}</td>
                        <td>{h.buyDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.holdings.length > 20 && (
                <p className="csv-more">…and {preview.holdings.length - 20} more</p>
              )}
            </>
          )}

          {step === 'done' && result && (
            <div className="csv-done">
              <p>Import complete.</p>
              <ul>
                <li>{result.added} new holding(s) added</li>
                <li>{result.duplicates} duplicate(s) skipped</li>
                <li>{result.total} total Indian holdings</li>
              </ul>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step === 'preview' && (
            <>
              <button type="button" className="btn btn-secondary" onClick={reset}>Back</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={handleImport}>
                Import {preview?.holdings?.length ?? 0} holdings
              </button>
            </>
          )}
          {step === 'done' && (
            <button type="button" className="btn btn-primary" onClick={handleDoneReload}>Done — reload</button>
          )}
          {step === 'upload' && (
            <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  )
}
