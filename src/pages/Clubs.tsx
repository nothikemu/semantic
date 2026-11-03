import { addDays, fmtDate, fmtRange, todayISO } from '../lib/dates'
import { itemsInRange } from '../lib/derive'
import { useStore } from '../lib/store'
import { useEditors } from '../components/Editors'
import { Badge, Button, Empty, Icon, PageHeader } from '../components/ui'

export function Clubs() {
  const { db } = useStore()
  const ed = useEditors()
  const today = todayISO()
  const upcoming = itemsInRange(db, today, addDays(today, 60)).filter((i) => i.ref.type === 'event')
  const nextFor = (id: string) => upcoming.filter((i) => i.ref.id && db.events.find((e) => e.id === i.ref.id)?.clubId === id).slice(0, 3)
  const personal = db.events.filter((e) => !e.clubId)
  const label = (r: string) => (r === 'weekly' ? 'Weekly' : r === 'biweekly' ? 'Every 2 weeks' : '')
  return (
    <div className="page">
      <PageHeader title="Clubs and activities" sub="Memberships, meetings and commitments." actions={<><Button variant="secondary" onClick={() => ed.open('event')}>Add event</Button><Button onClick={() => ed.open('club')}><Icon name="plus" size={18} /> Add club</Button></>} />
      {db.clubs.length || personal.length ? (<>
        {db.clubs.map((c) => {
          const evs = db.events.filter((e) => e.clubId === c.id)
          return (
            <section className="project" key={c.id} aria-labelledby={`c-${c.id}`}>
              <div className="sec-head"><h2 id={`c-${c.id}`}>{c.name}{c.role && <span className="muted"> · {c.role}</span>}</h2><Button size="sm" variant="ghost" onClick={() => ed.open('club', c)}><Icon name="edit" size={16} /> Edit</Button></div>
              {c.notes && <p className="muted">{c.notes}</p>}
              <h3>Coming up</h3>
              {nextFor(c.id).length ? <ul className="list compact">{nextFor(c.id).map((i) => (
                <li className="row item" key={i.key}><div className="time"><span>{fmtDate(i.date)}</span><span className="muted">{fmtRange(i.start, i.end)}</span></div><div className="row-main"><button className="row-title" onClick={() => ed.openItem(i)}>{i.title}</button><div className="meta muted">{i.detail}</div></div></li>))}</ul>
                : <p className="quiet">No events in the next 60 days.</p>}
              <h3>All events <Badge>{evs.length}</Badge></h3>
              <ul className="plain-list">{evs.map((e) => <li key={e.id}><button className="link-btn" onClick={() => ed.open('event', e)}>{e.title}</button> <span className="muted">{label(e.repeat) || fmtDate(e.date)}</span></li>)}</ul>
              <Button size="sm" variant="secondary" onClick={() => ed.open('event', { clubId: c.id })}>Add event for {c.name}</Button>
            </section>)
        })}
        {personal.length > 0 && <section className="project" aria-labelledby="pe"><h2 id="pe">Personal events</h2><ul className="plain-list">{personal.map((e) => <li key={e.id}><button className="link-btn" onClick={() => ed.open('event', e)}>{e.title}</button> <span className="muted">{fmtDate(e.date)} {label(e.repeat)}</span></li>)}</ul></section>}
      </>) : <Empty title="No clubs or activities yet" action={<Button onClick={() => ed.open('club')}>Add a club</Button>}>Add a club, then its recurring meetings. They’ll show on your calendar.</Empty>}
    </div>
  )
}
