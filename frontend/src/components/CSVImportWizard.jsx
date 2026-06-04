import { useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  parseCsvText,
  detectBroker,
  mapRowsToHoldings,
  mapRowsToHoldingsManual,
  importIndianHoldingsFromCsv,
  importMFHoldingsFromCams,
  BROKER_PROFILES,
} from '../utils/csvImporter'
import { parseCamsText } from '../utils/camsParser'

const BROKER_OPTIONS = [
  { value: 'zerodha', label: 'Zerodha Console' },
  { value: 'groww', label: 'Groww' },
  { value: 'upstox', label: 'Upstox' },
  { value: 'angel', label: 'Angel One' },
  { value: 'icici', label: 'ICICI Direct' },
  { value: 'paytm', label: 'Paytm Money' },
  { value: 'mfcentral', label: 'MFCentral / CAS' },
  { value: 'manual', label: 'Manual mapping…' },
]

const FIELD_LABELS = {
  symbol: 'Symbol / Scheme *',
  qty: 'Qty / Units *',
  price: 'Price / NAV',
  date: 'Date',
  type: 'Buy/Sell type',
}

function ManualMapper({ headers, colMap, onChange }) {
  return (
    <div className="csv-manual-mapper">
      <p className="csv-manual-note">Select which CSV column maps to each field:</p>
      <div className="csv-manual-grid">
        {Object.entries(FIELD_LABELS).map(([field, label]) => (
          <div key={field} className="form-group">
            <label className="form-label" htmlFor={`col-${field}`}>{label}</label>
            <select
              id={`col-${field}`}
              className="form-select"
              value={colMap[field] || ''}
              onChange={(e) => onChange({ ...colMap, [field]: e.target.value || null })}
            >
              <option value="">(none)</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CSVImportWizard({ open, onClose, showToast }) {
  const modalRef = useRef(null)
  const fileRef = useRef(null)
  const [mode, setMode] = useState('csv') // 'csv' | 'cams'
  const [step, setStep] = useState('upload')
  const [brokerKey, setBrokerKey] = useState('zerodha')
  const [rawRows, setRawRows] = useState([])
  const [csvHeaders, setCsvHeaders] = useState([])
  const [preview, setPreview] = useState(null)
  const [camsText, setCamsText] = useState('')
  const [camsPreview, setCamsPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [manualColMap, setManualColMap] = useState({ symbol: null, qty: null, price: null, date: null, type: null })

  useFocusTrap(modalRef, open, onClose)

  const reset = () => {
    setStep('upload')
    setRawRows([])
    setCsvHeaders([])
    setPreview(null)
    setResult(null)
    setBrokerKey('zerodha')
    setManualColMap({ symbol: null, qty: null, price: null, date: null, type: null })
    setCamsText('')
    setCamsPreview(null)
  }

  const handleClose = () => { reset(); onClose() }

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const rows = parseCsvText(text)
      const headers = rows.length ? Object.keys(rows[0]) : []
      setRawRows(rows)
      setCsvHeaders(headers)
      const detected = detectBroker(headers)
      const key = detected.key
      setBrokerKey(key)
      if (key === 'manual') {
        // Auto-guess column map by name similarity
        const guessed = {}
        const norm = (s) => String(s).toLowerCase()
        for (const field of ['symbol', 'qty', 'price', 'date', 'type']) {
          const aliases = BROKER_PROFILES?.zerodha?.map?.[field] ?? []
          const found = headers.find((h) => aliases.some((a) => norm(h).includes(norm(a))))
          guessed[field] = found || null
        }
        setManualColMap(guessed)
        setStep('manual')
      } else {
        const mapped = mapRowsToHoldings(rows, key)
        setPreview(mapped)
        setStep('preview')
      }
    } catch (err) {
      showToast?.(err.message || 'Could not parse CSV', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleBrokerOverride = (key) => {
    setBrokerKey(key)
    if (key === 'manual') {
      setStep('manual')
    } else {
      try {
        setPreview(mapRowsToHoldings(rawRows, key))
      } catch (err) {
        showToast?.(err.message, 'error')
      }
    }
  }

  const handleManualPreview = () => {
    try {
      const mapped = mapRowsToHoldingsManual(rawRows, manualColMap)
      setPreview(mapped)
      setStep('preview')
    } catch (err) {
      showToast?.(err.message, 'error')
    }
  }

  const handleImport = () => {
    if (!preview?.holdings?.length) { showToast?.('No holdings to import', 'info'); return }
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

  const handleDoneReload = () => { handleClose(); window.setTimeout(() => window.location.reload(), 400) }

  const handleCamsPreview = () => {
    if (!camsText.trim()) { showToast?.('Paste your CAMS statement text first', 'info'); return }
    try {
      const parsed = parseCamsText(camsText)
      if (!parsed.holdings.length) {
        showToast?.('No scheme transactions found — check the pasted text format', 'error')
        return
      }
      setCamsPreview(parsed)
      setStep('cams-preview')
    } catch (err) {
      showToast?.(err.message || 'Could not parse CAMS text', 'error')
    }
  }

  const handleCamsImport = () => {
    if (!camsPreview?.holdings?.length) return
    setBusy(true)
    try {
      const res = importMFHoldingsFromCams(camsPreview.holdings)
      setResult(res)
      setStep('done')
      showToast?.(`Added ${res.added} mutual fund(s)${res.duplicates ? `, ${res.duplicates} skipped (duplicate)` : ''}`, 'success')
    } catch (err) {
      showToast?.(err.message || 'Import failed', 'error')
    } finally {
      setBusy(false)
    }
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
          {/* Mode tabs */}
          {(step === 'upload' || step === 'cams-paste') && (
            <div className="csv-mode-tabs">
              <button
                type="button"
                className={`csv-mode-tab ${mode === 'csv' ? 'active' : ''}`}
                onClick={() => { setMode('csv'); setStep('upload') }}
              >
                📄 Broker CSV
              </button>
              <button
                type="button"
                className={`csv-mode-tab ${mode === 'cams' ? 'active' : ''}`}
                onClick={() => { setMode('cams'); setStep('cams-paste') }}
              >
                📋 CAMS / KARVY paste
              </button>
            </div>
          )}

          {/* Broker CSV note */}
          {mode === 'csv' && step === 'upload' && (
            <p className="csv-import-note">
              CSV stays in your browser — nothing is uploaded. Supports Zerodha, Groww, Upstox, Angel One, ICICI Direct, Paytm Money, MFCentral/CAS, and manual column mapping.
            </p>
          )}

          {step === 'upload' && (
            <>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="csv-file-input"
                onChange={(e) => handleFile(e.target.files?.[0])} />
              <button type="button" className="btn btn-primary" disabled={busy}
                onClick={() => fileRef.current?.click()}>
                {busy ? 'Reading…' : 'Choose CSV file'}
              </button>
            </>
          )}

          {step === 'manual' && (
            <ManualMapper headers={csvHeaders} colMap={manualColMap} onChange={setManualColMap} />
          )}

          {step === 'preview' && preview && (
            <>
              <div className="csv-preview-meta">
                <span>Detected: <strong>{preview.broker}</strong></span>
                <label className="csv-broker-select">
                  Override:
                  <select className="form-select" value={brokerKey} onChange={(e) => handleBrokerOverride(e.target.value)}>
                    {BROKER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <p>{preview.holdings.length} holding(s) ready · {preview.skipped} row(s) skipped</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Symbol</th><th>Qty</th><th>Avg price</th><th>Buy date</th></tr>
                  </thead>
                  <tbody>
                    {preview.holdings.slice(0, 20).map((h) => (
                      <tr key={h.symbol}>
                        <td>{h.symbol}</td><td>{h.qty}</td><td>{h.buyPrice}</td><td>{h.buyDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.holdings.length > 20 && <p className="csv-more">…and {preview.holdings.length - 20} more</p>}
            </>
          )}

          {step === 'done' && result && (
            <div className="csv-done">
              <p>Import complete.</p>
              <ul>
                <li>{result.added} new holding(s) added</li>
                <li>{result.duplicates} duplicate(s) skipped</li>
                <li>{result.total} total holdings</li>
              </ul>
            </div>
          )}

          {step === 'cams-paste' && (
            <div className="cams-paste-section">
              <p className="csv-import-note">
                Open your CAMS / KARVY consolidated account statement PDF, select all text (Ctrl+A), and paste it below. Your data never leaves this browser.
              </p>
              <textarea
                className="cams-paste-area"
                rows={10}
                placeholder="Paste CAMS statement text here…"
                value={camsText}
                onChange={(e) => setCamsText(e.target.value)}
              />
            </div>
          )}

          {step === 'cams-preview' && camsPreview && (
            <div>
              <p>{camsPreview.holdings.length} scheme(s) found · {camsPreview.skipped} skipped</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Scheme</th><th>Units</th><th>Avg NAV</th><th>Latest date</th></tr>
                  </thead>
                  <tbody>
                    {camsPreview.holdings.slice(0, 20).map((h, i) => (
                      <tr key={i}>
                        <td>{h.schemeName}</td>
                        <td>{h.units}</td>
                        <td>{h.avgNavCost}</td>
                        <td>{h.latestDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {camsPreview.holdings.length > 20 && <p className="csv-more">…and {camsPreview.holdings.length - 20} more</p>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step === 'cams-paste' && (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
              <button type="button" className="btn btn-primary"
                disabled={!camsText.trim() || busy}
                onClick={handleCamsPreview}>
                Preview
              </button>
            </>
          )}
          {step === 'cams-preview' && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setStep('cams-paste')}>Back</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={handleCamsImport}>
                Import {camsPreview?.holdings?.length ?? 0} funds
              </button>
            </>
          )}
          {step === 'manual' && (
            <>
              <button type="button" className="btn btn-secondary" onClick={reset}>Back</button>
              <button type="button" className="btn btn-primary"
                disabled={!manualColMap.symbol || !manualColMap.qty}
                onClick={handleManualPreview}>
                Preview
              </button>
            </>
          )}
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
