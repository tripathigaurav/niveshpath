import { useState, useMemo } from 'react'

/**
 * useSortable — sort a list with localStorage persistence.
 * @param {Array} items - items to sort
 * @param {string} defaultKey - default sort field
 * @param {string} defaultDir - 'asc' | 'desc'
 * @param {Function} getSortVal - optional (item, key) => comparable value
 */
export function useSortable(items, defaultKey, defaultDir = 'desc', getSortVal) {
  const storageKey = `pt_sort_${defaultKey}`

  const [sortKey, setSortKey] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      return saved?.key || defaultKey
    } catch {
      return defaultKey
    }
  })

  const [sortDir, setSortDir] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      return saved?.dir || defaultDir
    } catch {
      return defaultDir
    }
  })

  const setSort = (key) => {
    const newDir = key === sortKey
      ? (sortDir === 'asc' ? 'desc' : 'asc')
      : defaultDir
    setSortKey(key)
    setSortDir(newDir)
    try {
      localStorage.setItem(storageKey, JSON.stringify({ key, dir: newDir }))
    } catch { /* ignore */ }
  }

  const sorted = useMemo(() => {
    if (!items.length) return items
    const getVal = getSortVal || ((item, k) => item[k])
    return [...items].sort((a, b) => {
      const aVal = getVal(a, sortKey)
      const bVal = getVal(b, sortKey)
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
      return sortDir === 'asc' ? cmp : -cmp
    })
  // getSortVal intentionally omitted — callers use useCallback for stability
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortKey, sortDir])

  return { sorted, sortKey, sortDir, setSort }
}
