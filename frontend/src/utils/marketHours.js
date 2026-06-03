import {
  getIndianHolidayName,
  getIndianSpecialSessionName,
  getUsEarlyCloseName,
  getUsHolidayName,
} from './marketHolidays'

/** @typedef {'indian' | 'us'} MarketId */

const MARKETS = {
  indian: {
    id: 'indian',
    label: 'NSE / BSE',
    timezone: 'Asia/Kolkata',
    tzShort: 'IST',
    openMins: 9 * 60 + 15,
    closeMins: 15 * 60 + 30,
    hoursLabel: '9:15 AM – 3:30 PM IST',
    preOpenLabel: 'Pre-open 9:00 – 9:15 AM IST',
  },
  us: {
    id: 'us',
    label: 'NYSE / Nasdaq',
    timezone: 'America/New_York',
    tzShort: 'ET',
    openMins: 9 * 60 + 30,
    closeMins: 16 * 60,
    earlyCloseMins: 13 * 60,
    hoursLabel: '9:30 AM – 4:00 PM ET',
    earlyHoursLabel: '9:30 AM – 1:00 PM ET',
  },
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getPartsInTz(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    weekday: weekdayMap[parts.weekday] ?? 0,
    hours: parseInt(parts.hour, 10),
    minutes: parseInt(parts.minute, 10),
  }
}

export function dateKeyInTimezone(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatClockInTz(date, timeZone) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function minsSinceMidnight(parts) {
  return parts.hours * 60 + parts.minutes
}

function getHolidayName(marketId, dateKey) {
  if (marketId === 'indian') return getIndianHolidayName(dateKey)
  return getUsHolidayName(dateKey)
}

/**
 * @param {MarketId} marketId
 * @param {Date} [now]
 */
export function getMarketStatus(marketId, now = new Date()) {
  const cfg = MARKETS[marketId]
  const parts = getPartsInTz(now, cfg.timezone)
  const dateKey = dateKeyInTimezone(now, cfg.timezone)
  const mins = minsSinceMidnight(parts)
  const holidayName = getHolidayName(marketId, dateKey)
  const indianSpecial = marketId === 'indian' ? getIndianSpecialSessionName(dateKey) : null
  const earlyCloseName = marketId === 'us' ? getUsEarlyCloseName(dateKey) : null
  const localTime = formatClockInTz(now, cfg.timezone)

  const isWeekend = parts.weekday === 0 || parts.weekday === 6
  let closeMins = cfg.closeMins
  let hoursLabel = cfg.hoursLabel

  if (earlyCloseName) {
    closeMins = cfg.earlyCloseMins
    hoursLabel = cfg.earlyHoursLabel
  }

  /** @type {'open' | 'closed' | 'holiday' | 'weekend' | 'special'} */
  let state = 'closed'
  let reason = null

  if (indianSpecial) {
    state = 'special'
    reason = indianSpecial
  } else if (isWeekend) {
    state = 'weekend'
    reason = `${WEEKDAY_NAMES[parts.weekday]} — weekend`
  } else if (holidayName) {
    state = 'holiday'
    reason = holidayName
  } else if (mins >= cfg.openMins && mins < closeMins) {
    state = 'open'
  } else if (mins < cfg.openMins) {
    reason = `Opens ${formatMinsAsTime(cfg.openMins)} ${cfg.tzShort}`
  } else {
    reason = `Closed for the day`
  }

  const isOpen = state === 'open'
  const statusLabel = (() => {
    if (state === 'open') return 'Market open'
    if (state === 'holiday') return `Closed — ${holidayName}`
    if (state === 'weekend') return 'Closed — weekend'
    if (state === 'special') return indianSpecial || reason
    if (earlyCloseName && !isOpen) {
      if (mins < cfg.openMins) return `Early close today — opens ${formatMinsAsTime(cfg.openMins)} ET`
      return `Early close today — ${earlyCloseName}`
    }
    return reason || 'Market closed'
  })()

  return {
    marketId,
    exchangeLabel: cfg.label,
    timezone: cfg.timezone,
    tzShort: cfg.tzShort,
    localTime,
    dateKey,
    state,
    isOpen,
    statusLabel,
    hoursLabel,
    preOpenLabel: marketId === 'indian' ? cfg.preOpenLabel : null,
    earlyCloseToday: Boolean(earlyCloseName),
    holidayName,
  }
}

function formatMinsAsTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2, '0')} ${period}` : `${h12} ${period}`
}

/** Whether any major market we track is likely open (for smart refresh). */
export function isAnyMarketOpen(now = new Date()) {
  return isIndianMarketOpen(now) || isUsMarketOpen(now)
}

export function isIndianMarketOpen(now = new Date()) {
  return getMarketStatus('indian', now).isOpen
}

export function isUsMarketOpen(now = new Date()) {
  return getMarketStatus('us', now).isOpen
}
