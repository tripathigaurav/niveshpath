import { useRef } from 'react'
import { FixedSizeList } from 'react-window'

const VIRTUALIZE_THRESHOLD = 50
const DEFAULT_ROW_HEIGHT = 44

/**
 * VirtualizedTable — renders a standard `<table>` for small lists
 * and switches to a react-window FixedSizeList for large lists.
 *
 * Props:
 * - items        — sorted array of data objects
 * - renderRow    — (item, index) => <tr>...</tr>  (used for normal table)
 * - renderVRow   — ({ index, style }) => <div style={style}>...</div>  (used for virtual list)
 * - header       — <thead>...</thead> JSX
 * - colgroup     — <colgroup>...</colgroup> JSX
 * - caption      — accessible caption text
 * - className    — extra class on <table> / wrapper
 * - rowHeight    — pixel height per row (default 44)
 * - maxHeight    — max list height in px (default 600)
 * - threshold    — row count to trigger virtualization (default 50)
 * - loading      — if true, render loadingContent instead
 * - loadingContent — JSX for loading state
 * - emptyContent — JSX for empty state
 */
export default function VirtualizedTable({
  items,
  renderRow,
  renderVRow,
  header,
  colgroup,
  caption,
  className = '',
  rowHeight = DEFAULT_ROW_HEIGHT,
  maxHeight = 600,
  threshold = VIRTUALIZE_THRESHOLD,
  loading,
  loadingContent,
  emptyContent,
}) {
  const listRef = useRef(null)

  // Loading state — always use normal table
  if (loading) {
    return (
      <table className={className}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {colgroup}
        {header}
        <tbody>{loadingContent}</tbody>
      </table>
    )
  }

  // Empty state
  if (!items.length) {
    return (
      <table className={className}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {colgroup}
        {header}
        <tbody>{emptyContent}</tbody>
      </table>
    )
  }

  // Below threshold — normal table
  if (items.length <= threshold || !renderVRow) {
    return (
      <table className={className}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {colgroup}
        {header}
        <tbody>
          {items.map((item, i) => renderRow(item, i))}
        </tbody>
      </table>
    )
  }

  // Above threshold — virtualized
  const listHeight = Math.min(items.length * rowHeight, maxHeight)

  return (
    <div className="virtualized-table-wrap">
      <table className={className} aria-hidden="true" style={{ tableLayout: 'fixed' }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {colgroup}
        {header}
      </table>
      <FixedSizeList
        ref={listRef}
        height={listHeight}
        itemCount={items.length}
        itemSize={rowHeight}
        width="100%"
        itemData={items}
        overscanCount={10}
        style={{ overflowX: 'hidden' }}
      >
        {renderVRow}
      </FixedSizeList>
    </div>
  )
}
