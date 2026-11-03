import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../lib/store'
import { useActions } from '../lib/actions'
import { sampleData } from '../lib/sample'
import { fmtDate, todayISO } from '../lib/dates'
import { uid, LIST_TABLES } from '../lib/types'
import { Button, Confirm, Field, PageHeader } from '../components/ui'

export function Settings() {
  const { db, put, mutate, toast } = useStore()
  const { email, demo, signOut } = useAuth()
  const act = useActions()
  const [hName, setHName] = useState(''), [hStart, setHStart] = useState(''), [hEnd, setHEnd] = useState('')
  const [hErr, setHErr] = useState('')
  const [wipe, setWipe] = useState(false)
  const p = db.prefs
  function addHoliday(e: FormEvent) {
    e.preventDefault()
    if (!hName.trim() || !hStart) return setHErr('Enter a name and a start date.')
    if (hEnd && hEnd < hStart) return setHErr('The end date must be on or after the start.')
    setHErr('')
    put('holidays', { id: uid(), name: hName.trim(), start: hStart, end: hEnd || hStart }, 'Holiday added')
    setHName(''); setHStart(''); setHEnd('')
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `margin-export-${todayISO()}.json`; a.click(); URL.revokeObjectURL(a.href)
    toast('Exported your data as JSON')
  }
  return (
    <div className="page">
      <PageHeader title="Settings" />
      <section aria-labelledby="s-ab">
        <h2 id="s-ab">A/B schedule</h2>
        <label className="check-line"><input type="checkbox" checked={p.abEnabled} onChange={(e) => put('prefs', { ...p, abEnabled: e.target.checked, abAnchorDate: p.abAnchorDate ?? todayISO() })} /> My school uses rotating A/B days</label>
        {p.abEnabled && (
          <div className="row2">
            <Field label="A reference day" hint="Pick any school day and say whether it was A or B. Weekends and your holidays are skipped when counting.">{(i) => <input {...i} type="date" value={p.abAnchorDate ?? ''} onChange={(e) => put('prefs', { ...p, abAnchorDate: e.target.value })} />}</Field>
            <Field label="That day was">{(i) => <select {...i} value={p.abAnchorType} onChange={(e) => put('prefs', { ...p, abAnchorType: e.target.value as 'A' | 'B' })}><option value="A">An A day</option><option value="B">A B day</option></select>}</Field>
          </div>
        )}
        {p.abEnabled && <p className="hint">Then set each class time to “A days only” or “B days only” in the course editor.</p>}
      </section>
      <section aria-labelledby="s-h">
        <h2 id="s-h">Holidays and breaks</h2>
        <p className="hint">No classes are shown on these days.</p>
        {db.holidays.length > 0 && <ul className="list compact">{[...db.holidays].sort((a, b) => a.start.localeCompare(b.start)).map((h) => (
          <li className="row" key={h.id}><div className="row-main"><div className="row-title static">{h.name}</div><div className="meta muted">{fmtDate(h.start)}{h.end !== h.start ? ` – ${fmtDate(h.end)}` : ''}</div></div><Button size="sm" variant="ghost" onClick={() => mutate({ del: [['holidays', h.id]] }, 'Holiday removed')}>Remove<span className="sr-only"> {h.name}</span></Button></li>))}</ul>}
        <form onSubmit={addHoliday} className="form-inline" noValidate>
          <Field label="Name">{(i) => <input {...i} value={hName} onChange={(e) => setHName(e.target.value)} />}</Field>
          <Field label="From">{(i) => <input {...i} type="date" value={hStart} onChange={(e) => setHStart(e.target.value)} />}</Field>
          <Field label="To" optional>{(i) => <input {...i} type="date" value={hEnd} onChange={(e) => setHEnd(e.target.value)} />}</Field>
          <Button type="submit" variant="secondary">Add holiday</Button>
        </form>
        {hErr && <p className="err" role="alert">{hErr}</p>}
      </section>
      <section aria-labelledby="s-i">
        <h2 id="s-i">Outside calendars</h2>
        <p>Syncing with Google Calendar, iCal or a school system is <strong>not available</strong> in this version. Everything here lives in Margin only.</p>
      </section>
      <section aria-labelledby="s-d">
        <h2 id="s-d">Your data</h2>
        <div className="actions">
          <Button variant="secondary" onClick={() => act.loadSample(sampleData(db))}>Load sample schedule</Button>
          <Button variant="secondary" onClick={exportData}>Export as JSON</Button>
          <Button variant="ghost" className="danger-text" onClick={() => setWipe(true)}>Delete all my data</Button>
        </div>
        <p className="hint">Sample records are added alongside yours; remove them from their pages.</p>
      </section>
      <section aria-labelledby="s-a">
        <h2 id="s-a">Account</h2>
        <p>{demo ? 'You’re in local demo mode — there’s no account and the data lives only in this browser.' : <>Signed in as <strong>{email}</strong>.</>}</p>
        <Button variant="secondary" onClick={signOut}>Sign out</Button>
      </section>
      <Confirm open={wipe} title="Delete everything?" body="All courses, assignments, exams, projects, clubs and sessions will be removed. This one can’t be undone from the toast, so export first if you want a copy." confirmLabel="Delete all data" onCancel={() => setWipe(false)}
        onConfirm={() => { setWipe(false); const del: [any, string][] = []; LIST_TABLES.forEach((t) => (db[t] as { id: string }[]).forEach((r) => del.push([t, r.id]))); mutate({ del }); toast('All data deleted') }} />
    </div>
  )
}
