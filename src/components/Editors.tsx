import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Assignment, Club, Course, EventRec, Exam, Project, StudySession } from '../lib/types'
import { AssignmentDialog, ClubDialog, CourseDialog, EventDialog, ExamDialog, ProjectDialog, SessionDialog } from './forms'
import type { CalItem } from '../lib/derive'
import { useStore } from '../lib/store'

type Dlg =
  | { t: 'assignment'; v?: Partial<Assignment> } | { t: 'course'; v?: Course } | { t: 'exam'; v?: Partial<Exam> }
  | { t: 'project'; v?: Project } | { t: 'session'; v?: Partial<StudySession> } | { t: 'club'; v?: Club } | { t: 'event'; v?: Partial<EventRec> }
type T = Dlg['t']
interface Ed { open: (t: T, v?: any) => void; openItem: (i: CalItem) => void }
const Ctx = createContext<Ed>(null as any)
export const useEditors = () => useContext(Ctx)

export function EditorsProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Dlg | null>(null)
  const { db } = useStore()
  const open = useCallback((t: T, v?: any) => setD({ t, v } as Dlg), [])
  const close = useCallback(() => setD(null), [])
  const openItem = useCallback((i: CalItem) => {
    const { type, id } = i.ref
    if (type === 'assignment') open('assignment', db.assignments.find((x) => x.id === id))
    else if (type === 'course') open('course', db.courses.find((x) => x.id === id))
    else if (type === 'exam') open('exam', db.exams.find((x) => x.id === id))
    else if (type === 'session') open('session', db.study_sessions.find((x) => x.id === id))
    else if (type === 'project') open('project', db.projects.find((x) => x.id === id))
    else if (type === 'event') open('event', db.events.find((x) => x.id === id))
  }, [db, open])
  const value = useMemo(() => ({ open, openItem }), [open, openItem])
  // key forces a fresh form (and fresh state) for each opened record
  const key = d ? `${d.t}-${(d.v as any)?.id ?? 'new'}-${JSON.stringify(d.v ?? {}).length}` : 'none'
  return (
    <Ctx.Provider value={value}>
      {children}
      <AssignmentDialog key={'a' + key} open={d?.t === 'assignment'} onClose={close} initial={d?.t === 'assignment' ? d.v : undefined} />
      <CourseDialog key={'c' + key} open={d?.t === 'course'} onClose={close} initial={d?.t === 'course' ? d.v : undefined} />
      <ExamDialog key={'e' + key} open={d?.t === 'exam'} onClose={close} initial={d?.t === 'exam' ? d.v : undefined} />
      <ProjectDialog key={'p' + key} open={d?.t === 'project'} onClose={close} initial={d?.t === 'project' ? d.v : undefined} />
      <SessionDialog key={'s' + key} open={d?.t === 'session'} onClose={close} initial={d?.t === 'session' ? d.v : undefined} />
      <ClubDialog key={'cl' + key} open={d?.t === 'club'} onClose={close} initial={d?.t === 'club' ? d.v : undefined} />
      <EventDialog key={'ev' + key} open={d?.t === 'event'} onClose={close} initial={d?.t === 'event' ? d.v : undefined} />
    </Ctx.Provider>
  )
}
