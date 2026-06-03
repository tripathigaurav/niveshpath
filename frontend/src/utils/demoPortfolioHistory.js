/** Deterministic noise in [0, 1) from a date string */
function hash01(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return (Math.abs(h) % 10000) / 10000
}

/**
 * Synthetic daily portfolio values for demos (smooth growth + realistic wiggles).
 * @param {{ endValue: number, days?: number, startRatio?: number }} opts
 * @returns {{ date: string, value: number }[]}
 */
export function generateDemoSnapshotSeries({
  endValue,
  days = 365 * 5,
  startRatio = 0.52,
}) {
  if (!endValue || endValue <= 0) return []

  const count = Math.max(2, Math.floor(days))
  const start = endValue * startRatio
  const points = []
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    const t = count <= 1 ? 1 : (count - 1 - i) / (count - 1)
    const trend = start + (endValue - start) * Math.pow(t, 0.92)
    const wave = Math.sin(i * 0.11) * endValue * 0.018
    const noise = (hash01(date) - 0.5) * endValue * 0.012
    const dip = Math.sin(i * 0.037) * endValue * 0.008
    let value = trend + wave + noise + dip
    value = Math.max(start * 0.88, value)
    points.push({
      date,
      value: Math.round(value * 100) / 100,
    })
  }

  points[points.length - 1].value = Math.round(endValue * 100) / 100
  return points
}

/** Rough INR total from sample holdings (invested + modest mark-up). */
export function estimateSamplePortfolioValueINR(usdInr = 83) {
  const indianInvested = 10 * 2450 + 5 * 3800 + 20 * 1650 + 50 * 245 + 40 * 54
  const usInvestedUSD = 15 * 175 + 8 * 380 + 12 * 420 + 25 * 142
  const mfInvested = 120.5 * 68.25 + 85.2 * 82.1
  const otherValue = 525000
  const base = indianInvested + usInvestedUSD * usdInr + mfInvested + otherValue
  return Math.round(base * 1.08)
}
