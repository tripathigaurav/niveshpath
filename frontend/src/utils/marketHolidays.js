/**
 * NSE/BSE and NYSE/Nasdaq trading holidays (weekday closures).
 * Sources: NSE holiday circular 2026, NYSE/Nasdaq 2026 calendars.
 * @type {Record<string, string>}
 */
export const INDIAN_MARKET_HOLIDAYS = {
  // 2025 — NSE/BSE
  '2025-02-26': 'Mahashivratri',
  '2025-03-14': 'Holi',
  '2025-03-31': 'Eid-ul-Fitr',
  '2025-04-10': 'Mahavir Jayanti',
  '2025-04-14': 'Ambedkar Jayanti',
  '2025-04-18': 'Good Friday',
  '2025-05-01': 'Maharashtra Day',
  '2025-08-27': 'Janmashtami',
  '2025-10-02': 'Gandhi Jayanti',
  '2025-10-21': 'Dussehra',
  '2025-11-05': 'Diwali (Laxmi Pujan)',
  '2025-12-25': 'Christmas',
  // 2026 — NSE official equity holidays
  '2026-01-15': 'Municipal election (Maharashtra)',
  '2026-01-26': 'Republic Day',
  '2026-03-03': 'Holi',
  '2026-03-26': 'Ram Navami',
  '2026-03-31': 'Mahavir Jayanti',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Ambedkar Jayanti',
  '2026-05-01': 'Maharashtra Day',
  '2026-05-28': 'Bakri Id',
  '2026-06-26': 'Muharram',
  '2026-09-14': 'Ganesh Chaturthi',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-10': 'Diwali (Balipratipada)',
  '2026-11-24': 'Guru Nanak Jayanti',
  '2026-12-25': 'Christmas',
}

/** @type {Record<string, string>} */
export const US_MARKET_HOLIDAYS = {
  // 2025
  '2025-01-01': "New Year's Day",
  '2025-01-20': 'Martin Luther King Jr. Day',
  '2025-02-17': "Presidents' Day",
  '2025-04-18': 'Good Friday',
  '2025-05-26': 'Memorial Day',
  '2025-06-19': 'Juneteenth',
  '2025-07-04': 'Independence Day',
  '2025-09-01': 'Labor Day',
  '2025-11-27': 'Thanksgiving',
  '2025-12-25': 'Christmas',
  // 2026
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'Martin Luther King Jr. Day',
  '2026-02-16': "Presidents' Day",
  '2026-04-03': 'Good Friday',
  '2026-05-25': 'Memorial Day',
  '2026-06-19': 'Juneteenth',
  '2026-07-03': 'Independence Day (observed)',
  '2026-09-07': 'Labor Day',
  '2026-11-26': 'Thanksgiving',
  '2026-12-25': 'Christmas',
}

/** @type {Record<string, string>} */
export const US_EARLY_CLOSE_DAYS = {
  '2025-07-03': 'Day before Independence Day',
  '2025-11-28': 'Day after Thanksgiving',
  '2025-12-24': 'Christmas Eve',
  '2026-11-27': 'Day after Thanksgiving',
  '2026-12-24': 'Christmas Eve',
}

/** Special NSE sessions (not regular hours). */
export const INDIAN_SPECIAL_SESSIONS = {
  '2026-11-08': 'Muhurat trading (Diwali)',
}

export function getIndianHolidayName(dateKey) {
  return INDIAN_MARKET_HOLIDAYS[dateKey] ?? null
}

export function getUsHolidayName(dateKey) {
  return US_MARKET_HOLIDAYS[dateKey] ?? null
}

export function getUsEarlyCloseName(dateKey) {
  return US_EARLY_CLOSE_DAYS[dateKey] ?? null
}

export function getIndianSpecialSessionName(dateKey) {
  return INDIAN_SPECIAL_SESSIONS[dateKey] ?? null
}
