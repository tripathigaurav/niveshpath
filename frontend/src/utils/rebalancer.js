/**
 * Portfolio rebalancing calculator utility.
 * Compares current allocation percentages against user-defined targets
 * and computes buy/sell actions to reach the target.
 */

/**
 * @param {Array<{id: string, label: string, currentValue: number}>} allocations
 * @param {Array<{id: string, targetPct: number}>} targets  — percentages summing to 100
 * @returns {{ actions: Array<{id, label, currentPct, targetPct, currentValue, targetValue, delta, action}>, totalValue: number }}
 */
export function calculateRebalance(allocations, targets) {
  const totalValue = allocations.reduce((s, a) => s + (a.currentValue || 0), 0)
  if (totalValue <= 0) return { actions: [], totalValue: 0 }

  const targetMap = new Map(targets.map((t) => [t.id, t.targetPct]))

  const actions = allocations.map((a) => {
    const currentPct = (a.currentValue / totalValue) * 100
    const targetPct = targetMap.get(a.id) ?? currentPct
    const targetValue = (targetPct / 100) * totalValue
    const delta = targetValue - a.currentValue

    let action = 'hold'
    if (Math.abs(delta) > 0.5) {
      action = delta > 0 ? 'buy' : 'sell'
    }

    return {
      id: a.id,
      label: a.label,
      currentPct: Math.round(currentPct * 100) / 100,
      targetPct: Math.round(targetPct * 100) / 100,
      currentValue: a.currentValue,
      targetValue: Math.round(targetValue * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      action,
    }
  })

  return { actions, totalValue }
}

/**
 * Equal-weight targets for a set of category IDs.
 * @param {string[]} ids
 * @returns {Array<{id: string, targetPct: number}>}
 */
export function equalWeightTargets(ids) {
  const pct = Math.round((100 / ids.length) * 100) / 100
  return ids.map((id) => ({ id, targetPct: pct }))
}

/**
 * Derive targets matching current allocation (use as "reset" baseline).
 * @param {Array<{id: string, currentValue: number}>} allocations
 * @returns {Array<{id: string, targetPct: number}>}
 */
export function currentWeightTargets(allocations) {
  const total = allocations.reduce((s, a) => s + (a.currentValue || 0), 0)
  if (total <= 0) return allocations.map((a) => ({ id: a.id, targetPct: 0 }))
  return allocations.map((a) => ({
    id: a.id,
    targetPct: Math.round(((a.currentValue / total) * 100) * 100) / 100,
  }))
}
