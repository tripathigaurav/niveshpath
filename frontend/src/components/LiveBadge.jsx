export default function LiveBadge({ lastUpdated, loading = false }) {
  if (loading) {
    return (
      <div className="live-badge live-badge--loading" aria-live="polite">
        <span className="btn-spinner live-badge-spinner" aria-hidden="true" />
        Updating…
      </div>
    )
  }
  if (!lastUpdated) return null
  return (
    <div className="live-badge">
      <span className="live-dot" aria-hidden="true" />
      Last updated:{' '}
      {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
}
