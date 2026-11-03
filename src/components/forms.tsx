import { useState, type FormEvent, type ReactNode } from 'react'
import { addDays, fmtDate, parseNaturalDate, todayISO, addMinutes, fromISO, toISO, DOW } from '../lib/dates'
import { useStore } from '../lib/store'
import { useActions } from '../lib/actions'
import { Assignment, COURSE_COLORS, Club, Course, EventRec, Exam, Meeting, Project, StudySession, Subtask, Topic, uid } from '../lib/types'
import { Button, Confirm, Dialog, Field, Icon } from './ui'

/* ---------- date field with confirmed natural-language entry ---------- */
export function DateField({ label, value, onChange, error, optional, onBlur }: { label: string; value: string; onChange: (v: string) => void; error?: string; optional?: boolean; onBlur?: () => void }) {
  const [text, setText] = useState('')
  const parsed = text ? parseNaturalDate(text) : null
  const t = todayISO()
  return (
    <Field label={label} error={error} optional={optional}>
      {(p) => (
        <>
          <input {...p} type="date" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
          <div className="chips" role="group" aria-label={`Quick ${label.toLowerCase()} choices`}>
            {[['Today', t], ['Tomorrow', addDays(t, 1)], ['In a week', addDays(t, 7)]].map(([l, d]) => (
              <button type="button" key={l} className={'chip' + (value === d ? ' on' : '')} aria-pressed={value === d} onClick={() => onChange(d)}>{l}</button>
            ))}
          </div>
          <div className="nl">
            <label className="nl-label" htmlFor={p.id + '-nl'}>Or type it</label>
            <input id={p.id + '-nl'} type="text" value={text} placeholder="e.g. friday, nov 12, in 3 days" autoComplete="off" onChange={(e) => setText(e.target.value)} />
          </div>
          <div aria-live="polite" className="nl-result">
            {text && (parsed
              ? <>Reads as <strong>{fmtDate(parsed, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>{' '}
                  <button type="button" className="link-btn" onClick={() => { onChange(parsed); setText('') }}>Use this date</button></>
              : <span className="muted">Couldn’t read that as a date yet. Try “fri”, “nov 12” or “in 3 days”.</span>)}
          </div>
        </>
      )}
    </Field>
  )
}

function FormShell({ onSubmit, children, footer }: { onSubmit: (e: FormEvent) => void; children: ReactNode; footer: ReactNode }) {
  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <div className="dialog-content">{children}</div>
      <footer className="dialog-foot">{footer}</footer>
    </form>
  )
}
const useTouched = () => {
  const [t, setT] = useState<Record<string, boolean>>({})
  return { touched: t, touch: (k: string) => setT((x) => ({ ...x, [k]: true })), touchAll: (ks: string[]) => setT(Object.fromEntries(ks.map((k) => [k, true]))) }
}

/* ---------- Assignment ---------- */
export function AssignmentDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<Assignment> }) {
  return <Dialog open={open} onClose={onClose} title={initial?.id ? 'Edit assignment' : 'Add assignment'}><AssignmentForm initial={initial} onClose={onClose} /></Dialog>
}
function AssignmentForm({ initial, onClose }: { initial?: Partial<Assignment>; onClose: () => void }) {
  const { db, put } = useStore()
  const act = useActions()
  const editing = Boolean(initial?.id)
  const hasMore = Boolean(initial && (initial.dueTime || initial.effort || initial.notes || initial.link || initial.reminderDays || initial.projectId || initial.subtasks?.length || (initial.priority && initial.priority !== 'normal')))
  const [more, setMore] = useState(hasMore)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [courseId, setCourseId] = useState(initial?.courseId ?? (db.courses.length === 1 ? db.courses[0].id : ''))
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [dueTime, setDueTime] = useState(initial?.dueTime ?? '')
  const [effort, setEffort] = useState(initial?.effort ? String(initial.effort) : '')
  const [priority, setPriority] = useState(initial?.priority ?? 'normal')
  const [projectId, setProjectId] = useState(initial?.projectId ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [link, setLink] = useState(initial?.link ?? '')
  const [reminder, setReminder] = useState(initial?.reminderDays != null ? String(initial.reminderDays) : '')
  const [subs, setSubs] = useState<Subtask[]>(initial?.subtasks ?? [])
  const [confirmDel, setConfirmDel] = useState(false)
  const { touched, touch, touchAll } = useTouched()
  const errs = {
    title: !title.trim() ? 'Give it a short title.' : '',
    dueDate: !dueDate ? 'Pick a due date.' : '',
    link: link && !/^https?:\/\/\S+$/i.test(link) ? 'Start the link with http:// or https://' : '',
  }
  const show = (k: keyof typeof errs) => (touched[k] ? errs[k] : '')

  function planBackwards() {
    if (!dueDate) { touch('dueDate'); return }
    const names = ['Plan and gather sources', 'First draft', 'Revise and finish']
    const start = todayISO() < dueDate ? todayISO() : dueDate
    const span = Math.max(0, Math.round((fromISO(dueDate).getTime() - fromISO(start).getTime()) / 86400000))
    setSubs(names.map((n, i) => ({ id: uid(), title: n, done: false, date: toISO(new Date(fromISO(start).getTime() + Math.round((span * (i + 1)) / names.length - (i === names.length - 1 ? 0 : 0)) * 86400000)) })))
    setMore(true)
  }

  function save(e: FormEvent) {
    e.preventDefault()
    touchAll(['title', 'dueDate', 'link'])
    if (errs.title || errs.dueDate || errs.link) { setMore(more || Boolean(errs.link)); setTimeout(() => (document.querySelector('.field.has-error input') as HTMLElement | null)?.focus(), 0); return }
    const rec: Assignment = {
      id: initial?.id ?? uid(), title: title.trim(), courseId: courseId || undefined, projectId: projectId || undefined,
      dueDate, dueTime: dueTime || undefined, effort: effort ? Number(effort) : undefined, priority,
      notes: notes.trim() || undefined, link: link.trim() || undefined, reminderDays: reminder === '' ? undefined : Number(reminder),
      subtasks: subs.filter((s) => s.title.trim()), done: initial?.done ?? false, completedAt: initial?.completedAt,
    }
    put('assignments', rec, editing ? 'Assignment saved' : 'Assignment added')
    onClose()
  }

  return (
    <>
      <FormShell onSubmit={save} footer={<>
        {editing && <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirmDel(true)}>Delete</Button>}
        <span className="spacer" />
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">{editing ? 'Save changes' : 'Add assignment'}</Button>
      </>}>
        <Field label="Title" error={show('title')}>
          {(p) => <input {...p} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => touch('title')} />}
        </Field>
        <Field label="Course">
          {(p) => (
            <select {...p} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">No course</option>
              {db.courses.map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</option>)}
            </select>
          )}
        </Field>
        <DateField label="Due date" value={dueDate} onChange={setDueDate} error={show('dueDate')} onBlur={() => touch('dueDate')} />
        <button type="button" className="reveal" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Hide' : 'Add'} details: time, effort, priority, notes, reminder, phases</button>
        {more && (
          <div className="more">
            <div className="row2">
              <Field label="Due time" optional>{(p) => <input {...p} type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />}</Field>
              <Field label="Effort (minutes)" optional>{(p) => <input {...p} type="number" inputMode="numeric" min={5} step={5} value={effort} onChange={(e) => setEffort(e.target.value)} />}</Field>
            </div>
            <div className="row2">
              <Field label="Priority">{(p) => (
                <select {...p} value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
                </select>)}</Field>
              <Field label="Project" optional>{(p) => (
                <select {...p} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">None</option>
                  {db.projects.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                </select>)}</Field>
            </div>
            <Field label="In-app reminder" optional hint="Shows this on your Today page. It doesn’t send email or push notifications.">{(p) => (
              <select {...p} value={reminder} onChange={(e) => setReminder(e.target.value)}>
                <option value="">None</option><option value="0">On the due date</option><option value="1">1 day before</option><option value="2">2 days before</option><option value="7">1 week before</option>
              </select>)}</Field>
            <Field label="Link" optional error={show('link')}>{(p) => <input {...p} type="url" value={link} onChange={(e) => setLink(e.target.value)} onBlur={() => touch('link')} placeholder="https://" />}</Field>
            <Field label="Notes" optional>{(p) => <textarea {...p} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
            <fieldset className="phases">
              <legend>Phases / subtasks</legend>
              {subs.map((s, i) => (
                <div className="phase-row" key={s.id}>
                  <input aria-label={`Phase ${i + 1} title`} value={s.title} onChange={(e) => setSubs(subs.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))} />
                  <input aria-label={`Phase ${i + 1} target date`} type="date" value={s.date ?? ''} onChange={(e) => setSubs(subs.map((x) => (x.id === s.id ? { ...x, date: e.target.value || undefined } : x)))} />
                  <button type="button" className="icon-btn" aria-label={`Remove phase ${i + 1}`} onClick={() => setSubs(subs.filter((x) => x.id !== s.id))}><Icon name="x" /></button>
                </div>
              ))}
              <div className="inline-actions">
                <Button type="button" variant="secondary" size="sm" onClick={() => setSubs([...subs, { id: uid(), title: '', done: false }])}>Add a phase</Button>
                <Button type="button" variant="ghost" size="sm" onClick={planBackwards}>Suggest 3 phases from the due date</Button>
              </div>
              <p className="hint">Suggested phases are just an even split before the due date. Rename, move, or remove any of them.</p>
            </fieldset>
          </div>
        )}
      </FormShell>
      <Confirm open={confirmDel} title="Delete this assignment?" body={<>“{initial?.title}” and any work sessions planned for it will be removed. You can undo right after.</>} confirmLabel="Delete assignment"
        onCancel={() => setConfirmDel(false)} onConfirm={() => { act.deleteAssignment(initial as Assignment); setConfirmDel(false); onClose() }} />
    </>
  )
}

