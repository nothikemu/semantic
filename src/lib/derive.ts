import { addDays, diffDays, fmtDate, fmtMinutes, fromISO, minutesBetween, rangeDays, todayISO, weekday, DOW_LONG } from './dates'
import type { Assignment, DB, Course, Exam, StudySession } from './types'

export type Kind = 'class' | 'deadline' | 'exam' | 'study' | 'project' | 'club'
export const KINDS: { kind: Kind; label: string; shape: string }[] = [
  { kind: 'class', label: 'Classes', shape: 'Class' },
  { kind: 'deadline', label: 'Due dates', shape: 'Due' },
  { kind: 'exam', label: 'Exams', shape: 'Exam' },
  { kind: 'study', label: 'Planned work', shape: 'Work session' },
  { kind: 'project', label: 'Project dates', shape: 'Project' },
  { kind: 'club', label: 'Clubs & events', shape: 'Event' },
]
export const kindLabel = (k: Kind) => KINDS.find((x) => x.kind === k)!.shape

export interface CalItem {
  key: string
  kind: Kind
  title: string
  date: string
  start?: string
  end?: string
  courseId?: string
  detail?: string
  source: string
  done?: boolean
  ref: { type: 'course' | 'assignment' | 'exam' | 'session' | 'project' | 'event'; id: string }
}

const isHoliday = (db: DB, d: string) => db.holidays.some((h) => d >= h.start && d <= h.end)

/** Returns 'A' | 'B' for a school day, null for weekends/holidays or when A/B is off. */
export function abDay(db: DB, date: string): 'A' | 'B' | null {
  const { abEnabled, abAnchorDate, abAnchorType } = db.prefs
  if (!abEnabled || !abAnchorDate) return null
  const wd = weekday(date)
  if (wd === 0 || wd === 6 || isHoliday(db, date)) return null
  let count = 0
  const step = date >= abAnchorDate ? 1 : -1
  let cur = abAnchorDate
  let guard = 0
  while (cur !== date && guard++ < 800) {
    cur = addDays(cur, step)
    const w = weekday(cur)
    if (w !== 0 && w !== 6 && !isHoliday(db, cur)) count += step
  }
  const same = Math.abs(count) % 2 === 0
  return same ? abAnchorType : abAnchorType === 'A' ? 'B' : 'A'
}

export function itemsInRange(db: DB, from: string, to: string): CalItem[] {
  const out: CalItem[] = []
  const days = rangeDays(from, to)
  const courseName = (id?: string) => db.courses.find((c) => c.id === id)
  for (const date of days) {
    const holiday = db.holidays.find((h) => date >= h.start && date <= h.end)
    const ab = abDay(db, date)
    if (!holiday) {
      for (const c of db.courses)
        for (const m of c.meetings) {
          if (!m.days.includes(weekday(date))) continue
          if (db.prefs.abEnabled && m.pattern !== 'every' && m.pattern !== ab) continue
          out.push({
            key: `class-${m.id}-${date}`, kind: 'class', title: c.name, date, start: m.start, end: m.end,
            courseId: c.id, detail: [m.room || c.room, m.pattern !== 'every' && db.prefs.abEnabled ? `${m.pattern} day` : ''].filter(Boolean).join(' · '),
            source: 'Course schedule', ref: { type: 'course', id: c.id },
          })
        }
    }
    for (const e of db.events) {
      if (!occursOn(e, date)) continue
      const club = db.clubs.find((c) => c.id === e.clubId)
      out.push({
        key: `event-${e.id}-${date}`, kind: 'club', title: e.title, date, start: e.start, end: e.end,
        detail: [club?.name, e.location, e.repeat !== 'none' ? (e.repeat === 'weekly' ? 'weekly' : 'every 2 weeks') : ''].filter(Boolean).join(' · '),
        source: club ? 'Club' : 'Personal event', ref: { type: 'event', id: e.id },
      })
    }
    void holiday
  }
  for (const a of db.assignments) {
    if (a.dueDate < from || a.dueDate > to) continue
    const c = courseName(a.courseId)
    const proj = db.projects.find((p) => p.id === a.projectId)
    out.push({
      key: `due-${a.id}`, kind: 'deadline', title: a.title, date: a.dueDate, start: a.dueTime, courseId: a.courseId,
      detail: [c?.code || c?.name, proj ? `Project: ${proj.title}` : ''].filter(Boolean).join(' · '),
      source: 'Assignment deadline', done: a.done, ref: { type: 'assignment', id: a.id },
    })
  }
  for (const x of db.exams) {
    if (x.date < from || x.date > to) continue
    out.push({
      key: `exam-${x.id}`, kind: 'exam', title: x.title, date: x.date, start: x.time, courseId: x.courseId,
      detail: courseName(x.courseId)?.code || courseName(x.courseId)?.name, source: 'Exam', ref: { type: 'exam', id: x.id },
    })
  }
  for (const s of db.study_sessions) {
    if (s.date < from || s.date > to) continue
    out.push({
      key: `ses-${s.id}`, kind: 'study', title: s.title, date: s.date, start: s.start,
      end: s.start ? addMin(s.start, s.duration) : undefined, done: s.done,
      courseId: sessionCourse(db, s),
      detail: `${fmtMinutes(s.duration)}${s.source === 'suggestion' ? ' · from a suggestion' : ''}`,
      source: 'Planned work session', ref: { type: 'session', id: s.id },
    })
  }
  for (const p of db.projects) {
    if (p.targetDate && p.targetDate >= from && p.targetDate <= to)
      out.push({ key: `proj-${p.id}`, kind: 'project', title: `${p.title} — target`, date: p.targetDate, courseId: p.courseId, source: 'Project target date', ref: { type: 'project', id: p.id } })
    for (const m of p.milestones)
      if (m.date && m.date >= from && m.date <= to)
        out.push({ key: `ms-${m.id}`, kind: 'project', title: m.title, date: m.date, courseId: p.courseId, detail: p.title, done: m.done, source: 'Project milestone', ref: { type: 'project', id: p.id } })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '99').localeCompare(b.start ?? '99') || a.title.localeCompare(b.title))
}

