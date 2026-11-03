import { addDays, DOW_LONG, fmtDate, fmtMinutes, fmtTime, relDay, todayISO } from '../lib/dates'
import { buildSuggestions } from '../lib/derive'
import { useStore } from '../lib/store'
import { uid } from '../lib/types'
import { useEditors } from '../components/Editors'
import { SessionRow } from '../components/rows'
import { Badge, Button, CourseTag, Empty, Icon, PageHeader } from '../components/ui'

export function Study() {
  const { db, put, mutate } = useStore()
  const ed = useEditors()
  const today = todayISO()
  const exams = db.exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const sugg = buildSuggestions(db)
  const sessions = db.study_sessions.filter((s) => !s.done).sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''))
  const finished = db.study_sessions.filter((s) => s.done)
  const setAvail = (i: number, v: number) => put('prefs', { ...db.prefs, availability: db.prefs.availability.map((x, j) => (j === i ? v : x)) })
  const accept = (s: (typeof sugg)[number]) =>
    put('study_sessions', { id: uid(), date: s.date, duration: s.duration, title: s.title, examId: s.examId, topicId: s.topicId, source: 'suggestion', done: false }, `Added to ${relDay(s.date)}: ${s.title}`)
  const dismiss = (key: string) => put('prefs', { ...db.prefs, dismissed: [...db.prefs.dismissed, key] }, 'Suggestion dismissed')

  return (
    <div className="page">
      <PageHeader title="Study plan" sub="Exams, the topics you enter, and the time you plan to study."
        actions={<><Button variant="secondary" onClick={() => ed.open('exam')}>Add exam</Button><Button onClick={() => ed.open('session')}><Icon name="plus" size={18} /> Plan session</Button></>} />

      <section aria-labelledby="ue">
        <h2 id="ue">Upcoming exams</h2>
        {exams.length ? <ul className="list">{exams.map((e) => {
          const c = db.courses.find((x) => x.id === e.courseId)
          const left = e.topics.filter((t) => !t.done)
          return (
            <li className="row" key={e.id}><div className="row-main">
              <button className="row-title" onClick={() => ed.open('exam', e)}>{e.title}</button>
              <div className="meta"><CourseTag course={c} /><span className="due soon">{relDay(e.date)}{e.time ? ' · ' + fmtTime(e.time) : ''}</span><span className="muted">{e.topics.length ? `${left.length} of ${e.topics.length} topics left` : 'No topics entered'}</span></div>
              {e.topics.length > 0 && <ul className="subs">{e.topics.map((t) => (
                <li key={t.id}><label><input type="checkbox" checked={t.done} onChange={() => put('exams', { ...e, topics: e.topics.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })} /> <span className={t.done ? 'struck' : ''}>{t.title}</span><span className="muted"> · {fmtMinutes(t.effort ?? 45)}{t.effort ? '' : ' (default)'}</span></label></li>))}</ul>}
            </div></li>)
        })}</ul> : <Empty title="No upcoming exams" action={<Button onClick={() => ed.open('exam')}>Add an exam</Button>}>Add an exam and list its topics to get suggestions for when to study.</Empty>}
      </section>

      <section aria-labelledby="sg">
        <h2 id="sg">What should I study?</h2>
        <p className="explain">Suggestions come only from your upcoming exams, the topics and effort you entered, and the availability below. They are starting points, not a prescription — nothing is added to your calendar unless you accept it.</p>
        {sugg.length ? <ul className="list sugg">{sugg.map((s) => (
          <li className="row" key={s.key}>
            <div className="row-main">
              <div className="row-title static">{s.title} {s.optional && <Badge>Optional</Badge>}</div>
              <div className="meta"><Badge tone="accent">Suggestion</Badge><span>{fmtDate(s.date, { weekday: 'long', month: 'short', day: 'numeric' })}</span><span className="muted">{fmtMinutes(s.duration)}</span></div>
              <p className="reason"><strong>Why:</strong> {s.reason}</p>
              <div className="actions">
                <Button size="sm" onClick={() => accept(s)}>Add to my plan</Button>
                <Button size="sm" variant="secondary" onClick={() => ed.open('session', { date: s.date, duration: s.duration, title: s.title, examId: s.examId, topicId: s.topicId, source: 'suggestion' })}>Edit or move</Button>
                <Button size="sm" variant="ghost" onClick={() => dismiss(s.key)}>Dismiss</Button>
              </div>
            </div>
          </li>))}</ul>
          : <p className="quiet">{exams.length ? (exams.some((e) => e.topics.length) ? 'No suggestions right now — your topics are planned, done, or dismissed, or you have no free time set for the days left.' : 'Add topics to an exam to get suggestions.') : 'Suggestions appear once you add an exam.'}
            {db.prefs.dismissed.length > 0 && <> <button className="link-btn" onClick={() => put('prefs', { ...db.prefs, dismissed: [] })}>Show {db.prefs.dismissed.length} dismissed</button></>}</p>}
      </section>

      <section aria-labelledby="av">
        <details className="avail">
          <summary id="av">Your study availability</summary>
          <p className="hint">Minutes you could study on each weekday. Used for suggestions, and reduced by sessions you’ve already planned.</p>
          <div className="avail-grid">{DOW_LONG.map((d, i) => (
            <div className="field" key={d}><label htmlFor={`av${i}`}>{d}</label><input id={`av${i}`} type="number" min={0} max={600} step={15} inputMode="numeric" value={db.prefs.availability[i]} onChange={(e) => setAvail(i, Math.max(0, Number(e.target.value) || 0))} /></div>))}</div>
        </details>
      </section>

      <section aria-labelledby="pl">
        <h2 id="pl">Planned sessions</h2>
        {sessions.length ? <ul className="list">{sessions.map((s) => <SessionRow key={s.id} s={s} />)}</ul> : <p className="quiet">Nothing planned. Accept a suggestion or <button className="link-btn" onClick={() => ed.open('session', { date: addDays(today, 1) })}>plan a session yourself</button>.</p>}
        {finished.length > 0 && <details><summary>{finished.length} finished session{finished.length === 1 ? '' : 's'}</summary><ul className="list">{finished.map((s) => <SessionRow key={s.id} s={s} />)}</ul></details>}
      </section>
    </div>
  )
}
