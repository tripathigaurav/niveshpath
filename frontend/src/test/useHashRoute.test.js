import { renderHook, act } from '@testing-library/react'
import { useHashRoute } from '../hooks/useHashRoute'

describe('useHashRoute', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  test('defaults to indianStocks when no hash', () => {
    const { result } = renderHook(() => useHashRoute())
    expect(result.current[0]).toBe('indianStocks')
  })

  test('reads hash on mount', () => {
    window.location.hash = '#/us-stocks'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current[0]).toBe('usStocks')
  })

  test('setActiveTab updates hash', () => {
    const { result } = renderHook(() => useHashRoute())
    act(() => result.current[1]('mutualFunds'))
    expect(result.current[0]).toBe('mutualFunds')
    expect(window.location.hash).toBe('#/mutual-funds')
  })

  test('unknown hash falls back to default', () => {
    window.location.hash = '#/nonexistent'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current[0]).toBe('indianStocks')
  })
})