/* ---------- Course ---------- */
export function CourseDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Course }) {
  return <Dialog open={open} onClose={onClose} title={initial ? 'Edit course' : 'Add course'} wide><CourseForm initial={initial} onClose={onClose} /></Dialog>
}
const blankMeeting = (): Meeting => ({ id: uid(), days: [1, 3, 5], start: '09:00', end: '09:50', pattern: 'every' })
function CourseForm({ initial, onClose }: { initial?: Course; onClose: () => void }) {
  const { db, put } = useStore()
  const act = useActions()
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [teacher, setTeacher] = useState(initial?.teacher ?? '')
  const [room, setRoom] = useState(initial?.room ?? '')
  const [color, setColor] = useState(initial?.color ?? COURSE_COLORS[db.courses.length % COURSE_COLORS.length])
  const [meetings, setMeetings] = useState<Meeting[]>(initial?.meetings ?? [blankMeeting()])
  const [confirmDel, setConfirmDel] = useState(false)
  const { touched, touch, touchAll } = useTouched()
  const nameErr = touched.name && !name.trim() ? 'Enter the course name.' : ''
  const upd = (id: string, patch: Partial<Meeting>) => setMeetings(meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  const timeErr = (m: Meeting) => (m.end <= m.start ? 'End time must be after the start.' : !m.days.length ? 'Pick at least one day.' : '')
  function save(e: FormEvent) {
    e.preventDefault(); touchAll(['name'])
    if (!name.trim() || meetings.some(timeErr)) return
    put('courses', { id: initial?.id ?? uid(), name: name.trim(), code: code.trim() || undefined, teacher: teacher.trim() || undefined, room: room.trim() || undefined, color, meetings }, initial ? 'Course saved' : 'Course added')
    onClose()
  }
  return (
    <>
      <FormShell onSubmit={save} footer={<>
        {initial && <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirmDel(true)}>Delete</Button>}
        <span className="spacer" /><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{initial ? 'Save changes' : 'Add course'}</Button>
      </>}>
        <Field label="Course name" error={nameErr}>{(p) => <input {...p} autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => touch('name')} />}</Field>
        <div className="row2">
          <Field label="Course code" optional>{(p) => <input {...p} value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH 220" />}</Field>
          <Field label="Teacher" optional>{(p) => <input {...p} value={teacher} onChange={(e) => setTeacher(e.target.value)} />}</Field>
        </div>
        <Field label="Room" optional>{(p) => <input {...p} value={room} onChange={(e) => setRoom(e.target.value)} />}</Field>
        <fieldset className="swatches"><legend>Color</legend>
          {COURSE_COLORS.map((c) => (
            <label key={c} className="swatch"><input type="radio" name="color" checked={color === c} onChange={() => setColor(c)} /><i style={{ background: c }} /><span className="sr-only">{c}</span></label>
          ))}
        </fieldset>
        <fieldset className="meetings"><legend>Class times</legend>
          {meetings.map((m, i) => (
            <div className="meeting" key={m.id}>
              <div className="days" role="group" aria-label={`Meeting ${i + 1} days`}>
                {DOW.map((d, di) => (
                  <button type="button" key={d} className={'chip' + (m.days.includes(di) ? ' on' : '')} aria-pressed={m.days.includes(di)}
                    onClick={() => upd(m.id, { days: m.days.includes(di) ? m.days.filter((x) => x !== di) : [...m.days, di].sort() })}>{d}</button>
                ))}
              </div>
              <div className="row3">
                <Field label="Starts">{(p) => <input {...p} type="time" value={m.start} onChange={(e) => upd(m.id, { start: e.target.value })} />}</Field>
                <Field label="Ends" error={m.end <= m.start ? 'Must be after the start.' : ''}>{(p) => <input {...p} type="time" value={m.end} onChange={(e) => upd(m.id, { end: e.target.value })} />}</Field>
                <Field label="Day type" hint={db.prefs.abEnabled ? undefined : 'Turn on A/B days in Settings to use these.'}>{(p) => (
                  <select {...p} value={m.pattern} onChange={(e) => upd(m.id, { pattern: e.target.value as any })}>
                    <option value="every">Every day listed</option><option value="A">A days only</option><option value="B">B days only</option>
                  </select>)}</Field>
              </div>
              {!m.days.length && <p className="err">Pick at least one day.</p>}
              {meetings.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setMeetings(meetings.filter((x) => x.id !== m.id))}>Remove this time</Button>}
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setMeetings([...meetings, blankMeeting()])}>Add another class time</Button>
        </fieldset>
      </FormShell>
      <Confirm open={confirmDel} title={`Delete ${initial?.name}?`}
        body={<>This also deletes its {db.assignments.filter((a) => a.courseId === initial?.id).length} assignment(s) and {db.exams.filter((a) => a.courseId === initial?.id).length} exam(s). You can undo right after.</>}
        confirmLabel="Delete course" onCancel={() => setConfirmDel(false)} onConfirm={() => { act.deleteCourse(initial!); setConfirmDel(false); onClose() }} />
    </>
  )
}

/* ---------- Exam + topics ---------- */
export function ExamDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<Exam> }) {
  return <Dialog open={open} onClose={onClose} title={initial?.id ? 'Edit exam' : 'Add exam'} wide><ExamForm initial={initial} onClose={onClose} /></Dialog>
}
function ExamForm({ initial, onClose }: { initial?: Partial<Exam>; onClose: () => void }) {
  const { db, put } = useStore()
  const act = useActions()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [courseId, setCourseId] = useState(initial?.courseId ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [topics, setTopics] = useState<Topic[]>(initial?.topics ?? [])
  const [confirmDel, setConfirmDel] = useState(false)
  const { touched, touch, touchAll } = useTouched()
  const eT = touched.title && !title.trim() ? 'Name the exam.' : '', eD = touched.date && !date ? 'Pick the exam date.' : ''
  function save(e: FormEvent) {
    e.preventDefault(); touchAll(['title', 'date'])
    if (!title.trim() || !date) return
    put('exams', { id: initial?.id ?? uid(), title: title.trim(), courseId: courseId || undefined, date, time: time || undefined, topics: topics.filter((t) => t.title.trim()) }, initial?.id ? 'Exam saved' : 'Exam added')
    onClose()
  }
  return (
    <>
      <FormShell onSubmit={save} footer={<>
        {initial?.id && <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirmDel(true)}>Delete</Button>}
        <span className="spacer" /><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{initial?.id ? 'Save changes' : 'Add exam'}</Button>
      </>}>
        <Field label="Exam name" error={eT}>{(p) => <input {...p} autoFocus value={title} placeholder="Unit 3 exam" onChange={(e) => setTitle(e.target.value)} onBlur={() => touch('title')} />}</Field>
        <Field label="Course" optional>{(p) => (
          <select {...p} value={courseId} onChange={(e) => setCourseId(e.target.value)}><option value="">No course</option>{db.courses.map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</option>)}</select>)}</Field>
        <div className="row2">
          <DateField label="Exam date" value={date} onChange={setDate} error={eD} onBlur={() => touch('date')} />
          <Field label="Time" optional>{(p) => <input {...p} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
        </div>
        <fieldset className="phases"><legend>Topics to study</legend>
          {topics.map((t, i) => (
            <div className="phase-row topic" key={t.id}>
              <input aria-label={`Topic ${i + 1} name`} value={t.title} onChange={(e) => setTopics(topics.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x)))} />
              <input aria-label={`Topic ${i + 1} effort in minutes`} type="number" min={15} step={15} placeholder="min" value={t.effort ?? ''} onChange={(e) => setTopics(topics.map((x) => (x.id === t.id ? { ...x, effort: e.target.value ? Number(e.target.value) : undefined } : x)))} />
              <button type="button" className="icon-btn" aria-label={`Remove topic ${i + 1}`} onClick={() => setTopics(topics.filter((x) => x.id !== t.id))}><Icon name="x" /></button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setTopics([...topics, { id: uid(), title: '', done: false }])}>Add a topic</Button>
          <p className="hint">Effort is your own estimate in minutes. Suggestions use it (45 min if blank).</p>
        </fieldset>
      </FormShell>
      <Confirm open={confirmDel} title="Delete this exam?" body="Its topics and study sessions planned for it will be removed. You can undo right after." confirmLabel="Delete exam"
        onCancel={() => setConfirmDel(false)} onConfirm={() => { act.deleteExam(initial as Exam); setConfirmDel(false); onClose() }} />
    </>
  )
}

