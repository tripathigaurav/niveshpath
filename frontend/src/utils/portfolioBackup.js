import { storage } from './storage'
import { getSamplePortfolio } from '../data/samplePortfolio'

export const BACKUP_FILE_VERSION = 1
const BACKUP_REMINDER_KEY = 'pt_backup_reminder_shown'

const CATEGORY_LABELS = {
  indianStocks: 'Indian Stocks',
  usStocks: 'US Stocks',
  mutualFunds: 'Mutual Funds',
  otherAssets: 'Other Assets',
}

const CATEGORY_SLUGS = {
  indianStocks: 'indianstocks',
  usStocks: 'usstocks',
  mutualFunds: 'mutualfunds',
  otherAssets: 'otherassets',
}

export const CATEGORIES = Object.keys(CATEGORY_LABELS).map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
  slug: CATEGORY_SLUGS[key],
}))

export function buildExportPayload() {
  return {
    version: BACKUP_FILE_VERSION,
    app: 'niveshpath',
    ...storage.exportAll(),
  }
}

function triggerDownload(json, filename) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadPortfolioBackup() {
  const date = new Date().toISOString().slice(0, 10)
  triggerDownload(JSON.stringify(buildExportPayload(), null, 2), `niveshpath-backup-${date}.json`)
}

export function downloadCategoryBackup(cat) {
  const slug = CATEGORY_SLUGS[cat]
  if (!slug) throw new Error(`Unknown category: ${cat}`)
  const payload = {
    version: BACKUP_FILE_VERSION,
    app: 'niveshpath',
    ...storage.exportCategory(cat),
  }
  const date = new Date().toISOString().slice(0, 10)
  triggerDownload(JSON.stringify(payload, null, 2), `niveshpath-${slug}-${date}.json`)
}

export async function parsePortfolioFile(file) {
  if (!file) throw new Error('No file selected')
  const text = await file.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file')
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid portfolio file')
  }
  return data
}

/** Returns true if the parsed file is a single-category backup (vs full backup) */
export function isCategoryBackup(data) {
  return typeof data.category === 'string' && Array.isArray(data.data)
}

export function daysSinceExport(lastExportAt) {
  if (!lastExportAt) return Infinity
  const then = new Date(lastExportAt).getTime()
  if (Number.isNaN(then)) return Infinity
  return (Date.now() - then) / (1000 * 60 * 60 * 24)
}

export function shouldShowBackupReminder(lastExportAt, thresholdDays = 7) {
  return daysSinceExport(lastExportAt) >= thresholdDays
}

export function markBackupReminderShown() {
  try {
    sessionStorage.setItem(BACKUP_REMINDER_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function wasBackupReminderShownThisSession() {
  try {
    return sessionStorage.getItem(BACKUP_REMINDER_KEY) === '1'
  } catch {
    return false
  }
}

export function recordExportTimestamp() {
  return new Date().toISOString()
}

export function loadSamplePortfolio() {
  return getSamplePortfolio()
}
