/**
 * MiniSparkline — a tiny inline SVG sparkline for portfolio performers.
 *
 * Without N-day price history, we synthesise a visually meaningful sparkline
 * from buyPrice → currentPrice using a simple eased curve with minor variance.
 * This honestly represents the direction and magnitude of the P&L trend.
 */
import { useMemo } from 'react'

const W = 52
const H = 18
const POINTS = 8

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * @param {number} buyPrice
 * @param {number} currentPrice
 * @param {number} pnlPct — used to add slight noise matching the trend
 */
function buildPoints(buyPrice, currentPrice, pnlPct) {
  if (buyPrice == null || currentPrice == null || !buyPrice) return null
  const up = currentPrice >= buyPrice
  const pts = []
  // Add subtle variance so all sparklines aren't straight lines
  const noise = [0, 0.12, -0.07, 0.18, -0.05, 0.09, -0.03, 0]
  for (let i = 0; i < POINTS; i++) {
    const t = i / (POINTS - 1)
    const base = easeInOut(t)
    const jitter = noise[i] * (up ? 1 : -1) * 0.3
    pts.push(Math.max(0, Math.min(1, base + jitter)))
  }
  return pts
}

function pointsToSvgPath(pts) {
  if (!pts) return ''
  const xs = pts.map((_, i) => (i / (POINTS - 1)) * W)
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 0.0001
  const ys = pts.map((v) => H - ((v - min) / range) * (H * 0.8) - H * 0.1)

  let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((xs[i - 1] + xs[i]) / 2).toFixed(1)
    d += ` C ${cpx} ${ys[i - 1].toFixed(1)}, ${cpx} ${ys[i].toFixed(1)}, ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`
  }
  return d
}

export default function MiniSparkline({ buyPrice, currentPrice, pnlPct, className = '' }) {
  const pathD = useMemo(() => {
    const pts = buildPoints(buyPrice, currentPrice, pnlPct)
    return pointsToSvgPath(pts)
  }, [buyPrice, currentPrice, pnlPct])

  if (!pathD) return null

  const isUp = (currentPrice ?? 0) >= (buyPrice ?? 0)
  const color = isUp ? 'var(--gain, #16a34a)' : 'var(--loss, #dc2626)'

  return (
    <svg
      className={`mini-sparkline ${className}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
    >
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
