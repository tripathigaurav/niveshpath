import { describe, it, expect } from 'vitest'
import { calculateRebalance, equalWeightTargets, currentWeightTargets } from '../utils/rebalancer'

describe('calculateRebalance', () => {
  const allocs = [
    { id: 'a', label: 'A', currentValue: 6000 },
    { id: 'b', label: 'B', currentValue: 4000 },
  ]

  it('returns empty for zero total', () => {
    const result = calculateRebalance([], [])
    expect(result).toEqual({ actions: [], totalValue: 0 })
  })

  it('returns hold when targets match current', () => {
    const targets = [{ id: 'a', targetPct: 60 }, { id: 'b', targetPct: 40 }]
    const result = calculateRebalance(allocs, targets)
    expect(result.totalValue).toBe(10000)
    expect(result.actions[0].action).toBe('hold')
    expect(result.actions[1].action).toBe('hold')
  })

  it('identifies buy and sell', () => {
    const targets = [{ id: 'a', targetPct: 50 }, { id: 'b', targetPct: 50 }]
    const result = calculateRebalance(allocs, targets)
    expect(result.actions[0].action).toBe('sell')
    expect(result.actions[0].delta).toBeCloseTo(-1000, 0)
    expect(result.actions[1].action).toBe('buy')
    expect(result.actions[1].delta).toBeCloseTo(1000, 0)
  })

  it('calculates correct percentages', () => {
    const targets = [{ id: 'a', targetPct: 70 }, { id: 'b', targetPct: 30 }]
    const result = calculateRebalance(allocs, targets)
    expect(result.actions[0].currentPct).toBe(60)
    expect(result.actions[0].targetPct).toBe(70)
    expect(result.actions[0].targetValue).toBeCloseTo(7000, 0)
  })
})

describe('equalWeightTargets', () => {
  it('distributes equally', () => {
    const targets = equalWeightTargets(['a', 'b', 'c'])
    expect(targets).toHaveLength(3)
    expect(targets[0].targetPct).toBeCloseTo(33.33, 1)
  })
})

describe('currentWeightTargets', () => {
  it('mirrors current allocation', () => {
    const allocs = [
      { id: 'a', currentValue: 7500 },
      { id: 'b', currentValue: 2500 },
    ]
    const targets = currentWeightTargets(allocs)
    expect(targets[0].targetPct).toBe(75)
    expect(targets[1].targetPct).toBe(25)
  })

  it('handles zero total', () => {
    const allocs = [
      { id: 'a', currentValue: 0 },
      { id: 'b', currentValue: 0 },
    ]
    const targets = currentWeightTargets(allocs)
    expect(targets[0].targetPct).toBe(0)
  })
})
