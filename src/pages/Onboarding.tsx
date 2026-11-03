import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useActions } from '../lib/actions'
import { sampleData } from '../lib/sample'
import { Button, Wordmark } from '../components/ui'
import { useEditors } from '../components/Editors'
import { DOW, fmtRange } from '../lib/dates'

export function Onboarding() {
  const { db, put } = useStore()
  const act = useActions()
  const ed = useEditors()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const finish = () => { put('prefs', { ...db.prefs, onboarded: true }); nav('/', { replace: true }) }
  const steps = ['Courses', 'First assignment', 'A club']
  return (
    <main className="onboard">
      <div className="onboard-card">
        <Wordmark />
        <p className="eyebrow">Step {step + 1} of 3 · {steps[step]}</p>
        {step === 0 && (<>
          <h1>Add your courses and class times</h1>
          <p>Classes show up on your calendar automatically. You can skip this and add them later.</p>
          <ul className="plain-list">
            {db.courses.map((c) => <li key={c.id}><strong>{c.name}</strong><span className="muted"> {c.meetings.map((m) => `${m.days.map((d) => DOW[d]).join('/')} ${fmtRange(m.start, m.end)}`).join('; ')}</span></li>)}
          </ul>
          <div className="actions">
            <Button variant="secondary" onClick={() => ed.open('course')}>{db.courses.length ? 'Add another course' : 'Add a course'}</Button>
            {!db.courses.length && <Button variant="ghost" onClick={() => act.loadSample(sampleData(db))}>Load sample schedule instead</Button>}
          </div>
        </>)}
        {step === 1 && (<>
          <h1>Got something due soon?</h1>
          <p>Add one assignment to see how it appears on Today and the calendar. Optional.</p>
          <ul className="plain-list">{db.assignments.map((a) => <li key={a.id}><strong>{a.title}</strong></li>)}</ul>
          <div className="actions"><Button variant="secondary" onClick={() => ed.open('assignment')}>Add an assignment</Button></div>
        </>)}
        {step === 2 && (<>
          <h1>Any clubs or activities?</h1>
          <p>Meetings and commitments can repeat weekly. Optional.</p>
          <ul className="plain-list">{db.clubs.map((a) => <li key={a.id}><strong>{a.name}</strong></li>)}</ul>
          <div className="actions"><Button variant="secondary" onClick={() => ed.open('club')}>Add a club or activity</Button></div>
        </>)}
        <div className="onboard-nav">
          <Button variant="ghost" onClick={() => (step < 2 ? setStep(step + 1) : finish())}>Skip this step</Button>
          <Button onClick={() => (step < 2 ? setStep(step + 1) : finish())}>{step < 2 ? 'Next' : 'Finish'}</Button>
        </div>
        <button className="link-btn" onClick={finish}>Skip setup and go to the app</button>
      </div>
    </main>
  )
}
