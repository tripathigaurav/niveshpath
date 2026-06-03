import { formatDate } from './formatters'

/** Days until renewal (negative = overdue). */
export function daysUntilRenewal(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * @param {object[]} policies
 */
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

  for (const p of list) {
    totalPremium += p.premium ?? 0
    if (p.coverAmount != null) {
      totalCover += p.coverAmount
      if (p.type === 'health') healthCover += p.coverAmount
      if (p.type === 'term') termCover += p.coverAmount
    }
    if (p.type === 'health') healthCount++
    if (p.type === 'term') termCount++

    if (!p.renewalDate) continue
    const days = daysUntilRenewal(p.renewalDate)
    if (days == null) continue
    if (days <= 90) renewalsDue90++
    if (days >= 0 && (nextRenewalDays == null || days < nextRenewalDays)) {
      nextRenewalDays = days
      nextRenewalDate = p.renewalDate
    }
  }

  return {
    policyCount: list.length,
    totalPremium,
    totalCover,
    healthCover,
    termCover,
    healthCount,
    termCount,
    renewalsDue90,
    nextRenewalDate,
    nextRenewalDays,
  }
}

/** One-line renewals text for dashboard category card. */
export function formatInsuranceRenewalsLine(summary) {
  if (!summary) return '—'
  if (summary.renewalsDue90 > 0) {
    const n = summary.renewalsDue90
    return n === 1 ? '1 due in 90 days' : `${n} due in 90 days`
  }
  if (summary.nextRenewalDate) {
    return `Next: ${formatDate(summary.nextRenewalDate)}`
  }
  return '—'
}
