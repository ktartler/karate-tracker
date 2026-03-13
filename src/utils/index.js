export function fmt(d) {
  if (!d) return '—'
  const dt = new Date(d + 'T12:00:00')
  if (isNaN(dt)) return '—'
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtShort(d) {
  if (!d) return '—'
  const dt = new Date(d + 'T12:00:00')
  if (isNaN(dt)) return '—'
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export function monthsBetween(a, b) {
  if (!a) return 0
  const d1 = new Date(a + 'T12:00:00')
  const d2 = b ? new Date(b + 'T12:00:00') : new Date()
  if (isNaN(d1) || isNaN(d2)) return 0
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30.5)))
}

export function daysUntil(ds) {
  if (!ds) return null
  const d = new Date(ds + 'T12:00:00')
  if (isNaN(d)) return null
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
}

export function weekStreak(log) {
  if (!log || log.length === 0) return 0
  const getMonday = d => {
    const dt = new Date(d + 'T12:00:00')
    const day = dt.getDay()
    const diff = day === 0 ? -6 : 1 - day
    dt.setDate(dt.getDate() + diff)
    return dt.toISOString().split('T')[0]
  }
  const weeks = [...new Set(log.map(l => l.date).map(getMonday))].sort().reverse()
  const thisMonday = getMonday(today())
  const lastMonday = (() => {
    const d = new Date(thisMonday + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })()
  if (weeks[0] !== thisMonday && weeks[0] !== lastMonday) return 0
  let streak = 1
  for (let i = 1; i < weeks.length; i++) {
    const prev = new Date(weeks[i - 1] + 'T12:00:00')
    const curr = new Date(weeks[i] + 'T12:00:00')
    if (prev - curr === 7 * 24 * 60 * 60 * 1000) streak++
    else break
  }
  return streak
}
