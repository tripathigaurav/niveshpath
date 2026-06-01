export default function PnlBadge({ value, pct }) {
  if (value === null || value === undefined) {
    return <span className="pnl-badge neutral">—</span>
  }
  const cls = value > 0 ? 'gain' : value < 0 ? 'loss' : 'neutral'
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`pnl-badge ${cls}`}>
      {sign}{pct != null ? pct.toFixed(2) + '%' : '—'}
    </span>
  )
}
