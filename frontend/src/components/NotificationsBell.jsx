import { useState, useRef, useCallback } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import { useNotifications, notifyDataChanged } from '../hooks/useNotifications'
import { autoFixIssues } from '../utils/portfolioValidator'
import { issueLabel } from '../utils/portfolioHealthLabels'
import { storage } from '../utils/storage'
import {
  applyCorporateAction,
  skipCorporateAction,
  describeCorporateActionConfirm,
} from '../utils/corporateActions'
import ConfirmDialog from './ConfirmDialog'

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2a5 5 0 00-5 5v2.2c0 .9-.3 1.8-.9 2.5L4.4 14.8A1.5 1.5 0 005.7 17h12.6a1.5 1.5 0 001.3-2.2l-1.7-2.1a4 4 0 01-.9-2.5V7a5 5 0 00-5-5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function NotificationsBell({ showToast }) {
  const [open, setOpen] = useState(false)
  const [corpConfirm, setCorpConfirm] = useState(null) // { action, mode: 'apply' | 'skip' }
  const wrapRef = useRef(null)
  const {
    validation,
    pendingActions,
    loadingActions,
    issueCount,
    actionCount,
    totalCount,
    refresh,
    refreshValidation,
  } = useNotifications(open)

  const close = useCallback(() => setOpen(false), [])
  useClickOutside(wrapRef, close, open)

  const fixable = validation?.issues?.filter((i) => i.fix) ?? []

  const handleAutoFix = () => {
    if (!fixable.length) {
      showToast?.('No auto-fixable issues', 'info')
      return
    }
    const fixed = autoFixIssues(fixable)
    showToast?.(`Fixed ${fixed} issue(s)`, 'success')
    refreshValidation()
    notifyDataChanged()
  }

  const requestCorpConfirm = (action, mode) => {
    setCorpConfirm({ action, mode })
  }

  const handleCorpConfirm = () => {
    if (!corpConfirm) return
    const { action, mode } = corpConfirm
    const holding = storage.getIndianStocks().find((s) => s.id === action.holdingId)
    setCorpConfirm(null)

    if (mode === 'skip') {
      skipCorporateAction(action)
      showToast?.(`Skipped ${action.type} for ${action.symbol}`, 'info')
      refresh()
      notifyDataChanged()
      return
    }

    if (!holding) {
      showToast?.('Holding not found', 'error')
      return
    }
    const ok = applyCorporateAction(holding, action)
    if (ok) {
      showToast?.(`Applied ${action.type} for ${action.symbol}`, 'success')
      refresh()
      refreshValidation()
      notifyDataChanged()
    } else {
      showToast?.('Could not apply action', 'error')
    }
  }

  const corpDialogCopy = corpConfirm
    ? (() => {
        const holding = storage.getIndianStocks().find((s) => s.id === corpConfirm.action.holdingId)
        const copy = describeCorporateActionConfirm(corpConfirm.action, holding)
        if (corpConfirm.mode === 'apply') {
          return {
            title: copy.applyTitle,
            message: copy.applyMessage,
            confirmLabel: 'Apply',
            confirmClassName: 'btn-primary',
            icon: '📈',
          }
        }
        return {
          title: copy.skipTitle,
          message: copy.skipMessage,
          confirmLabel: 'Skip',
          confirmClassName: 'btn-secondary',
          icon: '⏭️',
        }
      })()
    : null

  return (
    <>
      <div className="notif-bell-wrap" ref={wrapRef}>
        <button
          type="button"
          className={`notif-bell-btn${open ? ' notif-bell-btn--open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={totalCount > 0 ? `${totalCount} notifications` : 'Notifications'}
          aria-expanded={open}
          aria-haspopup="true"
          title="Alerts & portfolio checks"
        >
          <BellIcon />
          {totalCount > 0 && (
            <span className="notif-bell-badge" aria-hidden="true">
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </button>

        {open && (
          <div className="notif-panel" role="dialog" aria-label="Notifications">
            <div className="notif-panel-head">
              <span className="notif-panel-title">Alerts</span>
              {loadingActions && <span className="notif-panel-loading">Updating…</span>}
            </div>

            {totalCount === 0 && !loadingActions && (
              <p className="notif-empty">You&apos;re all caught up — no issues or pending actions.</p>
            )}

            {issueCount > 0 && (
              <section className="notif-section">
                <div className="notif-section-head">
                  <span className="notif-section-title">Portfolio health</span>
                  <span className={`notif-pill notif-pill--${validation.healthy ? 'warn' : 'error'}`}>
                    {validation.summary.errors} error{validation.summary.errors !== 1 ? 's' : ''}
                    {validation.summary.warnings > 0 &&
                      ` · ${validation.summary.warnings} warn`}
                  </span>
                </div>
                <ul className="notif-list">
                  {validation.issues.map((issue, i) => (
                    <li
                      key={`${issue.type}-${issue.symbol || issue.transactionId || i}`}
                      className={`notif-list-item notif-list-item--${issue.severity}`}
                    >
                      {issueLabel(issue)}
                    </li>
                  ))}
                </ul>
                {fixable.length > 0 && (
                  <button type="button" className="btn btn-secondary btn-sm notif-action-btn" onClick={handleAutoFix}>
                    Auto-fix {fixable.length} issue{fixable.length !== 1 ? 's' : ''}
                  </button>
                )}
              </section>
            )}

            {actionCount > 0 && (
              <section className="notif-section">
                <div className="notif-section-head">
                  <span className="notif-section-title">Corporate actions</span>
                  <span className="notif-pill">{actionCount}</span>
                </div>
                <ul className="notif-list notif-list--actions">
                  {pendingActions.map((action) => (
                    <li key={action.id} className="notif-action-row">
                      <div className="notif-action-text">
                        <span className="notif-action-symbol">{action.symbol}</span>
                        <span className="notif-action-detail">{action.detail}</span>
                        <span className="notif-action-date">{action.date}</span>
                      </div>
                      <div className="notif-action-btns">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => requestCorpConfirm(action, 'apply')}
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => requestCorpConfirm(action, 'skip')}
                        >
                          Skip
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {corpConfirm && corpDialogCopy && (
        <ConfirmDialog
          title={corpDialogCopy.title}
          message={corpDialogCopy.message}
          confirmLabel={corpDialogCopy.confirmLabel}
          confirmClassName={corpDialogCopy.confirmClassName}
          icon={corpDialogCopy.icon}
          onConfirm={handleCorpConfirm}
          onCancel={() => setCorpConfirm(null)}
        />
      )}
    </>
  )
}
