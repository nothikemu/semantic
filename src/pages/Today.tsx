import { Link } from 'react-router-dom'
import { addDays, diffDays, fmtDate, fmtMinutes, fmtTime, relDay, todayISO } from '../lib/dates'
import { itemsInRange, nextSession, abDay } from '../lib/derive'
import { useStore } from '../lib/store'
import { useActions } from '../lib/actions'
import { sampleData } from '../lib/sample'
import { Button, Empty, Icon, PageHeader } from '../components/ui'
import { AssignmentRow, ItemRow, SessionRow } from '../components/rows'
import { useEditors } from '../components/Editors'

export function Today() {
  const { db } = useStore()
  const act = useActions()
  const ed = useEditors()
  const today = todayISO()
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const todayItems = itemsInRange(db, today, today)
  const open = db.assignments.filter((a) => !a.done)
  const soon = open.filter((a) => diffDays(a.dueDate, today) <= 7).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.priority.localeCompare(b.priority))
  const reminders = open.filter((a) => a.reminderDays != null && diffDays(a.dueDate, today) <= a.reminderDays && diffDays(a.dueDate, today) > 7)
  const next = nextSession(db, today)
  const upcoming = itemsInRange(db, addDays(today, 1), addDays(today, 14)).filter((i) => i.kind !== 'class' && !i.done).slice(0, 6)
  const holiday = db.holidays.find((h) => today >= h.start && today <= h.end)
  const ab = abDay(db, today)
  const empty = !db.courses.length && !db.assignments.length && !db.clubs.length
  const lastDone = db.assignments.filter((a) => a.done).length

  return (
    <div className="page">
      <PageHeader title={`${greet}`} sub={<>{fmtDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}{ab ? ` · ${ab} day` : ''}{holiday ? ` · ${holiday.name}` : ''}</>} />
      {empty ? (
        <Empty title="Nothing here yet" action={<div className="actions"><Button onClick={() => ed.open('course')}>Add a course</Button><Button variant="secondary" onClick={() => act.loadSample(sampleData(db))}>Load sample schedule</Button></div>}>
          Add your courses and assignments, or load a small sample schedule to look around. Sample items are ordinary records you can delete.
        </Empty>
      ) : (
        <div className="grid-2">
          <div className="col">
            <section aria-labelledby="h-sched">
              <h2 id="h-sched">Today’s schedule</h2>
              {todayItems.length ? <ul className="list">{todayItems.map((i) => <ItemRow key={i.key} i={i} />)}</ul>
                : <p className="quiet">{holiday ? `No classes — ${holiday.name}.` : 'Nothing scheduled today.'}</p>}
            </section>
            <section aria-labelledby="h-due">
              <h2 id="h-due">Due soon</h2>
              {soon.length ? <ul className="list">{soon.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul>
                : <p className="quiet">{open.length ? 'Nothing due in the next week.' : lastDone ? 'All caught up — nice.' : 'No assignments yet.'}{' '}<button className="link-btn" onClick={() => ed.open('assignment')}>Add an assignment</button></p>}
              {reminders.length > 0 && (
                <div className="reminders"><h3>Reminders</h3><ul className="plain-list">{reminders.map((a) => <li key={a.id}>“{a.title}” is due {relDay(a.dueDate)}.</li>)}</ul></div>
              )}
            </section>
          </div>
          <div className="col">
            <section aria-labelledby="h-next" className="panel">
              <h2 id="h-next">Next study session</h2>
              {next ? <ul className="list"><SessionRow s={next} /></ul> : (
                <p className="quiet">No session planned. <Link to="/study">Plan one</Link> or see suggestions.</p>
              )}
            </section>
            <section aria-labelledby="h-up" className="panel">
              <h2 id="h-up">Up next</h2>
              {upcoming.length ? <ul className="list compact">{upcoming.map((i) => <ItemRow key={i.key} i={i} showDate />)}</ul> : <p className="quiet">Nothing else in the next two weeks.</p>}
              <Link className="more-link" to="/calendar">Open calendar <Icon name="right" size={16} /></Link>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
export { fmtMinutes, fmtTime }
