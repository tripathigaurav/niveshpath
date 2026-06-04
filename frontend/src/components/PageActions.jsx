/**
 * PageActions — a compact row of contextual tool buttons rendered at the top
 * of each holdings page. Each page declares what actions make sense there.
 *
 * Pattern: pass an `actions` array, never modify the page body.
 * When a page needs more tools, just add items to the array.
 *
 * actions: Array<{ icon: string, label: string, onClick: () => void, disabled?: boolean }>
 */
export default function PageActions({ actions }) {
  if (!actions?.length) return null
  return (
    <div className="page-actions" role="toolbar" aria-label="Page tools">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={a.onClick}
          disabled={a.disabled}
        >
          {a.icon && <span aria-hidden="true">{a.icon}</span>}
          {a.label}
        </button>
      ))}
    </div>
  )
}
