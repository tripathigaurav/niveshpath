import { formatDate } from './formatters'

/** Days until renewal (negative = overdue). */
export function daysUntilRenewal(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const TYPE_EMOJI = {
  health: '🏥', term: '🛡️', life: '📋', ulip: '📈',
  vehicle: '🚗', home: '🏠', travel: '✈️', critical: '❤️',
  accident: '🦺', other: '📦',
}
export const INS_TYPE_LABEL = {
  health: 'Health', term: 'Term Life', life: 'Life', ulip: 'ULIP',
  vehicle: 'Vehicle', home: 'Home', travel: 'Travel',
  critical: 'Critical Illness', accident: 'Accident', other: 'Other',
}
const TYPE_ORDER = ['health', 'term', 'life', 'ulip', 'vehicle', 'home', 'travel', 'critical', 'accident', 'other']

/** @param {object[]} policies */
export function summarizeInsurance(policies) {
  const list = policies || []
  let totalPremium = 0
  let totalCover = 0
  let healthCover = 0
  let termCover = 0
  let healthCount = 0
  let termCount = 0
  let renewalsDue90 = 0
  let nextRenewalDate = null
  let nextRenewalDays = null
  let nextRenewalName = null
  const byType = {}

  for (const p of list) {
    totalPremium += p.premium ?? 0
    if (p.coverAmount != null) totalCover += p.coverAmount

    const t = p.type || 'other'
    if (!byType[t]) byType[t] = { count: 0 }
    byType[t].count++

    if (t === 'health') { healthCount++; healthCover += p.coverAmount ?? 0 }
    if (t === 'term')   { termCount++;   termCover   += p.coverAmount ?? 0 }

    if (!p.renewalDate) continue
    const days = daysUntilRenewal(p.renewalDate)
    if (days == null) continue
    if (days >= 0 && days <= 90) renewalsDue90++
    if (days >= 0 && (nextRenewalDays == null || days < nextRenewalDays)) {
      nextRenewalDays = days
      nextRenewalDate = p.renewalDate
      nextRenewalName = p.name
    }
  }

  const typePills = TYPE_ORDER
    .filter((t) => byType[t])
    .map((t) => ({ type: t, emoji: TYPE_EMOJI[t] ?? '📦', label: INS_TYPE_LABEL[t] ?? t, count: byType[t].count }))

  return {
    policyCount: list.length, totalPremium, totalCover,
    healthCover, termCover, healthCount, termCount,
    renewalsDue90, nextRenewalDate, nextRenewalDays, nextRenewalName, typePills,
  }
}

/** @deprecated use summary fields directly in InsuranceCategoryCard */
export function formatInsuranceRenewalsLine(summary) {
  if (!summary) return '—'
  if (summary.renewalsDue90 > 0) {
    return summary.renewalsDue90 === 1 ? '1 due in 90 days' : `${summary.renewalsDue90} due in 90 days`
  }
  if (summary.nextRenewalDate) return `Next: ${formatDate(summary.nextRenewalDate)}`
  return '—'
}
