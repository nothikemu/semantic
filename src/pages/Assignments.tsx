import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diffDays, todayISO } from '../lib/dates'
import { useStore } from '../lib/store'
import { useEditors } from '../components/Editors'
import { AssignmentRow } from '../components/rows'
import { Button, Empty, Icon, PageHeader } from '../components/ui'

export function Assignments() {
  const { db } = useStore()
  const ed = useEditors()
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? '', course = sp.get('course') ?? '', status = sp.get('status') ?? 'open', range = sp.get('range') ?? '', sort = sp.get('sort') ?? 'due'
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }) }
  const today = todayISO()
  const list = useMemo(() => {
    let l = db.assignments.filter((a) => {
      if (status === 'open' && a.done) return false
      if (status === 'done' && !a.done) return false
      if (status === 'overdue' && (a.done || a.dueDate >= today)) return false
      if (course && (course === 'none' ? a.courseId : a.courseId !== course)) return false
      const n = diffDays(a.dueDate, today)
      if (range === 'week' && (n < 0 || n > 7)) return false
      if (range === 'month' && (n < 0 || n > 30)) return false
      if (q && !`${a.title} ${a.notes ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
    const pr = { high: 0, normal: 1, low: 2 } as const
    l = [...l].sort((a, b) => status === 'done' ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
      : sort === 'priority' ? pr[a.priority] - pr[b.priority] || a.dueDate.localeCompare(b.dueDate) : a.dueDate.localeCompare(b.dueDate))
    return l
  }, [db.assignments, q, course, status, range, sort, today])
  const counts = { open: db.assignments.filter((a) => !a.done).length, overdue: db.assignments.filter((a) => !a.done && a.dueDate < today).length, done: db.assignments.filter((a) => a.done).length }
  const filtered = q || course || range || status === 'overdue'

  return (
    <div className="page">
      <PageHeader title="Assignments" sub={`${counts.open} open${counts.overdue ? ` · ${counts.overdue} overdue` : ''} · ${counts.done} completed`} actions={<Button onClick={() => ed.open('assignment')}><Icon name="plus" size={18} /> Add assignment</Button>} />
      <div className="tabs" role="tablist" aria-label="Status">
        {[['open', 'Open'], ['overdue', 'Overdue'], ['done', 'Completed'], ['all', 'All']].map(([v, l]) => (
          <button key={v} role="tab" aria-selected={status === v} className={status === v ? 'on' : ''} onClick={() => set('status', v === 'open' ? '' : v)}>{l}</button>
        ))}
      </div>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field"><label htmlFor="q">Search</label><input id="q" type="search" value={q} onChange={(e) => set('q', e.target.value)} placeholder="Title or notes" /></div>
        <div className="field"><label htmlFor="fc">Course</label>
          <select id="fc" value={course} onChange={(e) => set('course', e.target.value)}><option value="">All courses</option>{db.courses.map((c) => <option key={c.id} value={c.id}>{c.code || c.name}</option>)}<option value="none">No course</option></select></div>
        <div className="field"><label htmlFor="fr">Due</label>
          <select id="fr" value={range} onChange={(e) => set('range', e.target.value)}><option value="">Any time</option><option value="week">Next 7 days</option><option value="month">Next 30 days</option></select></div>
        <div className="field"><label htmlFor="fs">Sort by</label>
          <select id="fs" value={sort} onChange={(e) => set('sort', e.target.value)}><option value="due">Due date</option><option value="priority">Priority</option></select></div>
      </form>
      <p className="sr-only" role="status">{list.length} assignment{list.length === 1 ? '' : 's'} shown</p>
      {list.length ? <ul className="list">{list.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul> : (
        <Empty title={filtered ? 'No assignments match' : status === 'done' ? 'Nothing completed yet' : 'No open assignments'}
          action={filtered ? <Button variant="secondary" onClick={() => setSp({}, { replace: true })}>Clear filters</Button> : status !== 'done' ? <Button onClick={() => ed.open('assignment')}>Add assignment</Button> : undefined}>
          {filtered ? 'Try a different search or clear the filters.' : status === 'done' ? 'Completed work shows up here as a history.' : 'Enough for now, or add the next one.'}
        </Empty>
      )}
    </div>
  )
}
