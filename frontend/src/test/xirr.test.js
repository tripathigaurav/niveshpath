import { describe, it, expect } from 'vitest'
import { calcXirr } from '../utils/xirr'

describe('calcXirr', () => {
  it('returns insufficient_data for empty array', () => {
    expect(calcXirr([])).toEqual({ value: null, reason: 'insufficient_data' })
  })

  it('returns insufficient_data for single cashflow', () => {
    expect(calcXirr([{ date: '2024-01-01', amount: -1000 }])).toEqual({
      value: null,
      reason: 'insufficient_data',
    })
  })

  it('returns too_recent for holding < 7 days', () => {
    const result = calcXirr([
      { date: '2024-06-10', amount: -1000 },
      { date: '2024-06-12', amount: 1010 },
    ])
    expect(result.value).toBeNull()
    expect(result.reason).toBe('too_recent')
  })

  it('returns no_positive_flow if all outflows', () => {
    const result = calcXirr([
      { date: '2024-01-01', amount: -1000 },
      { date: '2024-06-01', amount: -500 },
    ])
    expect(result).toEqual({ value: null, reason: 'no_positive_flow' })
  })

  it('returns no_negative_flow if all inflows', () => {
    const result = calcXirr([
      { date: '2024-01-01', amount: 1000 },
      { date: '2024-06-01', amount: 500 },
    ])
    expect(result).toEqual({ value: null, reason: 'no_negative_flow' })
  })

  it('converges for a simple gain', () => {
    const result = calcXirr([
      { date: '2023-01-01', amount: -10000 },
      { date: '2024-01-01', amount: 11500 },
    ])
    expect(result.reason).toBeNull()
    expect(result.value).toBeCloseTo(0.15, 2)
  })

  it('converges for a simple loss', () => {
    const result = calcXirr([
      { date: '2023-01-01', amount: -10000 },
      { date: '2024-01-01', amount: 9000 },
    ])
    expect(result.reason).toBeNull()
    expect(result.value).toBeCloseTo(-0.1, 2)
  })

  it('handles multiple cashflows (SIP pattern)', () => {
    const result = calcXirr([
      { date: '2023-01-01', amount: -1000 },
      { date: '2023-04-01', amount: -1000 },
      { date: '2023-07-01', amount: -1000 },
      { date: '2023-10-01', amount: -1000 },
      { date: '2024-01-01', amount: 4600 },
    ])
    expect(result.reason).toBeNull()
    expect(result.value).toBeGreaterThan(0)
  })

  it('returns diverged or out_of_range for extreme rate', () => {
    const result = calcXirr([
      { date: '2023-01-01', amount: -1 },
      { date: '2024-01-01', amount: 100000 },
    ])
    expect(result.value).toBeNull()
    expect(['diverged', 'out_of_range']).toContain(result.reason)
  })

  it('filters invalid date/amount entries', () => {
    const result = calcXirr([
      { date: 'invalid', amount: -1000 },
      { date: '2023-01-01', amount: NaN },
      { date: '2023-01-01', amount: -1000 },
      { date: '2024-01-01', amount: 1100 },
    ])
    expect(result.reason).toBeNull()
    expect(result.value).toBeCloseTo(0.1, 2)
  })
})
