import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../utils/api'
import { useDebounce } from '../hooks/useDebounce'
import { useFocusTrap } from '../hooks/useFocusTrap'

const SEARCH_DEBOUNCE_MS = 350
const MIN_SEARCH_LEN = 2

const EMPTY = { symbol: '', name: '', qty: '', buyPrice: '', buyDate: '' }

export default function AddStockModal({ initial, onSave, onClose, mode = 'indian' }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [searchQuery, setSearchQuery] = useState(initial?.symbol || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [errors, setErrors] = useState({})
  const searchRef = useRef(null)
  const modalRef = useRef(null)
  const debouncedQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS)

  useFocusTrap(modalRef, true, onClose)

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < MIN_SEARCH_LEN) {
      setResults([])
      setShowDropdown(false)
      return
    }
    if (form.symbol && debouncedQuery === form.symbol) return
    setSearching(true)
    api.searchStocks(debouncedQuery)
      .then((data) => {
        const filtered = data.filter((s) =>
          mode === 'indian'
            ? s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO')
            : !s.symbol.endsWith('.NS') && !s.symbol.endsWith('.BO')
        )
        setResults(filtered.length ? filtered : data)
        setShowDropdown(true)
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, mode, form.symbol])

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectResult = useCallback((result) => {
    setForm((f) => ({ ...f, symbol: result.symbol, name: result.name }))
    setSearchQuery(result.symbol)
    setShowDropdown(false)
    setResults([])
  }, [])

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.symbol.trim()) errs.symbol = 'Symbol is required'
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.qty || isNaN(form.qty) || +form.qty <= 0) errs.qty = 'Enter a valid quantity'
    if (!form.buyPrice || isNaN(form.buyPrice) || +form.buyPrice <= 0) errs.buyPrice = 'Enter a valid price'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) onSave(form)
  }

  const title = initial ? 'Edit Stock' : mode === 'indian' ? 'Add Indian Stock' : 'Add US Stock'

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="stock-modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">
                Symbol {mode === 'indian' ? '(NSE/BSE)' : '(NASDAQ/NYSE)'}
              </label>
              <div className="search-wrap" ref={searchRef}>
                <input
                  className={`form-input${errors.symbol ? ' error' : ''}`}
                  type="text"
                  placeholder={mode === 'indian' ? 'e.g. RELIANCE, HDFCBANK' : 'e.g. AAPL, MSFT'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))
                    setShowDropdown(true)
                  }}
                  autoFocus
                  autoComplete="off"
                />
                {showDropdown && (
                  <div className="search-dropdown">
                    {searching && <div className="search-loading">Searching...</div>}
                    {!searching && results.length === 0 && searchQuery.length >= MIN_SEARCH_LEN && (
                      <div className="search-empty">No results found. You can type the symbol manually.</div>
                    )}
                    {results.map((r) => (
                      <div
                        key={r.symbol}
                        className="search-option"
                        onMouseDown={() => selectResult(r)}
                      >
                        <div>
                          <div className="search-option-symbol">{r.symbol}</div>
                          <div className="search-option-name">{r.name}</div>
                        </div>
                        <span className="search-option-exchange">{r.exchange}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.symbol && <div className="error-text">{errors.symbol}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                className={`form-input${errors.name ? ' error' : ''}`}
                type="text"
                placeholder="e.g. Reliance Industries"
                value={form.name}
                onChange={set('name')}
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity (Shares)</label>
                <input
                  className={`form-input mono${errors.qty ? ' error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 10"
                  value={form.qty}
                  onChange={set('qty')}
                  min="0"
                  step="any"
                />
                {errors.qty && <div className="error-text">{errors.qty}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Avg Buy Price {mode === 'indian' ? '(₹)' : '($)'}
                </label>
                <input
                  className={`form-input mono${errors.buyPrice ? ' error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder={mode === 'indian' ? 'e.g. 2500' : 'e.g. 180'}
                  value={form.buyPrice}
                  onChange={set('buyPrice')}
                  min="0"
                  step="any"
                />
                {errors.buyPrice && <div className="error-text">{errors.buyPrice}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Buy Date</label>
              <input
                className="form-input"
                type="date"
                value={form.buyDate}
                onChange={set('buyDate')}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {initial ? 'Save Changes' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
