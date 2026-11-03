export type ID = string

export interface Meeting {
  id: ID
  days: number[] // 0 = Sunday … 6 = Saturday
  start: string // HH:MM
  end: string
  room?: string
  /** 'every' = every school day listed; A/B only apply when A/B schedule is on */
  pattern: 'every' | 'A' | 'B'
}
export interface Course {
  id: ID
  name: string
  code?: string
  teacher?: string
  room?: string
  color: string
  meetings: Meeting[]
}
export interface Subtask {
  id: ID
  title: string
  done: boolean
  date?: string
}
export type Priority = 'low' | 'normal' | 'high'
export interface Assignment {
  id: ID
  title: string
  courseId?: ID
  projectId?: ID
  dueDate: string // YYYY-MM-DD — the deadline
  dueTime?: string
  effort?: number // minutes
  priority: Priority
  notes?: string
  link?: string
  reminderDays?: number // in-app reminder: show on Today N days before
  subtasks: Subtask[]
  done: boolean
  completedAt?: string
}
export interface Topic {
  id: ID
  title: string
  effort?: number // minutes
  done: boolean
}
export interface Exam {
  id: ID
  title: string
  courseId?: ID
  date: string
  time?: string
  topics: Topic[]
}
export interface Milestone {
  id: ID
  title: string
  date?: string
  done: boolean
}
export interface Project {
  id: ID
  title: string
  courseId?: ID
  targetDate?: string
  notes?: string
  milestones: Milestone[]
}
export interface Club {
  id: ID
  name: string
  role?: string
  notes?: string
}
export interface EventRec {
  id: ID
  title: string
  clubId?: ID
  date: string
  start?: string
  end?: string
  location?: string
  repeat: 'none' | 'weekly' | 'biweekly'
  until?: string
  notes?: string
}
/** A planned (not deadline) block of work. */
export interface StudySession {
  id: ID
  date: string
  start?: string
  duration: number // minutes
  title: string
  examId?: ID
  topicId?: ID
  assignmentId?: ID
  projectId?: ID
  source: 'manual' | 'suggestion'
  note?: string
  done: boolean
}
export interface Holiday {
  id: ID
  name: string
  start: string
  end: string
}
export interface Prefs {
  id: ID
  onboarded: boolean
  abEnabled: boolean
  abAnchorDate?: string
  abAnchorType: 'A' | 'B'
  /** minutes available to study per weekday, index 0 = Sunday */
  availability: number[]
  hiddenKinds: string[]
  calendarView: 'day' | 'week' | 'month' | 'agenda'
  dismissed: string[]
}

export interface DB {
  courses: Course[]
  assignments: Assignment[]
  exams: Exam[]
  projects: Project[]
  clubs: Club[]
  events: EventRec[]
  study_sessions: StudySession[]
  holidays: Holiday[]
  prefs: Prefs
}
export type ListTable = Exclude<keyof DB, 'prefs'>
export type Table = keyof DB
export const LIST_TABLES: ListTable[] = [
  'courses', 'assignments', 'exams', 'projects', 'clubs', 'events', 'study_sessions', 'holidays',
]

export const uid = (): ID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 3) | 8).toString(16)
      })

export const defaultPrefs = (id: ID): Prefs => ({
  id, onboarded: false, abEnabled: false, abAnchorType: 'A',
  availability: [60, 45, 45, 45, 45, 30, 90], hiddenKinds: [], calendarView: 'week', dismissed: [],
})
export const emptyDB = (userId: ID): DB => ({
  courses: [], assignments: [], exams: [], projects: [], clubs: [], events: [],
  study_sessions: [], holidays: [], prefs: defaultPrefs(userId),
})

export const COURSE_COLORS = ['#3f6b8f', '#7a4a6b', '#8a6a1c', '#2f6f6a', '#9a4a32', '#55627a', '#5f7a3a', '#7a5a43']
