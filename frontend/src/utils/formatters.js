export function formatINR(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const abs = Math.abs(value)
  if (compact && abs >= 1e7) {
    return '₹\u00A0' + (value / 1e7).toFixed(2) + '\u00A0Cr'
  }
  if (compact && abs >= 1e5) {
    return '₹\u00A0' + (value / 1e5).toFixed(2) + '\u00A0Lac'
  }
  if (compact && abs >= 1e3) {
    return '₹\u00A0' + (value / 1e3).toFixed(2) + '\u00A0K'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatUSD(value) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value, showPlus = true) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const sign = value > 0 && showPlus ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatChange(value, currency = 'INR') {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  if (currency === 'INR') return sign + formatINR(value)
  return sign + formatUSD(value)
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function getGreeting(name = '') {
  const hour = new Date().getHours()
  let time = 'Good morning'
  if (hour >= 12 && hour < 17) time = 'Good afternoon'
  else if (hour >= 17) time = 'Good evening'
  return name ? `${time}, ${name}` : time
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}
