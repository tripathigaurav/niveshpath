import { storage } from './storage'

const XIRR_BANNER_KEY = 'pt_xirr_banner_dismissed'

function missingDate(item) {
  return !item.buyDate || !String(item.buyDate).trim()
}

export function countHoldingsMissingBuyDate() {
  const indian = storage.getIndianStocks().filter(missingDate)
  const us = storage.getUSStocks().filter(missingDate)
  const mutual = storage.getMutualFunds().filter(missingDate)
  return {
    total: indian.length + us.length + mutual.length,
    indian: indian.length,
    us: us.length,
    mutual: mutual.length,
  }
}

export function shouldShowXirrBackfillBanner() {
  if (isXirrBannerDismissedThisSession()) return false
  return countHoldingsMissingBuyDate().total > 0
}

export function dismissXirrBannerForSession() {
  try {
    sessionStorage.setItem(XIRR_BANNER_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isXirrBannerDismissedThisSession() {
  try {
    return sessionStorage.getItem(XIRR_BANNER_KEY) === '1'
  } catch {
    return false
  }
}