/* ---------- Project ---------- */
export function ProjectDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Project }) {
  return <Dialog open={open} onClose={onClose} title={initial ? 'Edit project' : 'Add project'}><ProjectForm initial={initial} onClose={onClose} /></Dialog>
}
function ProjectForm({ initial, onClose }: { initial?: Project; onClose: () => void }) {
  const { db, put } = useStore()
  const act = useActions()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [courseId, setCourseId] = useState(initial?.courseId ?? '')
  const [target, setTarget] = useState(initial?.targetDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [ms, setMs] = useState(initial?.milestones ?? [])
  const [confirmDel, setConfirmDel] = useState(false)
  const { touched, touch, touchAll } = useTouched()
  function save(e: FormEvent) {
    e.preventDefault(); touchAll(['title'])
    if (!title.trim()) return
    put('projects', { id: initial?.id ?? uid(), title: title.trim(), courseId: courseId || undefined, targetDate: target || undefined, notes: notes.trim() || undefined, milestones: ms.filter((m) => m.title.trim()) }, initial ? 'Project saved' : 'Project added')
    onClose()
  }
  return (
    <>
      <FormShell onSubmit={save} footer={<>
        {initial && <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirmDel(true)}>Delete</Button>}
        <span className="spacer" /><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{initial ? 'Save changes' : 'Add project'}</Button>
      </>}>
        <Field label="Project name" error={touched.title && !title.trim() ? 'Name the project.' : ''}>{(p) => <input {...p} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => touch('title')} />}</Field>
        <div className="row2">
          <Field label="Course" optional>{(p) => (<select {...p} value={courseId} onChange={(e) => setCourseId(e.target.value)}><option value="">No course</option>{db.courses.map((c) => <option key={c.id} value={c.id}>{c.code || c.name}</option>)}</select>)}</Field>
          <Field label="Target date" optional>{(p) => <input {...p} type="date" value={target} onChange={(e) => setTarget(e.target.value)} />}</Field>
        </div>
        <Field label="Notes" optional>{(p) => <textarea {...p} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        <fieldset className="phases"><legend>Milestones</legend>
          {ms.map((m, i) => (
            <div className="phase-row" key={m.id}>
              <input aria-label={`Milestone ${i + 1} title`} value={m.title} onChange={(e) => setMs(ms.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))} />
              <input aria-label={`Milestone ${i + 1} date`} type="date" value={m.date ?? ''} onChange={(e) => setMs(ms.map((x) => (x.id === m.id ? { ...x, date: e.target.value || undefined } : x)))} />
              <button type="button" className="icon-btn" aria-label={`Remove milestone ${i + 1}`} onClick={() => setMs(ms.filter((x) => x.id !== m.id))}><Icon name="x" /></button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setMs([...ms, { id: uid(), title: '', done: false }])}>Add a milestone</Button>
        </fieldset>
      </FormShell>
      <Confirm open={confirmDel} title="Delete this project?" body="Assignments linked to it are kept and just unlinked. You can undo right after." confirmLabel="Delete project"
        onCancel={() => setConfirmDel(false)} onConfirm={() => { act.deleteProject(initial!); setConfirmDel(false); onClose() }} />
    </>
  )
}

/* ---------- Study session (planned work, separate from deadlines) ---------- */
export function SessionDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<StudySession> }) {
  return <Dialog open={open} onClose={onClose} title={initial?.id ? 'Edit work session' : 'Plan a work session'}><SessionForm initial={initial} onClose={onClose} /></Dialog>
}
function SessionForm({ initial, onClose }: { initial?: Partial<StudySession>; onClose: () => void }) {
  const { db, put } = useStore()
  const act = useActions()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [start, setStart] = useState(initial?.start ?? '')
  const [duration, setDuration] = useState(String(initial?.duration ?? 45))
  const [link, setLink] = useState(initial?.examId ? `exam:${initial.examId}` : initial?.assignmentId ? `assignment:${initial.assignmentId}` : initial?.projectId ? `project:${initial.projectId}` : '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const { touched, touch, touchAll } = useTouched()
  const dur = Number(duration)
  const errs = { title: !title.trim() ? 'What will you work on?' : '', date: !date ? 'Pick a day.' : '', duration: !(dur >= 5 && dur <= 480) ? 'Enter 5–480 minutes.' : '' }
  const sh = (k: keyof typeof errs) => (touched[k] ? errs[k] : '')
  function save(e: FormEvent) {
    e.preventDefault(); touchAll(['title', 'date', 'duration'])
    if (errs.title || errs.date || errs.duration) return
    const [kind, id] = link ? link.split(':') : []
    put('study_sessions', {
      id: initial?.id ?? uid(), title: title.trim(), date, start: start || undefined, duration: dur, note: note.trim() || undefined,
      examId: kind === 'exam' ? id : undefined, assignmentId: kind === 'assignment' ? id : undefined, projectId: kind === 'project' ? id : undefined,
      topicId: kind === 'exam' ? initial?.topicId : undefined,
      source: initial?.source ?? 'manual', done: initial?.done ?? false,
    }, initial?.id ? 'Session saved' : 'Work session planned')
    onClose()
  }
  return (
    <>
      <FormShell onSubmit={save} footer={<>
        {initial?.id && <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirmDel(true)}>Remove</Button>}
        <span className="spacer" /><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{initial?.id ? 'Save changes' : 'Plan session'}</Button>
      </>}>
        {initial?.source === 'suggestion' && <p className="note-line">This started as a suggestion. Edit anything before saving.</p>}
        <Field label="What will you work on?" error={sh('title')}>{(p) => <input {...p} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => touch('title')} />}</Field>
        <Field label="For" optional hint="Linking connects the session to that item’s page and course.">{(p) => (
          <select {...p} value={link} onChange={(e) => setLink(e.target.value)}>
            <option value="">Nothing in particular</option>
            <optgroup label="Assignments">{db.assignments.filter((a) => !a.done || a.id === initial?.assignmentId).map((a) => <option key={a.id} value={`assignment:${a.id}`}>{a.title}</option>)}</optgroup>
            <optgroup label="Exams">{db.exams.map((x) => <option key={x.id} value={`exam:${x.id}`}>{x.title}</option>)}</optgroup>
            <optgroup label="Projects">{db.projects.map((x) => <option key={x.id} value={`project:${x.id}`}>{x.title}</option>)}</optgroup>
          </select>)}</Field>
        <DateField label="Day" value={date} onChange={setDate} error={sh('date')} onBlur={() => touch('date')} />
        <div className="row2">
          <Field label="Start time" optional>{(p) => <input {...p} type="time" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
          <Field label="Length (minutes)" error={sh('duration')}>{(p) => <input {...p} type="number" inputMode="numeric" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} onBlur={() => touch('duration')} />}</Field>
        </div>
        {start && dur > 0 && <p className="hint">Ends around {addMinutes(start, dur)}.</p>}
        <Field label="Note" optional>{(p) => <textarea {...p} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      </FormShell>
      <Confirm open={confirmDel} title="Remove this session?" body="This only removes the planned block. The deadline or exam stays." confirmLabel="Remove session"
        onCancel={() => setConfirmDel(false)} onConfirm={() => { act.deleteSession(initial as StudySession); setConfirmDel(false); onClose() }} />
    </>
  )
}

