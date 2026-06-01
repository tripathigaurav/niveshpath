import { useState, useEffect, useRef, useCallback, forwardRef } from 'react'
import { api } from '../utils/api'
import { useDebounce } from '../hooks/useDebounce'

const SEARCH_DEBOUNCE_MS = 350
const MAX_STOCK_RESULTS = 5
const MAX_MF_RESULTS = 4

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      className="gs-icon"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8.8" y1="8.8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const GlobalSearch = forwardRef(function GlobalSearch({ onNavigate }, ref) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  // Expose focus() to parent via ref
  useEffect(() => {
    if (!ref) return
    const focusable = { focus: () => inputRef.current?.focus() }
    if (typeof ref === 'function') ref(focusable)
    else ref.current = focusable
  }, [ref])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setSearching(true)
    Promise.all([
      api.searchStocks(debouncedQuery).catch(() => []),
      api.searchMf(debouncedQuery).catch(() => []),
    ]).then(([stocks, mfs]) => {
      const stockResults = stocks.slice(0, MAX_STOCK_RESULTS).map((s) => ({
        key: s.symbol,
        label: s.symbol,
        sub: s.name,
        tab: s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO') ? 'indianStocks' : 'usStocks',
        badge: s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO') ? '🇮🇳' : '🇺🇸',
      }))
      const mfResults = mfs.slice(0, MAX_MF_RESULTS).map((m) => ({
        key: m.schemeCode,
        label: m.schemeName,
        sub: `NAV ₹${m.nav?.toFixed(2)} · ${m.date}`,
        tab: 'mutualFunds',
        badge: '📋',
      }))
      setResults([...stockResults, ...mfResults])
      setOpen(true)
      setActiveIdx(-1)
    }).finally(() => setSearching(false))
  }, [debouncedQuery])

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = useCallback((result) => {
    onNavigate(result.tab)
    setQuery('')
    setOpen(false)
    setResults([])
  }, [onNavigate])

  const handleKeyDown = (e) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]) }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  return (
    <div className="gs-wrap" ref={wrapRef}>
      <div className="gs-input-row">
        <SearchIcon />
        <input
          ref={inputRef}
          className="gs-input"
          type="text"
          placeholder="Search… ⌘K"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search stocks and funds"
        />
        {searching && <span className="gs-spinner" />}
        {query && !searching && (
          <button
            className="gs-clear"
            onMouseDown={(e) => { e.preventDefault(); setQuery(''); setResults([]); setOpen(false) }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="gs-dropdown" role="listbox">
          {results.map((r, i) => (
            <div
              key={r.key}
              role="option"
              aria-selected={i === activeIdx}
              className={`gs-result${i === activeIdx ? ' active' : ''}`}
              onMouseDown={() => handleSelect(r)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="gs-badge">{r.badge}</span>
              <div className="gs-text">
                <div className="gs-label">{r.label}</div>
                <div className="gs-sub">{r.sub}</div>
              </div>
              <span className="gs-arrow">→</span>
            </div>
          ))}
          <div className="gs-footer">↑↓ navigate · Enter to go · Esc close</div>
        </div>
      )}

      {open && !searching && query.length >= 2 && results.length === 0 && (
        <div className="gs-dropdown">
          <div className="gs-empty">No results for "{query}"</div>
        </div>
      )}
    </div>
  )
})

export default GlobalSearch
