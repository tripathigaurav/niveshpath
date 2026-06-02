export default function LiveBadge({ lastUpdated }) {
  if (!lastUpdated) return null
  return (
    <div className="live-badge">
      <span className="live-dot" aria-hidden="true" />
      Last updated:{' '}
      {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
}
