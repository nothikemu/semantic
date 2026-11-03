import { useMemo, useState } from 'react'
import { addDays, addMonths, DOW, fmtDate, rangeDays, startOfMonth, startOfWeek, todayISO, weekday } from '../lib/dates'
import { abDay, itemsInRange, KINDS, type CalItem, type Kind } from '../lib/derive'
import { useStore } from '../lib/store'
import { useEditors } from '../components/Editors'
import { ItemRow } from '../components/rows'
import { Button, Icon, PageHeader } from '../components/ui'

type View = 'day' | 'week' | 'month' | 'agenda'

export function CalendarPage() {
  const { db, put } = useStore()
  const ed = useEditors()
  const today = todayISO()
  const [anchor, setAnchor] = useState(today)
  const [selected, setSelected] = useState(today)
  const view: View = db.prefs.calendarView
  const hidden = db.prefs.hiddenKinds
  const setView = (v: View) => put('prefs', { ...db.prefs, calendarView: v })
  const toggle = (k: Kind) => put('prefs', { ...db.prefs, hiddenKinds: hidden.includes(k) ? hidden.filter((x) => x !== k) : [...hidden, k] })

  const { from, to, title } = useMemo(() => {
    if (view === 'day') return { from: anchor, to: anchor, title: fmtDate(anchor, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }
    if (view === 'week') { const s = startOfWeek(anchor); return { from: s, to: addDays(s, 6), title: `${fmtDate(s, { month: 'short', day: 'numeric' })} – ${fmtDate(addDays(s, 6), { month: 'short', day: 'numeric', year: 'numeric' })}` } }
    if (view === 'month') { const s = startOfMonth(anchor); return { from: startOfWeek(s), to: addDays(startOfWeek(addMonths(s, 1)), 6), title: fmtDate(s, { month: 'long', year: 'numeric' }) } }
    return { from: anchor, to: addDays(anchor, 30), title: `Next 30 days from ${fmtDate(anchor, { month: 'short', day: 'numeric' })}` }
  }, [view, anchor])
  const all = useMemo(() => itemsInRange(db, from, to), [db, from, to])
  const items = all.filter((i) => !hidden.includes(i.kind))
  const byDay = (d: string) => items.filter((i) => i.date === d)
  const step = (dir: 1 | -1) => setAnchor(view === 'day' ? addDays(anchor, dir) : view === 'week' ? addDays(anchor, 7 * dir) : view === 'month' ? addMonths(anchor, dir) : addDays(anchor, 30 * dir))

  const DayBlock = ({ d, hideEmpty }: { d: string; hideEmpty?: boolean }) => {
    const list = byDay(d)
    const hol = db.holidays.find((h) => d >= h.start && d <= h.end)
    const ab = abDay(db, d)
    if (hideEmpty && !list.length && !hol) return null
    return (
      <section className={'day-block' + (d === today ? ' is-today' : '')} aria-label={fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}>
        <h3><span>{fmtDate(d, { weekday: 'short' })}</span> <span className="num">{fmtDate(d, { month: 'short', day: 'numeric' })}</span>{d === today && <span className="today-pill">Today</span>}{ab && <span className="ab">{ab} day</span>}</h3>
        {hol && <p className="holiday">{hol.name} — no classes</p>}
        {list.length ? <ul className="list compact">{list.map((i) => <ItemRow key={i.key} i={i} />)}</ul> : !hol && <p className="quiet">Nothing scheduled.</p>}
      </section>
    )
  }

  const monthDays = view === 'month' ? rangeDays(from, to).slice(0, 42) : []

  return (
    <div className="page wide">
      <PageHeader title="Calendar" sub="Classes, due dates, exams, planned work and events in one place. Not synced with any outside calendar."
        actions={<Button variant="secondary" onClick={() => ed.open('event', { date: selected })}><Icon name="plus" size={18} /> Add event</Button>} />
      <div className="cal-bar">
        <div className="seg" role="group" aria-label="Calendar view">
          {(['day', 'week', 'month', 'agenda'] as View[]).map((v) => <button key={v} aria-pressed={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
        </div>
        <div className="nav-group">
          <button className="icon-btn bordered" onClick={() => step(-1)} aria-label="Previous"><Icon name="left" /></button>
          <Button variant="secondary" size="sm" onClick={() => { setAnchor(today); setSelected(today) }}>Today</Button>
          <button className="icon-btn bordered" onClick={() => step(1)} aria-label="Next"><Icon name="right" /></button>
        </div>
        <h2 className="cal-title" aria-live="polite">{title}</h2>
      </div>
      <fieldset className="legend">
        <legend>Show</legend>
        {KINDS.map((k) => (
          <label key={k.kind} className={`legend-item kind-${k.kind}`}>
            <input type="checkbox" checked={!hidden.includes(k.kind)} onChange={() => toggle(k.kind)} />
            <span className="swatch-mark" aria-hidden="true" />{k.label}
          </label>
        ))}
        <p className="hint legend-note"><strong>Due</strong> marks a deadline (solid). <strong>Work session</strong> marks time you planned (dashed).</p>
      </fieldset>

      {view === 'day' && <DayBlock d={anchor} />}
      {view === 'week' && <div className="week">{rangeDays(from, to).map((d) => <DayBlock key={d} d={d} />)}</div>}
      {view === 'agenda' && (items.length ? <div className="agenda">{rangeDays(from, to).map((d) => <DayBlock key={d} d={d} hideEmpty />)}</div> : <p className="quiet">Nothing in the next 30 days with these categories shown.</p>)}
      {view === 'month' && (
        <>
          <div className="month" role="grid" aria-label={title}>
            <div className="month-head" role="row">{DOW.map((d) => <span key={d} role="columnheader">{d}</span>)}</div>
            <div className="month-body">
              {monthDays.map((d) => {
                const list = byDay(d)
                const out = d.slice(0, 7) !== startOfMonth(anchor).slice(0, 7)
                const hol = db.holidays.some((h) => d >= h.start && d <= h.end)
                return (
                  <button key={d} role="gridcell" className={'cell' + (out ? ' out' : '') + (d === today ? ' today' : '') + (d === selected ? ' sel' : '') + (hol ? ' hol' : '')}
                    aria-selected={d === selected} aria-label={`${fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}, ${list.length} item${list.length === 1 ? '' : 's'}${hol ? ', holiday' : ''}`} onClick={() => setSelected(d)} onDoubleClick={() => { setSelected(d); setAnchor(d); setView('day') }}>
                    <span className="n">{Number(d.slice(8))}</span>
                    <span className="chips-mini">
                      {list.slice(0, 3).map((i) => <span key={i.key} className={`mini kind-${i.kind}`}><span className="mini-t">{i.title}</span></span>)}
                      {list.length > 3 && <span className="more-ct">+{list.length - 3}</span>}
                    </span>
                    <span className="dots" aria-hidden="true">{Array.from(new Set(list.map((i) => i.kind))).map((k) => <i key={k} className={`dot kind-${k}`} />)}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <DayBlock d={selected} />
        </>
      )}
      {!db.courses.length && !db.assignments.length && <p className="quiet">Your calendar fills in as you add courses, assignments and events.</p>}
    </div>
  )
}
export type { CalItem }
void weekday
