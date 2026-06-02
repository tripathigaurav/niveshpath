import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../utils/api'
import { useDebounce } from '../hooks/useDebounce'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useClickOutside } from '../hooks/useClickOutside'

const SEARCH_DEBOUNCE_MS = 350
const MIN_SEARCH_LEN = 2

const EMPTY = { schemeCode: '', schemeName: '', units: '', buyNAV: '', buyDate: '' }

export default function AddMFModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [searchQuery, setSearchQuery] = useState(initial?.schemeName || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeIdx, setActiveIdx] = useState(-1)
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
    if (form.schemeName && debouncedQuery === form.schemeName) return
    setSearching(true)
    api.searchMf(debouncedQuery)
      .then((data) => {
        setResults(data)
        setShowDropdown(true)
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, form.schemeName])

  useClickOutside(searchRef, () => setShowDropdown(false), showDropdown)

  const selectScheme = useCallback((scheme) => {
    setForm((f) => ({
      ...f,
      schemeCode: String(scheme.schemeCode),
      schemeName: scheme.schemeName,
      buyNAV: f.buyNAV || String(scheme.nav),
    }))
    setSearchQuery(scheme.schemeName)
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
      selectScheme(results[activeIdx])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIdx(-1)
    }
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    const code = String(form.schemeCode || '').trim()
    if (!code) errs.schemeName = 'Please search and select a scheme'
    if (!form.units || isNaN(form.units) || +form.units <= 0) errs.units = 'Enter valid units'
    if (!form.buyNAV || isNaN(form.buyNAV) || +form.buyNAV <= 0) errs.buyNAV = 'Enter valid NAV'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) onSave(form)
  }

  const title = initial ? 'Edit Mutual Fund' : 'Add Mutual Fund'

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mf-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="mf-modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Scheme Name</label>
              <div className="search-wrap" ref={searchRef}>
                <input
                  className={`form-input${errors.schemeName ? ' error' : ''}`}
                  type="text"
                  placeholder="Search scheme name, e.g. Mirae, Parag Parikh..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setForm((f) => ({ ...f, schemeCode: '', schemeName: e.target.value }))
                    setShowDropdown(true)
                    setActiveIdx(-1)
                  }}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                  autoComplete="off"
                />
                {showDropdown && (
                  <div className="search-dropdown" role="listbox">
                    {searching && <div className="search-loading">Searching AMFI...</div>}
                    {!searching && results.length === 0 && searchQuery.length >= MIN_SEARCH_LEN && (
                      <div className="search-empty">No schemes found.</div>
                    )}
                    {results.map((r, i) => (
                      <div
                        key={r.schemeCode}
                        role="option"
                        aria-selected={i === activeIdx}
                        className={`search-option${i === activeIdx ? ' active' : ''}`}
                        onMouseDown={() => selectScheme(r)}
                        onMouseEnter={() => setActiveIdx(i)}
                      >
                        <div>
                          <div className="search-option-symbol search-option-symbol-sm">
                            {r.schemeName}
                          </div>
                          <div className="search-option-name">
                            Code: {r.schemeCode} &nbsp;·&nbsp; NAV: ₹{r.nav?.toFixed(4)}
                          </div>
                        </div>
                        <span className="search-option-exchange">{r.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.schemeName && <div className="error-text">{errors.schemeName}</div>}
              {form.schemeCode && (
                <div className="form-hint">Scheme Code: {form.schemeCode}</div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Units</label>
                <input
                  className={`form-input mono${errors.units ? ' error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 150.234"
                  value={form.units}
                  onChange={set('units')}
                  min="0"
                  step="any"
                />
                {errors.units && <div className="error-text">{errors.units}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Avg Buy NAV (₹)</label>
                <input
                  className={`form-input mono${errors.buyNAV ? ' error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 45.20"
                  value={form.buyNAV}
                  onChange={set('buyNAV')}
                  min="0"
                  step="any"
                />
                {errors.buyNAV && <div className="error-text">{errors.buyNAV}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Start / Purchase Date</label>
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initial ? 'Save Changes' : 'Add Fund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
