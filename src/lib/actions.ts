import { useStore } from './store'
import { Assignment, Course, Exam, Club, Project, StudySession, uid } from './types'

export function useActions() {
  const { db, mutate, put } = useStore()
  return {
    toggleAssignment(a: Assignment) {
      const done = !a.done
      put('assignments', { ...a, done, completedAt: done ? new Date().toISOString() : undefined }, done ? `Completed “${a.title}”` : `Reopened “${a.title}”`)
    },
    toggleSubtask(a: Assignment, id: string) {
      put('assignments', { ...a, subtasks: a.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) })
    },
    reschedule(a: Assignment, dueDate: string) {
      put('assignments', { ...a, dueDate }, `Moved “${a.title}” to ${dueDate}`)
    },
    deleteAssignment(a: Assignment) {
      mutate({ del: [['assignments', a.id], ...db.study_sessions.filter((s) => s.assignmentId === a.id).map((s) => ['study_sessions', s.id] as ['study_sessions', string])] }, `Deleted “${a.title}”`)
    },
    deleteCourse(c: Course) {
      const del: [any, string][] = [['courses', c.id]]
      db.assignments.filter((a) => a.courseId === c.id).forEach((a) => { del.push(['assignments', a.id]); db.study_sessions.filter((s) => s.assignmentId === a.id).forEach((s) => del.push(['study_sessions', s.id])) })
      db.exams.filter((e) => e.courseId === c.id).forEach((e) => { del.push(['exams', e.id]); db.study_sessions.filter((s) => s.examId === e.id).forEach((s) => del.push(['study_sessions', s.id])) })
      const unlink = db.projects.filter((p) => p.courseId === c.id).map((p) => ['projects', { ...p, courseId: undefined }] as [any, any])
      mutate({ del: dedupe(del), put: unlink }, `Deleted ${c.name}`)
    },
    deleteExam(e: Exam) {
      mutate({ del: [['exams', e.id], ...db.study_sessions.filter((s) => s.examId === e.id).map((s) => ['study_sessions', s.id] as ['study_sessions', string])] }, `Deleted ${e.title}`)
    },
    deleteProject(p: Project) {
      mutate({ del: [['projects', p.id]], put: db.assignments.filter((a) => a.projectId === p.id).map((a) => ['assignments', { ...a, projectId: undefined }] as [any, any]) }, `Deleted ${p.title}. Its tasks were kept.`)
    },
    deleteClub(c: Club) {
      mutate({ del: [['clubs', c.id], ...db.events.filter((e) => e.clubId === c.id).map((e) => ['events', e.id] as ['events', string])] }, `Deleted ${c.name}`)
    },
    toggleSession(s: StudySession) {
      put('study_sessions', { ...s, done: !s.done }, s.done ? 'Marked as not done' : 'Session done')
    },
    deleteSession(s: StudySession) { mutate({ del: [['study_sessions', s.id]] }, 'Session removed') },
    loadSample(data: Record<string, any[] | undefined>) {
      const put: [any, any][] = []
      for (const [t, list] of Object.entries(data)) for (const r of list ?? []) put.push([t, r])
      put.push(['prefs', { ...db.prefs, onboarded: true }])
      mutate({ put }, 'Sample schedule added. You can delete any of it.')
    },
    newId: uid,
  }
}
const dedupe = (l: [any, string][]) => l.filter((x, i) => l.findIndex((y) => y[0] === x[0] && y[1] === x[1]) === i)
