import { useState, useEffect, useCallback } from 'react'
import { storage } from '../utils/storage'
import { validatePortfolioIntegrity } from '../utils/portfolioValidator'
import { fetchPendingCorporateActions } from '../utils/corporateActions'

export const PT_DATA_CHANGED = 'pt_data_changed'

export function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent(PT_DATA_CHANGED))
}

export function useNotifications(refreshWhenOpen = false) {
  const [validation, setValidation] = useState(() => validatePortfolioIntegrity())
  const [pendingActions, setPendingActions] = useState([])
  const [loadingActions, setLoadingActions] = useState(false)

  const refreshValidation = useCallback(() => {
    setValidation(validatePortfolioIntegrity())
  }, [])

  const refreshActions = useCallback(async () => {
    const holdings = storage.getIndianStocks()
    if (!holdings.length) {
      setPendingActions([])
      return
    }
    setLoadingActions(true)
    try {
      const actions = await fetchPendingCorporateActions(holdings)
      setPendingActions(actions)
    } catch {
      setPendingActions([])
    } finally {
      setLoadingActions(false)
    }
  }, [])

  const refresh = useCallback(() => {
    refreshValidation()
    refreshActions()
  }, [refreshValidation, refreshActions])

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    window.addEventListener('storage', onChange)
    window.addEventListener(PT_DATA_CHANGED, onChange)
    return () => {
      window.removeEventListener('storage', onChange)
      window.removeEventListener(PT_DATA_CHANGED, onChange)
    }
  }, [refresh])

  useEffect(() => {
    if (refreshWhenOpen) refresh()
  }, [refreshWhenOpen, refresh])

  const issueCount = validation?.issues?.length ?? 0
  const actionCount = pendingActions.length
  const totalCount = issueCount + actionCount

  return {
    validation,
    pendingActions,
    loadingActions,
    issueCount,
    actionCount,
    totalCount,
    refresh,
    refreshValidation,
    refreshActions,
  }
}
