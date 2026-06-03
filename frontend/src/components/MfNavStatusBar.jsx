import { getPortfolioNavSummary, formatNavStatusLine } from '../utils/mfNavDisplay'

export default function MfNavStatusBar({ funds }) {
  if (!funds.length) return null

  const line = formatNavStatusLine(getPortfolioNavSummary(funds))

  return (
    <p className="mf-nav-status-bar" role="note">
      {line}
    </p>
  )
}