/* ---------- Club + event ---------- */
export function ClubDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Club }) {
  return <Dialog open={open} onClose={onClose} title={initial ? 'Edit club or activity' : 'Add club or activity'}><ClubForm initial={initial} onClose={onClose} /></Dialog>
}
function ClubForm({ initial, onClose }: { initial?: Club; onClose: () => void }) {
  const { db, put } = useStore()
  const act = useActions()
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const { touched, touch, touchAll } = useTouched()
  function save(e: FormEvent) {
    e.preventDefault(); touchAll(['name'])
    if (!name.trim()) return
    put('clubs', { id: initial?.id ?? uid(), name: name.trim(), role: role.trim() || undefined, notes: notes.trim() || undefined }, initial ? 'Saved' : 'Club added')
    onClose()
  }
  return (
    <>
      <FormShell onSubmit={save} footer={<>
        {initial && <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirmDel(true)}>Delete</Button>}
        <span className="spacer" /><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{initial ? 'Save changes' : 'Add club'}</Button>
      </>}>
        <Field label="Name" error={touched.name && !name.trim() ? 'Enter a name.' : ''}>{(p) => <input {...p} autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => touch('name')} />}</Field>
        <Field label="Your role" optional>{(p) => <input {...p} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Member, captain, treasurer…" />}</Field>
        <Field label="Notes" optional>{(p) => <textarea {...p} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
      </FormShell>
      <Confirm open={confirmDel} title={`Delete ${initial?.name}?`} body={`Its ${db.events.filter((e) => e.clubId === initial?.id).length} event(s) are deleted too. You can undo right after.`} confirmLabel="Delete club"
        onCancel={() => setConfirmDel(false)} onConfirm={() => { act.deleteClub(initial!); setConfirmDel(false); onClose() }} />
    </>
  )
}

