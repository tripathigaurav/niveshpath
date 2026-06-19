import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'
import { formatINR, formatUSD } from '../utils/formatters'
import { logAudit } from '../utils/auditTrail'
import { notifyDataChanged } from '../hooks/useNotifications'
import { api } from '../utils/api'
import { useDebounce } from '../hooks/useDebounce'
import { useClickOutside } from '../hooks/useClickOutside'

const SEARCH_DEBOUNCE_MS = 350
const MIN_SEARCH_LEN = 2

const EXCHANGES_BY_TYPE = {
  indianStock: ['NSE', 'BSE'],
  usStock: ['NASDAQ', 'NYSE', 'Other'],
  mutualFund: [], // no exchange for MFs
}
const DEFAULT_EXCHANGE = {
  indianStock: 'NSE',
  usStock: 'NASDAQ',
  mutualFund: '',
}
const SYMBOL_PLACEHOLDER = {
  indianStock: 'e.g. TCS, INFY, RELIANCE',
  usStock: 'e.g. AAPL, MSFT, NVDA',
  mutualFund: 'e.g. scheme name or code',
}
const TARGET_LABEL = {
  indianStock: 'Target price (₹)',
  usStock: 'Target price ($)',
  mutualFund: 'Target NAV (₹)',
}
const ASSET_TYPES = [
  { value: 'indianStock', label: 'Indian Stock' },
  { value: 'usStock', label: 'US Stock' },
  { value: 'mutualFund', label: 'Mutual Fund' },
]

function emptyDraft() {
  return { symbol: '', name: '', exchange: 'NSE', assetType: 'indianStock', targetPrice: '', notes: '' }
}

function getCurrentPriceFromPortfolio(symbol, assetType) {
  try {
    if (assetType === 'indianStock') {
      const found = storage.getIndianStocks().find((s) => s.symbol === symbol)
      return found?.currentPrice ?? null
    }
    if (assetType === 'usStock') {
      const found = storage.getUSStocks().find((s) => s.symbol === symbol)
      return found?.currentPrice ?? null
    }
    if (assetType === 'mutualFund') {
      const found = storage.getMutualFunds().find((s) => s.symbol === symbol || s.name === symbol)
      return found?.nav ?? null
    }
  } catch { /* ignore */ }
  return null
}

function targetStatus(currentPrice, targetPrice) {
  if (currentPrice == null || !targetPrice) return null
  if (currentPrice >= targetPrice) return 'hit'
  const pct = ((targetPrice - currentPrice) / currentPrice) * 100
  return pct <= 5 ? 'close' : 'away'
}

