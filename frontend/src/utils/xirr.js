const MS_PER_DAY = 86400000
const MIN_HOLDING_DAYS = 7
const MAX_ITERATIONS = 50

/**
 * @param {{ date: string, amount: number }[]} cashflows — negative outflows, positive inflows
 * @returns {number|null} annual rate as decimal (0.15 = 15%), or null if undefined
 */
export function calcXirr(cashflows, { guess = 0.1 } = {}) {
  if (!cashflows?.length || cashflows.length < 2) return null

  const parsed = cashflows
    .map((cf) => ({
      t: new Date(cf.date).getTime(),
      amount: Number(cf.amount),
    }))
    .filter((cf) => !Number.isNaN(cf.t) && !Number.isNaN(cf.amount))

  if (parsed.length < 2) return null

  const dates = parsed.map((p) => p.t)
  const amounts = parsed.map((p) => p.amount)
  const d0 = Math.min(...dates)
  const daySpan = (Math.max(...dates) - d0) / MS_PER_DAY
  if (daySpan < MIN_HOLDING_DAYS) return null

  const hasPos = amounts.some((a) => a > 0)
  const hasNeg = amounts.some((a) => a < 0)
  if (!hasPos || !hasNeg) return null

  const yearFraction = (t) => (t - d0) / MS_PER_DAY / 365

  function npv(rate) {
    if (rate <= -1) return Number.POSITIVE_INFINITY
    return parsed.reduce((sum, cf) => {
      const y = yearFraction(cf.t)
      return sum + cf.amount / (1 + rate) ** y
    }, 0)
  }

  function dnpv(rate) {
    if (rate <= -1) return 0
    return parsed.reduce((sum, cf) => {
      const y = yearFraction(cf.t)
      return sum - (y * cf.amount) / (1 + rate) ** (y + 1)
    }, 0)
  }

  let rate = guess
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const f = npv(rate)
    const df = dnpv(rate)
    if (!Number.isFinite(f) || !Number.isFinite(df) || Math.abs(df) < 1e-12) return null
    const next = rate - f / df
    if (!Number.isFinite(next)) return null
    if (Math.abs(next - rate) < 1e-7) {
      if (next <= -0.9999 || next > 10) return null
      return Math.round(next * 1000000) / 1000000
    }
    rate = Math.max(-0.99, Math.min(10, next))
  }
  return null
}
