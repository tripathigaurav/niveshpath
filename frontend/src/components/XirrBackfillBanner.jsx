import { dismissXirrBannerForSession } from '../utils/holdingsDates'

export default function XirrBackfillBanner({ missingCount, onDismiss }) {
  if (missingCount <= 0) return null

  const handleDismiss = () => {
    dismissXirrBannerForSession()
    onDismiss?.()
  }

  return (
    <div className="xirr-banner" role="status">
      <div className="xirr-banner-text">
        <strong>XIRR unavailable</strong>
        {' — '}
        {missingCount} holding{missingCount === 1 ? '' : 's'} missing purchase date
        . Edit holdings to add buy dates.
      </div>
      <button type="button" className="btn btn-ghost xirr-banner-dismiss" onClick={handleDismiss}>
        Dismiss
      </button>
    </div>
  )
}