export default function Watchlist({ showToast }) {
  const [items, setItems] = useState(() => storage.getWatchlist())
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [editId, setEditId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)

  // Symbol search autocomplete
  const [symbolQuery, setSymbolQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const searchRef = useRef(null)
  const debouncedQuery = useDebounce(symbolQuery, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < MIN_SEARCH_LEN) {
      setSearchResults([]); setShowDropdown(false); return
    }
    // Don't re-search if user already selected this exact symbol
    if (draft.symbol && debouncedQuery === draft.symbol) return
    setSearching(true)
    const isIndian = draft.assetType === 'indianStock'
    const isUs = draft.assetType === 'usStock'
    const isMf = draft.assetType === 'mutualFund'
    const fetch = isMf ? api.searchMf(debouncedQuery) : api.searchStocks(debouncedQuery)
    fetch
      .then((data) => {
        let filtered = data
        if (isIndian) filtered = data.filter((s) => s.symbol?.endsWith('.NS') || s.symbol?.endsWith('.BO'))
        else if (isUs) filtered = data.filter((s) => !s.symbol?.endsWith('.NS') && !s.symbol?.endsWith('.BO'))
        setSearchResults(filtered.length ? filtered : data.slice(0, 8))
        setShowDropdown(true)
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, draft.assetType, draft.symbol])

  useClickOutside(searchRef, () => setShowDropdown(false), showDropdown)

  const selectSearchResult = useCallback((result) => {
    // Infer exchange from symbol suffix for Indian stocks
    let exchange = draft.exchange
    if (draft.assetType === 'indianStock') {
      exchange = result.symbol?.endsWith('.BO') ? 'BSE' : 'NSE'
    } else if (draft.assetType === 'usStock') {
      exchange = result.exchange || draft.exchange
    }
    const sym = result.symbol || result.name || ''
    setDraft((d) => ({ ...d, symbol: sym, name: result.name || sym, exchange }))
    setSymbolQuery(sym)
    setShowDropdown(false)
    setSearchResults([])
    setActiveIdx(-1)
  }, [draft.assetType, draft.exchange])

  const handleSymbolKeyDown = (e) => {
    if (!showDropdown || !searchResults.length) {
      if (e.key === 'Escape') setShowDropdown(false)
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, searchResults.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectSearchResult(searchResults[activeIdx]) }
    else if (e.key === 'Escape') { setShowDropdown(false); setActiveIdx(-1) }
  }

  const alertedRef = useRef(new Set())

  useEffect(() => {
    let timer = null
    const checkAlerts = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        const latest = storage.getWatchlist()
        setItems(latest)
        for (const item of latest) {
          if (!item.alertEnabled || !item.targetPrice) continue
          if (alertedRef.current.has(item.symbol)) continue
          const cur = getCurrentPriceFromPortfolio(item.symbol, item.assetType)
          if (cur != null && cur >= item.targetPrice) {
            alertedRef.current.add(item.symbol)
            showToast?.(
              `🎯 ${item.symbol}: ₹${cur.toFixed(2)} reached target ₹${item.targetPrice}`,
              'info'
            )
          }
        }
      }, 1000)
    }
    window.addEventListener('pt_data_changed', checkAlerts)
    return () => {
      window.removeEventListener('pt_data_changed', checkAlerts)
      if (timer) clearTimeout(timer)
    }
  }, [showToast])

  // Re-compute prices when items change or portfolio data updates
  const [priceRevision, setPriceRevision] = useState(0)
  const [livePrices, setLivePrices] = useState({})
  useEffect(() => {
    const bump = () => setPriceRevision((r) => r + 1)
    window.addEventListener('pt_data_changed', bump)
    return () => window.removeEventListener('pt_data_changed', bump)
  }, [])

  // Fetch live prices from API for items not found in portfolio
  useEffect(() => {
    const missing = items.filter((it) => getCurrentPriceFromPortfolio(it.symbol, it.assetType) == null && it.symbol)
    if (missing.length === 0) return
    const symbols = missing.map((it) => it.symbol)
    api.getBatchPrices(symbols)
      .then((res) => {
        const map = {}
        if (Array.isArray(res)) {
          res.forEach((r) => { if (r.price != null) map[r.symbol] = r.price })
        } else if (res && typeof res === 'object') {
          Object.entries(res).forEach(([sym, data]) => {
            const p = typeof data === 'number' ? data : data?.price ?? data?.regularMarketPrice
            if (p != null) map[sym] = p
          })
        }
        setLivePrices((prev) => ({ ...prev, ...map }))
      })
      .catch(() => { /* backend down, skip */ })
  }, [items, priceRevision])

  const enriched = useMemo(
    () => items.map((item) => ({
      ...item,
      currentPrice: getCurrentPriceFromPortfolio(item.symbol, item.assetType) ?? livePrices[item.symbol] ?? null,
    })),
    [items, priceRevision, livePrices]
  )

  const persist = useCallback((next) => {
    storage.setWatchlist(next)
    setItems(next)
    logAudit('update', 'watchlist', null, null, { count: next.length })
    notifyDataChanged()
  }, [])

  const handleAdd = () => {
    const sym = draft.symbol.trim().toUpperCase()
    const name = draft.name.trim() || sym
    if (!sym) { showToast?.('Symbol is required', 'error'); return }
    if (items.some((i) => i.symbol === sym && i.assetType === draft.assetType)) {
      showToast?.(`${sym} is already on your watchlist`, 'info'); return
    }
    const target = draft.targetPrice !== '' ? parseFloat(draft.targetPrice) : null
    persist([...items, {
      id: uuidv4(), symbol: sym, name, exchange: draft.exchange, assetType: draft.assetType,
      targetPrice: Number.isFinite(target) ? target : null,
      alertEnabled: Number.isFinite(target),
      notes: draft.notes.trim(), addedAt: new Date().toISOString(),
    }])
    setDraft(emptyDraft()); setAdding(false); setSymbolQuery(''); setSearchResults([])
    showToast?.(`${sym} added to watchlist`, 'success')
  }

  const handleRemove = (id) => persist(items.filter((i) => i.id !== id))

  const handleEditSave = () => {
    if (!editDraft) return
    const target = editDraft.targetPrice !== '' ? parseFloat(editDraft.targetPrice) : null
    persist(items.map((i) => i.id === editId
      ? { ...i, name: editDraft.name.trim() || i.name, exchange: editDraft.exchange,
          targetPrice: Number.isFinite(target) ? target : null,
          alertEnabled: Number.isFinite(target), notes: editDraft.notes.trim() }
      : i
    ))
    setEditId(null); setEditDraft(null)
  }

  const handleToggleAlert = (id) =>
    persist(items.map((i) => i.id === id ? { ...i, alertEnabled: !i.alertEnabled } : i))

  return (
    <div className="page watchlist-page">
      <div className="page-header-row">
        <h2 className="section-title">Watchlist</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setEditId(null) }}>
          + Add
        </button>
      </div>

      {adding && (
        <div className="watchlist-form card">
          <h3 className="watchlist-form-title">Add to watchlist</h3>
          <div className="watchlist-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="wl-type">Asset type</label>
              <select id="wl-type" className="form-select" value={draft.assetType}
                onChange={(e) => {
                  const t = e.target.value
                  setDraft((d) => ({ ...d, assetType: t, exchange: DEFAULT_EXCHANGE[t], symbol: '', name: '' }))
                  setSymbolQuery('')
                  setSearchResults([])
                  setShowDropdown(false)
                }}>
                {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wl-symbol">Symbol *</label>
              <div className="search-wrap" ref={searchRef}>
                <input
                  id="wl-symbol"
                  className="form-input"
                  type="text"
                  autoComplete="off"
                  placeholder={SYMBOL_PLACEHOLDER[draft.assetType]}
                  value={symbolQuery}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase()
                    setSymbolQuery(v)
                    setDraft((d) => ({ ...d, symbol: v }))
                  }}
                  onKeyDown={handleSymbolKeyDown}
                  autoFocus
                />
                {showDropdown && (
                  <div className="search-dropdown" role="listbox">
                    {searching && <div className="search-loading">Searching…</div>}
                    {!searching && searchResults.length === 0 && symbolQuery.length >= MIN_SEARCH_LEN && (
                      <div className="search-empty">No results. You can type the symbol manually.</div>
                    )}
                    {searchResults.map((r, i) => (
                      <div
                        key={r.symbol || r.name}
                        className={`search-option${i === activeIdx ? ' active' : ''}`}
                        role="option"
                        aria-selected={i === activeIdx}
                        onMouseDown={(e) => { e.preventDefault(); selectSearchResult(r) }}
                        onMouseEnter={() => setActiveIdx(i)}
                      >
                        <div>
                          <div className="search-option-symbol">{r.symbol}</div>
                          <div className="search-option-name">{r.name}</div>
                        </div>
                        {r.exchange && <span className="search-option-exchange">{r.exchange}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wl-name">Name</label>
              <input id="wl-name" className="form-input" type="text" placeholder="Auto-filled from search"
                value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            {EXCHANGES_BY_TYPE[draft.assetType].length > 0 && (
              <div className="form-group">
                <label className="form-label" htmlFor="wl-exchange">Exchange</label>
                <select id="wl-exchange" className="form-select" value={draft.exchange}
                  onChange={(e) => setDraft((d) => ({ ...d, exchange: e.target.value }))}>
                  {EXCHANGES_BY_TYPE[draft.assetType].map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="wl-target">{TARGET_LABEL[draft.assetType]} — optional</label>
              <input id="wl-target" className="form-input" type="number" min="0" step="any" placeholder="Set to enable alert"
                value={draft.targetPrice} onChange={(e) => setDraft((d) => ({ ...d, targetPrice: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wl-notes">Notes</label>
              <input id="wl-notes" className="form-input" type="text" placeholder="Optional"
                value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
            </div>
          </div>
          <div className="watchlist-form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => {
              setAdding(false)
              setDraft(emptyDraft())
              setSymbolQuery('')
              setSearchResults([])
            }}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleAdd}>Add to watchlist</button>
          </div>
        </div>
      )}

      {enriched.length === 0 && !adding ? (
        <div className="watchlist-empty">
          <div className="placeholder-icon" aria-hidden="true">⭐</div>
          <p>No items yet. Add stocks or funds you&apos;re watching.</p>
        </div>
      ) : (
        <div className="watchlist-list">
          {enriched.map((item) => {
            const status = targetStatus(item.currentPrice, item.targetPrice)
            const isEditing = editId === item.id
            return (
              <div key={item.id} className={`watchlist-card card ${status === 'hit' ? 'watchlist-card--hit' : ''} ${isEditing ? 'watchlist-card--editing' : ''}`}>
                {isEditing ? (
                  <div className="watchlist-edit">
                    <div className="watchlist-edit-header">
                      <span className="watchlist-symbol">{item.symbol}</span>
                      {item.exchange && <span className="badge">{item.exchange}</span>}
                      <span className="watchlist-edit-cur">
                        Current: {item.currentPrice != null
                          ? item.assetType === 'usStock' ? formatUSD(item.currentPrice) : formatINR(item.currentPrice)
                          : '—'}
                      </span>
                    </div>
                    <div className="watchlist-edit-grid">
                      <div className="form-group">
                        <label className="form-label">Name</label>
                        <input className="form-input" type="text" value={editDraft.name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Target</label>
                        <input className="form-input" type="number" min="0" step="any" value={editDraft.targetPrice}
                          placeholder={item.currentPrice != null ? String(item.currentPrice) : ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, targetPrice: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Notes</label>
                        <input className="form-input" type="text" value={editDraft.notes}
                          onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))} />
                      </div>
                    </div>
                    <div className="watchlist-form-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditId(null); setEditDraft(null) }}>Cancel</button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleEditSave}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="watchlist-card-main">
                      <div className="watchlist-card-symbol">
                        <span className="watchlist-symbol">{item.symbol}</span>
                        {item.exchange && <span className="badge">{item.exchange}</span>}
                        <span className="badge badge-muted">{ASSET_TYPES.find((t) => t.value === item.assetType)?.label}</span>
                        {status === 'hit' && <span className="badge badge-success">🎯 Target hit</span>}
                        {status === 'close' && <span className="badge badge-warn">📈 Near target</span>}
                      </div>
                      {item.name !== item.symbol && <div className="watchlist-card-name">{item.name}</div>}
                    </div>
                    <div className="watchlist-card-prices">
                      <div className="watchlist-price-col">
                        <span className="watchlist-price-label">Current</span>
                        <span className="watchlist-price-val">
                          {item.currentPrice != null
                            ? item.assetType === 'usStock' ? formatUSD(item.currentPrice) : formatINR(item.currentPrice)
                            : '—'}
                        </span>
                      </div>
                      {item.targetPrice != null && (
                        <div className="watchlist-price-col">
                          <span className="watchlist-price-label">Target</span>
                          <span className={`watchlist-price-val ${status === 'hit' ? 'pos' : ''}`}>
                            {item.assetType === 'usStock' ? formatUSD(item.targetPrice) : formatINR(item.targetPrice)}
                          </span>
                        </div>
                      )}
                      {item.currentPrice != null && item.targetPrice != null && (
                        <div className="watchlist-price-col">
                          <span className="watchlist-price-label">Gap</span>
                          <span className={`watchlist-price-val ${item.currentPrice >= item.targetPrice ? 'pos' : 'neg'}`}>
                            {(((item.targetPrice - item.currentPrice) / item.currentPrice) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                    {item.notes && <div className="watchlist-card-notes">{item.notes}</div>}
                    <div className="watchlist-card-actions">
                      {item.targetPrice != null && (
                        <button type="button" className={`btn btn-ghost btn-sm`} title={item.alertEnabled ? 'Disable alert' : 'Enable alert'}
                          onClick={() => handleToggleAlert(item.id)} aria-label={item.alertEnabled ? 'Disable price alert' : 'Enable price alert'}>
                          {item.alertEnabled ? '🔔' : '🔕'}
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={() => { setEditId(item.id); setEditDraft({ name: item.name, exchange: item.exchange, targetPrice: item.targetPrice != null ? String(item.targetPrice) : '', notes: item.notes || '' }); setAdding(false) }}
                        aria-label={`Edit ${item.symbol}`}>✏️</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRemove(item.id)} aria-label={`Remove ${item.symbol}`}>✕</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
