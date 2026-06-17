import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../utils/api'
import { useDebounce } from '../hooks/useDebounce'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useClickOutside } from '../hooks/useClickOutside'

const SEARCH_DEBOUNCE_MS = 350
const MIN_SEARCH_LEN = 2

const EMPTY = { symbol: '', name: '', qty: '', buyPrice: '', buyDate: '' }

export default function AddStockModal({ initial, onSave, onClose, mode = 'indian', usCategory = 'stock' }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [searchQuery, setSearchQuery] = useState(initial?.symbol || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeIdx, setActiveIdx] = useState(-1)
  const [livePrice, setLivePrice] = useState(null)
  const [livePriceTime, setLivePriceTime] = useState(null)
  const [livePriceLoading, setLivePriceLoading] = useState(false)
  const searchRef = useRef(null)
  const modalRef = useRef(null)
  const debouncedQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS)

  useFocusTrap(modalRef, true, onClose)

  useEffect(() => {
    if (!form.symbol || form.symbol.length < 2) {
      setLivePrice(null)
      setLivePriceTime(null)
      return
    }
    let cancelled = false
    setLivePriceLoading(true)
    api.getStockPrice(form.symbol)
      .then((data) => {
        if (cancelled) return
        setLivePrice(data.price ?? data.regularMarketPrice ?? null)
        setLivePriceTime(new Date())
      })
      .catch(() => {
        if (!cancelled) { setLivePrice(null); setLivePriceTime(null) }
      })
      .finally(() => { if (!cancelled) setLivePriceLoading(false) })
    return () => { cancelled = true }
  }, [form.symbol])

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

  useClickOutside(searchRef, () => setShowDropdown(false), showDropdown)

  const selectResult = useCallback((result) => {
    setForm((f) => ({ ...f, symbol: result.symbol, name: result.name }))
    setSearchQuery(result.symbol)
    setShowDropdown(false)
    setResults([])
    setActiveIdx(-1)
  }, [])

  const handleSearchKeyDown = (e) => {
    if (!showDropdown || !results.length) {
      if (e.key === 'Escape') setShowDropdown(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      selectResult(results[activeIdx])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIdx(-1)
    }
  }

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
    if (validate()) {
      onSave(mode === 'us' ? { ...form, category: usCategory } : form)
    }
  }

  const usTitles = {
    stock: initial ? 'Edit Stock' : 'Add US Stock',
    espp: initial ? 'Edit ESPP' : 'Add ESPP Holding',
    rsu: initial ? 'Edit RSU' : 'Add RSU Holding',
  }
  const title =
    mode === 'indian'
      ? (initial ? 'Edit Stock' : 'Add Indian Stock')
      : (usTitles[usCategory] || usTitles.stock)

  const usHints = {
    stock: null,
    espp: 'Employee Stock Purchase Plan — use your purchase price and purchase date.',
    rsu: 'Restricted Stock Units — use vest date and cost basis (often $0 or FMV at vest).',
  }
  const usHint = mode === 'us' ? usHints[usCategory] : null

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
            {usHint && (
              <p className="form-hint form-hint-block">{usHint}</p>
            )}
            {mode === 'us' && usCategory === 'stock' && !initial && (
              <p className="form-hint form-hint-block">
                ETFs (e.g. SPY, QQQ, VTI) are auto-tagged when detected from the symbol or name.
              </p>
            )}
            {mode === 'indian' && !initial && (
              <p className="form-hint form-hint-block">
                Indian ETFs (e.g. NIFTYBEES, GOLDBEES) are auto-tagged when detected from the symbol or name.
              </p>
            )}
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
                    setActiveIdx(-1)
                  }}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                  autoComplete="off"
                />
                {showDropdown && (
                  <div className="search-dropdown" role="listbox">
                    {searching && <div className="search-loading">Searching...</div>}
                    {!searching && results.length === 0 && searchQuery.length >= MIN_SEARCH_LEN && (
                      <div className="search-empty">No results found. You can type the symbol manually.</div>
                    )}
                    {results.map((r, i) => (
                      <div
                        key={r.symbol}
                        role="option"
                        aria-selected={i === activeIdx}
                        className={`search-option${i === activeIdx ? ' active' : ''}`}
                        onMouseDown={() => selectResult(r)}
                        onMouseEnter={() => setActiveIdx(i)}
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
              {livePriceLoading && (
                <div className="form-hint form-live-price">Fetching current price...</div>
              )}
              {!livePriceLoading && livePrice != null && (
                <div className="form-hint form-live-price">
                  Current Price: <strong>{mode === 'indian' ? '₹' : '$'}{livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  {livePriceTime && (
                    <span className="form-live-price-time"> · {livePriceTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              )}
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
                  {mode === 'us' && usCategory === 'espp'
                    ? 'Purchase Price ($)'
                    : mode === 'us' && usCategory === 'rsu'
                      ? 'Cost Basis ($)'
                      : `Avg Buy Price ${mode === 'indian' ? '(₹)' : '($)'}`}
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
              <label className="form-label">
                {mode === 'us' && usCategory === 'rsu' ? 'Vest Date' : 'Buy Date'}
              </label>
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
