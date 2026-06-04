import { storage } from './storage'

/**
 * Encode a compact portfolio snapshot into a URL-safe base64 string.
 * Only includes holdings summary — no transactions, no settings.
 */
function encodePortfolio(data) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
}

function decodePortfolio(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))))
  } catch {
    return null
  }
}

/**
 * Build a compact snapshot from current storage.
 * Format v1: { v:1, d:'YYYY-MM-DD', is:[], us:[], mf:[], oa:[] }
 * Each Indian/US stock: [symbol, name, qty, buyPrice, currentPrice]
 * Each MF: [name, units, buyPrice, nav]
 * Each other asset: [name, currentValue, category]
 */
function buildSnapshot() {
  const indianStocks = storage.getIndianStocks().map((s) => [
    s.symbol,
    s.name,
    s.qty,
    s.buyPrice,
    s.currentPrice ?? null,
  ])
  const usStocks = storage.getUSStocks().map((s) => [
    s.symbol,
    s.name,
    s.qty,
    s.buyPrice,
    s.currentPrice ?? null,
  ])
  const mutualFunds = storage.getMutualFunds().map((s) => [
    s.name,
    s.units ?? s.qty,
    s.buyPrice,
    s.nav ?? s.currentPrice ?? null,
  ])
  const otherAssets = storage.getOtherAssets().map((s) => [
    s.name,
    s.currentValue ?? s.buyPrice,
    s.category ?? '',
  ])

  return {
    v: 1,
    d: new Date().toISOString().slice(0, 10),
    is: indianStocks,
    us: usStocks,
    mf: mutualFunds,
    oa: otherAssets,
  }
}

/**
 * Generate a shareable URL for the current portfolio.
 * The encoded snapshot is embedded in the URL hash: #share/<encoded>
 */
export function generateShareUrl() {
  const snapshot = buildSnapshot()
  const encoded = encodePortfolio(snapshot)
  const base = window.location.href.split('#')[0]
  return `${base}#share/${encoded}`
}

/**
 * If the current URL contains a share snapshot, decode and return it.
 * Returns null if no share param is present or decoding fails.
 */
export function readShareFromUrl() {
  const hash = window.location.hash
  if (!hash.startsWith('#share/')) return null
  const encoded = hash.slice('#share/'.length)
  return decodePortfolio(encoded)
}

/**
 * Expand a decoded snapshot into display-ready holdings arrays.
 */
export function expandSnapshot(snapshot) {
  if (!snapshot || snapshot.v !== 1) return null
  return {
    date: snapshot.d,
    indianStocks: (snapshot.is ?? []).map(([symbol, name, qty, buyPrice, currentPrice]) => ({
      symbol, name, qty, buyPrice, currentPrice,
    })),
    usStocks: (snapshot.us ?? []).map(([symbol, name, qty, buyPrice, currentPrice]) => ({
      symbol, name, qty, buyPrice, currentPrice,
    })),
    mutualFunds: (snapshot.mf ?? []).map(([name, units, buyPrice, nav]) => ({
      name, units, buyPrice, nav,
    })),
    otherAssets: (snapshot.oa ?? []).map(([name, currentValue, category]) => ({
      name, currentValue, category,
    })),
  }
}
