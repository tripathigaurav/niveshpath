export default function SkeletonRows({ count = 4, cols = 9 }) {
  const widths = [70, 130, 50, 90, 90, 100, 100, 80, 70]
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
