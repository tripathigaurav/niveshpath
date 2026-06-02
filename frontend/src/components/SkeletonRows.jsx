export default function SkeletonRows({ count = 4, cols = 9 }) {
  const widths = [120, 70, 50, 80, 90, 70, 60, 90, 80, 80, 60]
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="skeleton-row">
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className={j > 2 ? 'right' : ''}>
          <span className="skeleton skeleton-cell" style={{ width: widths[j] ?? 80 }} />
        </td>
      ))}
    </tr>
  ))
}
