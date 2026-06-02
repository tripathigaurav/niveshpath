export default function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <span className="sort-icon neutral">⇅</span>
  return (
    <span className="sort-icon active">
      {sortDir === 'asc' ? '▲' : '▼'}
    </span>
  )
}
