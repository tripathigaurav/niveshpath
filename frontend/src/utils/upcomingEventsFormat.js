/** Max events shown on the dashboard card before "Show all". */
export const UPCOMING_EVENTS_PREVIEW_LIMIT = 5

export function formatEventDate(iso) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}
