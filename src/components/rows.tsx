import { Link } from 'react-router-dom'
import { diffDays, fmtDate, fmtMinutes, fmtRange, fmtTime, relDay, todayISO } from '../lib/dates'
import { dueStatus, kindLabel, type CalItem } from '../lib/derive'
import { useActions } from '../lib/actions'
import { useStore } from '../lib/store'
import type { Assignment, StudySession } from '../lib/types'
import { useEditors } from './Editors'
import { Badge, CourseTag, Icon } from './ui'

export function AssignmentRow({ a, showCourse = true }: { a: Assignment; showCourse?: boolean }) {
  const { db } = useStore()
  const act = useActions()
  const ed = useEditors()
  const course = db.courses.find((c) => c.id === a.courseId)
  const project = db.projects.find((p) => p.id === a.projectId)
  const st = dueStatus(a)
  const planned = db.study_sessions.filter((s) => s.assignmentId === a.id && !s.done && s.date >= todayISO()).sort((x, y) => x.date.localeCompare(y.date))[0]
  const subsDone = a.subtasks.filter((s) => s.done).length
  return (
    <li className={'row' + (a.done ? ' is-done' : '')}>
      <button className={'check' + (a.done ? ' on' : '')} role="checkbox" aria-checked={a.done} aria-label={`Complete “${a.title}”`} onClick={() => act.toggleAssignment(a)}>
        {a.done && <Icon name="check" size={16} />}
      </button>
      <div className="row-main">
        <button className="row-title" onClick={() => ed.open('assignment', a)}>{a.title}</button>
        <div className="meta">
          {showCourse && <CourseTag course={course} />}
          <span className={'due ' + st}>{a.done ? `Done${a.completedAt ? ' ' + fmtDate(a.completedAt.slice(0, 10)) : ''}` : `${st === 'overdue' ? 'Overdue · ' : 'Due '}${relDay(a.dueDate)}${a.dueTime ? ' · ' + fmtTime(a.dueTime) : ''}`}</span>
          {a.priority === 'high' && !a.done && <Badge tone="warn">High priority</Badge>}
          {a.effort ? <span className="muted">{fmtMinutes(a.effort)}</span> : null}
          {a.subtasks.length > 0 && <span className="muted">{subsDone}/{a.subtasks.length} steps</span>}
          {project && <Link className="meta-link" to="/projects">Project: {project.title}</Link>}
          {planned && !a.done && <span className="planned"><Icon name="clock" size={14} /> Work planned {relDay(planned.date)}{planned.start ? ' ' + fmtTime(planned.start) : ''}</span>}
        </div>
        {a.subtasks.length > 0 && !a.done && (
          <ul className="subs">
            {a.subtasks.map((s) => (
              <li key={s.id}>
                <label><input type="checkbox" checked={s.done} onChange={() => act.toggleSubtask(a, s.id)} /> <span className={s.done ? 'struck' : ''}>{s.title}</span>{s.date && <span className="muted"> · {fmtDate(s.date)}</span>}</label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!a.done && <button className="btn ghost sm row-act" onClick={() => ed.open('session', { assignmentId: a.id, title: `Work on ${a.title}`, duration: a.effort && a.effort <= 120 ? a.effort : 60, date: a.dueDate > todayISO() ? todayISO() : a.dueDate })}>Plan time</button>}
    </li>
  )
}

export function KindMark({ kind }: { kind: CalItem['kind'] }) {
  return <span className={`kind kind-${kind}`}>{kindLabel(kind)}</span>
}

export function ItemRow({ i, showDate }: { i: CalItem; showDate?: boolean }) {
  const { db } = useStore()
  const ed = useEditors()
  const course = db.courses.find((c) => c.id === i.courseId)
  return (
    <li className={`row item item-${i.kind} kind-${i.kind}` + (i.done ? ' is-done' : '')}>
      <div className="time">{showDate ? <><span>{fmtDate(i.date)}</span><span className="muted">{fmtRange(i.start, i.end)}</span></> : <span>{i.start ? fmtRange(i.start, i.end) : 'All day'}</span>}</div>
      <div className="row-main">
        <button className="row-title" onClick={() => ed.openItem(i)}><span className={i.done ? 'struck' : ''}>{i.title}</span></button>
        <div className="meta">
          <KindMark kind={i.kind} />
          {course && <CourseTag course={course} />}
          {i.detail && <span className="muted">{i.detail}</span>}
          <span className="src">{i.source}</span>
        </div>
      </div>
    </li>
  )
}

export function SessionRow({ s }: { s: StudySession }) {
  const { db } = useStore()
  const act = useActions()
  const ed = useEditors()
  const exam = db.exams.find((e) => e.id === s.examId)
  const a = db.assignments.find((x) => x.id === s.assignmentId)
  return (
    <li className={'row' + (s.done ? ' is-done' : '')}>
      <button className={'check' + (s.done ? ' on' : '')} role="checkbox" aria-checked={s.done} aria-label={`Mark “${s.title}” done`} onClick={() => act.toggleSession(s)}>{s.done && <Icon name="check" size={16} />}</button>
      <div className="row-main">
        <button className="row-title" onClick={() => ed.open('session', s)}>{s.title}</button>
        <div className="meta">
          <KindMark kind="study" />
          <span>{relDay(s.date)}{s.start ? ' · ' + fmtTime(s.start) : ''}</span>
          <span className="muted">{fmtMinutes(s.duration)}</span>
          {exam && <span className="muted">for {exam.title}</span>}
          {a && <span className="muted">for {a.title}</span>}
          {s.source === 'suggestion' && <Badge>From a suggestion</Badge>}
        </div>
      </div>
    </li>
  )
}
export { diffDays }
