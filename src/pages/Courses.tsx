import { Link, useParams } from 'react-router-dom'
import { DOW, fmtDate, fmtRange, todayISO } from '../lib/dates'
import { useStore } from '../lib/store'
import { useEditors } from '../components/Editors'
import { AssignmentRow, SessionRow } from '../components/rows'
import { Button, Empty, Icon, PageHeader } from '../components/ui'
import type { Course } from '../lib/types'

const scheduleText = (c: Course, ab: boolean) =>
  c.meetings.map((m) => `${m.days.map((d) => DOW[d]).join(' ')} ${fmtRange(m.start, m.end)}${ab && m.pattern !== 'every' ? ` (${m.pattern} days)` : ''}`).join(' · ') || 'No class times'

export function Courses() {
  const { db } = useStore()
  const ed = useEditors()
  return (
    <div className="page">
      <PageHeader title="Courses" sub={`${db.courses.length} course${db.courses.length === 1 ? '' : 's'}`} actions={<Button onClick={() => ed.open('course')}><Icon name="plus" size={18} /> Add course</Button>} />
      {db.courses.length ? (
        <ul className="list cards">
          {db.courses.map((c) => {
            const open = db.assignments.filter((a) => a.courseId === c.id && !a.done).length
            const exams = db.exams.filter((e) => e.courseId === c.id && e.date >= todayISO()).length
            return (
              <li className="row course-row" key={c.id}>
                <i className="bar" style={{ background: c.color }} aria-hidden="true" />
                <div className="row-main">
                  <Link className="row-title" to={`/courses/${c.id}`}>{c.name}{c.code ? <span className="muted"> · {c.code}</span> : null}</Link>
                  <div className="meta"><span>{scheduleText(c, db.prefs.abEnabled)}</span></div>
                  <div className="meta muted">{[c.teacher, c.room].filter(Boolean).join(' · ')}{[c.teacher, c.room].some(Boolean) ? ' · ' : ''}{open} open assignment{open === 1 ? '' : 's'}{exams ? `, ${exams} upcoming exam${exams === 1 ? '' : 's'}` : ''}</div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : <Empty title="No courses yet" action={<Button onClick={() => ed.open('course')}>Add a course</Button>}>Add a course with its class times and they’ll appear on your calendar and Today page.</Empty>}
    </div>
  )
}

export function CourseDetail() {
  const { id } = useParams()
  const { db, put } = useStore()
  const ed = useEditors()
  const c = db.courses.find((x) => x.id === id)
  if (!c) return <div className="page"><Empty title="Course not found" action={<Link className="btn secondary md" to="/courses">Back to courses</Link>}>It may have been deleted.</Empty></div>
  const open = db.assignments.filter((a) => a.courseId === c.id && !a.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const done = db.assignments.filter((a) => a.courseId === c.id && a.done)
  const exams = db.exams.filter((e) => e.courseId === c.id).sort((a, b) => a.date.localeCompare(b.date))
  const sessions = db.study_sessions.filter((s) => !s.done && s.date >= todayISO()).filter((s) => {
    const a = db.assignments.find((x) => x.id === s.assignmentId), e = db.exams.find((x) => x.id === s.examId)
    return a?.courseId === c.id || e?.courseId === c.id
  })
  return (
    <div className="page">
      <p className="crumb"><Link to="/courses">← Courses</Link></p>
      <PageHeader title={c.name} sub={<>{c.code}{c.code && (c.teacher || c.room) ? ' · ' : ''}{[c.teacher, c.room].filter(Boolean).join(' · ')}</>} actions={<Button variant="secondary" onClick={() => ed.open('course', c)}><Icon name="edit" size={18} /> Edit course</Button>} />
      <section aria-labelledby="sch"><h2 id="sch">Class schedule</h2><ul className="plain-list">{c.meetings.map((m) => <li key={m.id}>{m.days.map((d) => DOW[d]).join(', ')} · {fmtRange(m.start, m.end)}{m.room ? ` · ${m.room}` : ''}{db.prefs.abEnabled && m.pattern !== 'every' ? ` · ${m.pattern} days` : ''}</li>)}</ul></section>
      <section aria-labelledby="as">
        <div className="sec-head"><h2 id="as">Assignments</h2><Button size="sm" variant="secondary" onClick={() => ed.open('assignment', { courseId: c.id })}>Add</Button></div>
        {open.length ? <ul className="list">{open.map((a) => <AssignmentRow key={a.id} a={a} showCourse={false} />)}</ul> : <p className="quiet">No open assignments.</p>}
        {done.length > 0 && <details><summary>{done.length} completed</summary><ul className="list">{done.map((a) => <AssignmentRow key={a.id} a={a} showCourse={false} />)}</ul></details>}
      </section>
      <section aria-labelledby="ex">
        <div className="sec-head"><h2 id="ex">Exams and study topics</h2><Button size="sm" variant="secondary" onClick={() => ed.open('exam', { courseId: c.id })}>Add exam</Button></div>
        {exams.length ? <ul className="list">{exams.map((e) => (
          <li className="row" key={e.id}><div className="row-main">
            <button className="row-title" onClick={() => ed.open('exam', e)}>{e.title}</button>
            <div className="meta"><span>{fmtDate(e.date)}{e.time ? ' · ' + fmtRange(e.time) : ''}</span></div>
            {e.topics.length > 0 && <ul className="subs">{e.topics.map((t) => (
              <li key={t.id}><label><input type="checkbox" checked={t.done} onChange={() => put('exams', { ...e, topics: e.topics.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })} /> <span className={t.done ? 'struck' : ''}>{t.title}</span></label></li>
            ))}</ul>}
          </div></li>))}</ul> : <p className="quiet">No exams for this course.</p>}
      </section>
      {sessions.length > 0 && <section aria-labelledby="ss"><h2 id="ss">Planned work</h2><ul className="list">{sessions.map((s) => <SessionRow key={s.id} s={s} />)}</ul></section>}
    </div>
  )
}
