import SortIcon from './SortIcon'

export default function SortTh({ col, label, children, className = '', sortKey, sortDir, setSort }) {
  const text = label ?? children
  const ariaSort =
    sortKey === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <th
      className={`sortable-th${className ? ` ${className}` : ''}`}
      onClick={() => setSort(col)}
      aria-sort={ariaSort}
    >
      {text}
      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  )
}
