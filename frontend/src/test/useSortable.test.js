import { renderHook, act } from '@testing-library/react'
import { useSortable } from '../hooks/useSortable'

describe('useSortable', () => {
  const items = [
    { name: 'RELIANCE', value: 2500, pnl: 10 },
    { name: 'TCS', value: 3200, pnl: -5 },
    { name: 'INFY', value: 1500, pnl: 25 },
  ]

  beforeEach(() => {
    localStorage.clear()
  })

  test('sorts by default key descending', () => {
    const { result } = renderHook(() => useSortable(items, 'value', 'desc', undefined, 'test-desc'))
    expect(result.current.sorted[0].name).toBe('TCS')
    expect(result.current.sorted[2].name).toBe('INFY')
  })

  test('toggles direction on same key click', () => {
    const { result } = renderHook(() => useSortable(items, 'value', 'desc', undefined, 'test-toggle'))
    act(() => result.current.setSort('value'))
    expect(result.current.sortDir).toBe('asc')
    expect(result.current.sorted[0].name).toBe('INFY')
  })

  test('resets to default direction on new key', () => {
    const { result } = renderHook(() => useSortable(items, 'value', 'desc', undefined, 'test-newkey'))
    act(() => result.current.setSort('name'))
    expect(result.current.sortKey).toBe('name')
    expect(result.current.sortDir).toBe('desc')
  })

  test('sorts strings alphabetically ascending', () => {
    const { result } = renderHook(() => useSortable(items, 'name', 'asc', undefined, 'test-name-asc'))
    expect(result.current.sorted[0].name).toBe('INFY')
    expect(result.current.sorted[2].name).toBe('TCS')
  })

  test('handles null values (pushed to end)', () => {
    const withNull = [...items, { name: 'NULL_PRICE', value: null, pnl: 0 }]
    const { result } = renderHook(() => useSortable(withNull, 'value', 'desc', undefined, 'test-null'))
    expect(result.current.sorted[3].name).toBe('NULL_PRICE')
  })

  test('empty array returns empty', () => {
    const { result } = renderHook(() => useSortable([], 'value', 'desc', undefined, 'test-empty'))
    expect(result.current.sorted).toEqual([])
  })

  test('namespaces keep sort preferences independent', () => {
    const hookA = renderHook(() => useSortable(items, 'value', 'desc', undefined, 'ns-a'))
    act(() => hookA.result.current.setSort('value'))
    expect(hookA.result.current.sortDir).toBe('asc')

    const hookB = renderHook(() => useSortable(items, 'value', 'desc', undefined, 'ns-b'))
    expect(hookB.result.current.sortDir).toBe('desc')
  })
})
