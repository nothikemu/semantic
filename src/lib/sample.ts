import { addDays, startOfWeek, todayISO } from './dates'
import { DB, COURSE_COLORS, uid } from './types'

/** Small, clearly sample dataset. Only loaded when the student asks for it. */
export function sampleData(db: DB): Partial<Record<keyof DB, any[]>> {
  const today = todayISO()
  const mon = startOfWeek(today)
  const mk = (n: number) => addDays(mon, n)
  const c = (i: number, name: string, code: string, teacher: string, room: string, days: number[], start: string, end: string) => ({
    id: uid(), name, code, teacher, room, color: COURSE_COLORS[i],
    meetings: [{ id: uid(), days, start, end, room, pattern: 'every' as const }],
  })
  const bio = c(0, 'AP Biology', 'BIO 201', 'Dr. Okafor', 'Rm 214', [1, 3, 5], '09:00', '09:50')
  const math = c(1, 'Calculus II', 'MATH 220', 'Ms. Lindqvist', 'Rm 108', [1, 2, 4], '10:15', '11:05')
  const lit = c(2, 'World Literature', 'ENG 210', 'Mr. Abara', 'Rm 301', [2, 4], '13:00', '14:15')
  const club = { id: uid(), name: 'Robotics Club', role: 'Software lead', notes: '' }
  const ev = { id: uid(), title: 'Robotics build night', clubId: club.id, date: mk(2), start: '16:00', end: '17:30', location: 'Workshop', repeat: 'weekly' as const }
  const proj = { id: uid(), title: 'Ecosystem research paper', courseId: bio.id, targetDate: addDays(today, 24), notes: '', milestones: [
    { id: uid(), title: 'Pick topic and sources', date: addDays(today, 4), done: false },
    { id: uid(), title: 'Outline approved', date: addDays(today, 11), done: false },
    { id: uid(), title: 'First draft', date: addDays(today, 18), done: false },
  ] }
  const A = (title: string, courseId: string, due: number, extra: object = {}) => ({
    id: uid(), title, courseId, dueDate: addDays(today, due), priority: 'normal', subtasks: [], done: false, ...extra,
  })
  const a1 = A('Problem set 7', math.id, 2, { effort: 90, priority: 'high', dueTime: '09:00' })
  const a2 = A('Lab report: enzyme activity', bio.id, 5, { effort: 120, subtasks: [
    { id: uid(), title: 'Tidy data table', done: true }, { id: uid(), title: 'Write methods', done: false }, { id: uid(), title: 'Draft discussion', done: false } ] })
  const a3 = A('Essay: unreliable narrators', lit.id, 9, { effort: 180 })
  const a4 = A('Annotated bibliography', bio.id, 4, { effort: 60, projectId: proj.id })
  const exam = { id: uid(), title: 'Unit 3 exam', courseId: math.id, date: addDays(today, 12), time: '10:15', topics: [
    { id: uid(), title: 'Integration by parts', effort: 60, done: false },
    { id: uid(), title: 'Trig substitution', effort: 60, done: false },
    { id: uid(), title: 'Improper integrals', effort: 45, done: false } ] }
  const sess = { id: uid(), date: addDays(today, 1), start: '17:00', duration: 60, title: 'Work on problem set 7', assignmentId: a1.id, source: 'manual' as const, done: false }
  return {
    courses: [bio, math, lit], clubs: [club], events: [ev], projects: [proj], assignments: [a1, a2, a3, a4], exams: [exam], study_sessions: [sess],
    holidays: [{ id: uid(), name: 'Fall break (sample)', start: addDays(today, 15), end: addDays(today, 19) }],
  }
}