const addMin = (t: string, m: number) => {
  const total = Math.min(1439, Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + m)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function occursOn(e: { date: string; repeat: string; until?: string }, d: string) {
  if (d < e.date) return false
  if (e.repeat === 'none') return d === e.date
  if (e.until && d > e.until) return false
  const n = diffDays(d, e.date)
  return e.repeat === 'weekly' ? n % 7 === 0 : n % 14 === 0
}

export function sessionCourse(db: DB, s: StudySession): string | undefined {
  if (s.examId) return db.exams.find((e) => e.id === s.examId)?.courseId
  if (s.assignmentId) return db.assignments.find((a) => a.id === s.assignmentId)?.courseId
  if (s.projectId) return db.projects.find((p) => p.id === s.projectId)?.courseId
}

export function projectProgress(db: DB, projectId: string) {
  const p = db.projects.find((x) => x.id === projectId)
  if (!p) return { done: 0, total: 0, pct: 0 }
  const tasks = db.assignments.filter((a) => a.projectId === projectId)
  const total = p.milestones.length + tasks.length
  const done = p.milestones.filter((m) => m.done).length + tasks.filter((t) => t.done).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

export function dueStatus(a: Assignment, today = todayISO()): 'done' | 'overdue' | 'today' | 'soon' | 'later' {
  if (a.done) return 'done'
  const n = diffDays(a.dueDate, today)
  return n < 0 ? 'overdue' : n === 0 ? 'today' : n <= 3 ? 'soon' : 'later'
}

export const courseLabel = (c?: Course) => (c ? c.code || c.name : 'No course')

export interface Suggestion {
  key: string
  date: string
  duration: number
  title: string
  examId: string
  topicId?: string
  optional?: boolean
  reason: string
}

/**
 * Suggestions are derived ONLY from: upcoming exams, the topics the student entered (and their
 * effort estimates), and the stated weekday availability (minus work already planned).
 * Nothing is written to the calendar until the student accepts one.
 */
export function buildSuggestions(db: DB, today = todayISO(), horizon = 28): Suggestion[] {
  const out: Suggestion[] = []
  const avail = db.prefs.availability
  const used = new Map<string, number>()
  for (const s of db.study_sessions) used.set(s.date, (used.get(s.date) ?? 0) + s.duration)
  const exams = db.exams.filter((e) => e.date >= today && diffDays(e.date, today) <= horizon).sort((a, b) => a.date.localeCompare(b.date))
  for (const ex of exams) {
    const course = db.courses.find((c) => c.id === ex.courseId)
    const label = `${ex.title}${course ? ` (${course.code || course.name})` : ''}`
    const days = diffDays(ex.date, today)
    const open = ex.topics.filter((t) => !t.done && !db.study_sessions.some((s) => s.examId === ex.id && s.topicId === t.id))
    const window = rangeDays(today, addDays(ex.date, -1))
    for (const t of open) {
      const need = t.effort ?? 45
      let remaining = need
      for (const d of window) {
        const free = (avail[weekday(d)] ?? 0) - (used.get(d) ?? 0)
        if (free < 15) continue
        const block = Math.min(remaining, free, 90)
        if (block < Math.min(15, need)) continue
        out.push({
          key: `${ex.id}:${t.id}:${d}`, date: d, duration: block, examId: ex.id, topicId: t.id,
          title: `Study: ${t.title}`,
          reason: `${label} is in ${days} day${days === 1 ? '' : 's'}. "${t.title}" is an open topic you estimated at ${fmtMinutes(need)}; you said you have ${fmtMinutes(avail[weekday(d)])} free on ${DOW_LONG[weekday(d)]}s${(used.get(d) ?? 0) ? ` (${fmtMinutes(used.get(d))} already planned)` : ''}.`,
        })
        used.set(d, (used.get(d) ?? 0) + block)
        remaining -= block
        break // one block per topic per suggestion round keeps the plan editable and short
      }
    }
    // Optional practice-recall block the day before, only if any topics exist.
    if (ex.topics.length && days >= 2) {
      const d = addDays(ex.date, -1)
      const free = (avail[weekday(d)] ?? 0) - (used.get(d) ?? 0)
      if (free >= 20 && !db.study_sessions.some((s) => s.examId === ex.id && s.date === d && !s.topicId)) {
        const dur = Math.min(30, free)
        out.push({
          key: `${ex.id}:recall:${d}`, date: d, duration: dur, examId: ex.id, optional: true,
          title: `Practice recall: ${ex.title}`,
          reason: `Optional. A short block of closed-book practice (write down what you remember, then check) the day before ${label}. Skip it if it doesn't suit how you study.`,
        })
      }
    }
  }
  return out.filter((s) => !db.prefs.dismissed.includes(s.key)).sort((a, b) => a.date.localeCompare(b.date))
}

export function nextSession(db: DB, today = todayISO(), now = new Date()) {
  const nowT = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return db.study_sessions
    .filter((s) => !s.done && (s.date > today || (s.date === today && (s.start ?? '23:59') >= nowT)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''))[0]
}

export { fromISO, fmtDate, minutesBetween }
export type { Exam }
