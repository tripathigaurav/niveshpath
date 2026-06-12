import { useState, useEffect, useCallback } from 'react'
import { validatePortfolioIntegrity, autoFixIssues } from '../utils/portfolioValidator'

function issueLabel(issue) {
  switch (issue.type) {
    case 'quantity_mismatch':
      return `${issue.symbol}: holding qty ${issue.actual} vs ledger ${issue.expected}`
    case 'quantity_mismatch_aggregate':
      return issue.message || `${issue.symbol}: lots total ${issue.actual} vs ledger ${issue.expected}`
    case 'orphaned_transaction':
      return `${issue.symbol}: transaction linked to removed holding`
    case 'negative_quantity':
      return `${issue.symbol}: sold more than owned on ${issue.date}`
    case 'missing_buy_date':
      return `${issue.symbol}: missing buy date (XIRR unavailable)`
    case 'empty_transaction_log':
      return issue.message
    default:
      return issue.type
  }
}

export default function PortfolioHealthWidget({ showToast, onFixed }) {
  const [validation, setValidation] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const runValidation = useCallback(() => {
    setValidation(validatePortfolioIntegrity())
  }, [])

  useEffect(() => {
    runValidation()
    const onStorage = () => runValidation()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [runValidation])

  if (!validation) return null

  const fixable = validation.issues.filter((i) => i.fix)
  const hasIssues = validation.issues.length > 0

  const handleAutoFix = () => {
    if (!fixable.length) {
      showToast?.('No auto-fixable issues', 'info')
      return
    }
    const fixed = autoFixIssues(fixable)
    showToast?.(`Fixed ${fixed} issue(s)`, 'success')
    runValidation()
    onFixed?.()
  }

  if (!hasIssues) {
    return (
      <div className="portfolio-health portfolio-health--ok" role="status">
        <span className="health-icon" aria-hidden="true">✓</span>
        <div>
          <div className="health-title">Portfolio Health</div>
          <div className="health-subtitle">All checks passed</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`portfolio-health ${validation.healthy ? 'portfolio-health--warn' : 'portfolio-health--error'}`}>
      <div className="portfolio-health-head">
        <span className="health-icon" aria-hidden="true">{validation.healthy ? '!' : '✕'}</span>
        <div>
          <div className="health-title">Portfolio Health</div>
          <div className="health-subtitle">
            {validation.summary.errors} error{validation.summary.errors !== 1 ? 's' : ''}
            {validation.summary.warnings > 0 &&
              ` · ${validation.summary.warnings} warning${validation.summary.warnings !== 1 ? 's' : ''}`}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>
      {expanded && (
        <ul className="portfolio-health-list">
          {validation.issues.map((issue, i) => (
            <li key={`${issue.type}-${issue.symbol || issue.transactionId || i}`} className={`health-issue health-issue--${issue.severity}`}>
              {issueLabel(issue)}
            </li>
          ))}
        </ul>
      )}
      {fixable.length > 0 && (
        <button type="button" className="btn btn-secondary btn-sm portfolio-health-fix" onClick={handleAutoFix}>
          Auto-fix {fixable.length} issue{fixable.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
