const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => toISO(new Date())
export const addDays = (s: string, n: number) => {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export const diffDays = (a: string, b: string) =>
  Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000)
export const weekday = (s: string) => fromISO(s).getDay()
export const startOfWeek = (s: string) => addDays(s, -weekday(s))
export const startOfMonth = (s: string) => s.slice(0, 7) + '-01'
export const addMonths = (s: string, n: number) => {
  const d = fromISO(startOfMonth(s))
  d.setMonth(d.getMonth() + n)
  return toISO(d)
}
export const rangeDays = (from: string, to: string) => {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return fromISO(s).toLocaleDateString(undefined, opts)
}
export function fmtTime(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: m ? '2-digit' : undefined })
}
export function fmtRange(a?: string, b?: string) {
  if (!a) return 'All day'
  return b ? `${fmtTime(a)} – ${fmtTime(b)}` : fmtTime(a)
}
export function relDay(s: string, today = todayISO()) {
  const n = diffDays(s, today)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n < -1) return `${-n} days overdue`
  if (n < 7) return fmtDate(s, { weekday: 'long' })
  return fmtDate(s)
}
export function fmtMinutes(m?: number) {
  if (!m) return ''
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}
export const addMinutes = (t: string, mins: number) => {
  const [h, m] = t.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, h * 60 + m + mins)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}
export const minutesBetween = (a: string, b: string) => {
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number)
  return h2 * 60 + m2 - (h1 * 60 + m1)
}

/** Natural-language date parser. Returns an ISO date or null. Always confirmed by the UI before use. */
export function parseNaturalDate(input: string, today = todayISO()): string | null {
  const s = input.trim().toLowerCase()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (s === 'today' || s === 'tonight') return today
  if (s === 'tomorrow' || s === 'tmrw') return addDays(today, 1)
  let m = s.match(/^in (\d+) (day|days|week|weeks)$/)
  if (m) return addDays(today, Number(m[1]) * (m[2].startsWith('week') ? 7 : 1))
  const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  m = s.match(/^(next |this )?(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/)
  if (m) {
    const target = names.indexOf(m[2])
    let n = (target - weekday(today) + 7) % 7
    if (n === 0) n = 7
    if (m[1] === 'next ') n += 7
    return addDays(today, n)
  }
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const build = (mo: number, d: number) => {
    const y = fromISO(today).getFullYear()
    let iso = `${y}-${pad(mo + 1)}-${pad(d)}`
    if (fromISO(iso).getMonth() !== mo) return null
    if (iso < today) iso = `${y + 1}-${pad(mo + 1)}-${pad(d)}`
    return iso
  }
  m = s.match(/^([a-z]{3})[a-z]*\.? (\d{1,2})(st|nd|rd|th)?$/) || null
  if (m && months.includes(m[1])) return build(months.indexOf(m[1]), Number(m[2]))
  m = s.match(/^(\d{1,2})(st|nd|rd|th)? ([a-z]{3})[a-z]*$/)
  if (m && months.includes(m[3])) return build(months.indexOf(m[3]), Number(m[1]))
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})$/)
  if (m) return build(Number(m[1]) - 1, Number(m[2]))
  return null
}