export function EventDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<EventRec> }) {
  return <Dialog open={open} onClose={onClose} title={initial?.id ? 'Edit event' : 'Add event'}><EventForm initial={initial} onClose={onClose} /></Dialog>
}
function EventForm({ initial, onClose }: { initial?: Partial<EventRec>; onClose: () => void }) {
  const { db, put, mutate } = useStore()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [clubId, setClubId] = useState(initial?.clubId ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [start, setStart] = useState(initial?.start ?? '')
  const [end, setEnd] = useState(initial?.end ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [repeat, setRepeat] = useState(initial?.repeat ?? 'none')
  const [until, setUntil] = useState(initial?.until ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const { touched, touch, touchAll } = useTouched()
  const errs = { title: !title.trim() ? 'Name the event.' : '', date: !date ? 'Pick a date.' : '', end: start && end && end <= start ? 'End must be after the start.' : '' }
  const sh = (k: keyof typeof errs) => (touched[k] ? errs[k] : '')
  function save(e: FormEvent) {
    e.preventDefault(); touchAll(['title', 'date', 'end'])
    if (errs.title || errs.date || errs.end) return
    put('events', { id: initial?.id ?? uid(), title: title.trim(), clubId: clubId || undefined, date, start: start || undefined, end: end || undefined, location: location.trim() || undefined, repeat, until: repeat !== 'none' && until ? until : undefined }, initial?.id ? 'Event saved' : 'Event added')
    onClose()
  }
  return (
    <>
      <FormShell onSubmit={save} footer={<>
        {initial?.id && <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirmDel(true)}>Delete</Button>}
        <span className="spacer" /><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{initial?.id ? 'Save changes' : 'Add event'}</Button>
      </>}>
        <Field label="Title" error={sh('title')}>{(p) => <input {...p} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => touch('title')} />}</Field>
        <Field label="Club or activity" optional>{(p) => (<select {...p} value={clubId} onChange={(e) => setClubId(e.target.value)}><option value="">Personal event</option>{db.clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>)}</Field>
        <DateField label="Date" value={date} onChange={setDate} error={sh('date')} onBlur={() => touch('date')} />
        <div className="row2">
          <Field label="Starts" optional>{(p) => <input {...p} type="time" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
          <Field label="Ends" optional error={sh('end')}>{(p) => <input {...p} type="time" value={end} onChange={(e) => setEnd(e.target.value)} onBlur={() => touch('end')} />}</Field>
        </div>
        <Field label="Location" optional>{(p) => <input {...p} value={location} onChange={(e) => setLocation(e.target.value)} />}</Field>
        <div className="row2">
          <Field label="Repeats">{(p) => (<select {...p} value={repeat} onChange={(e) => setRepeat(e.target.value as any)}><option value="none">Doesn’t repeat</option><option value="weekly">Every week</option><option value="biweekly">Every 2 weeks</option></select>)}</Field>
          {repeat !== 'none' && <Field label="Repeat until" optional hint="Blank means no end date.">{(p) => <input {...p} type="date" value={until} onChange={(e) => setUntil(e.target.value)} />}</Field>}
        </div>
      </FormShell>
      <Confirm open={confirmDel} title="Delete this event?" body={repeat !== 'none' ? 'All repeats of this event will be deleted. You can undo right after.' : 'You can undo right after.'} confirmLabel="Delete event"
        onCancel={() => setConfirmDel(false)} onConfirm={() => { mutate({ del: [['events', initial!.id!]] }, 'Event deleted'); setConfirmDel(false); onClose() }} />
    </>
  )
}
