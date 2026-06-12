import {
  marketDataExtendedUnavailableMessage,
  marketDataIssueMessage,
  marketDataIssueTitle,
  portfolioMarketDataIssueMessage,
  portfolioMarketDataIssueTitle,
} from '../utils/holdingTabMessages'

/**
 * Highlighted banner when live prices/NAVs are missing — never show wrong P&L/chart data.
 */
export default function HoldingsDataIssue({
  assetType = 'indianStock',
  status,
  context = 'holdings',
  portfolioIssues = null,
  onRetry,
  loading = false,
  className = '',
}) {
  if (!status || status.ready) return null

  const title =
    status?.code === 'extended_missing' && context === 'market'
      ? 'Some market columns unavailable'
      : context === 'portfolio' && portfolioIssues?.length
        ? portfolioMarketDataIssueTitle(portfolioIssues)
        : marketDataIssueTitle(assetType, status, context)
  const message =
    status?.code === 'extended_missing' && context === 'market'
      ? marketDataExtendedUnavailableMessage(assetType)
      : context === 'portfolio' && portfolioIssues?.length
        ? portfolioMarketDataIssueMessage(portfolioIssues)
        : marketDataIssueMessage(assetType, status, context)
  const level = status.level || 'error'

  return (
    <div
      className={`holdings-data-issue holdings-data-issue--${level}${className ? ` ${className}` : ''}`}
      role="alert"
    >
      <div className="holdings-data-issue-body">
        <span className="holdings-data-issue-icon" aria-hidden="true">
          {level === 'warning' ? '⚠' : '✕'}
        </span>
        <div className="holdings-data-issue-text">
          <strong className="holdings-data-issue-title">{title}</strong>
          <p className="holdings-data-issue-message">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          className="btn btn-secondary btn-sm holdings-data-issue-retry"
          onClick={onRetry}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Updating…
            </>
          ) : (
            '↻ Retry'
          )}
        </button>
      )}
    </div>
  )
}
