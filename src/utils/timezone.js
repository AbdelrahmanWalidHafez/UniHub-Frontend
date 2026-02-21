export function parseAsCairo(dateString) {
  if (!dateString) return null
  try {
    // If the string already includes timezone info, parse normally
    if (/[zZ]|[+-]\d{2}:?\d{2}/.test(String(dateString))) {
      return new Date(dateString).getTime()
    }
    // Treat naive dates as Cairo local time (UTC+02:00)
    // Ensure there is a time component
    const s = String(dateString).includes('T') ? `${dateString}+02:00` : `${dateString}T00:00:00+02:00`
    return new Date(s).getTime()
  } catch (e) {
    return null
  }
}

export function formatInCairo(dateString, opts = {}) {
  if (!dateString) return '-'
  try {
    const tzOpts = { timeZone: 'Africa/Cairo', ...opts }
    const ts = parseAsCairo(dateString)
    if (ts === null) return '-'
    return new Date(ts).toLocaleString('en-US', tzOpts)
  } catch (e) {
    return '-'
  }
}
