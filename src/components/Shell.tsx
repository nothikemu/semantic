import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../lib/store'
import { useEditors } from './Editors'
import { Icon, Toasts, Wordmark } from './ui'

const NAV = [
  { to: '/', label: 'Today', icon: 'today', end: true },
  { to: '/assignments', label: 'Assignments', icon: 'assign' },
  { to: '/calendar', label: 'Calendar', icon: 'cal' },
  { to: '/courses', label: 'Courses', icon: 'course' },
  { to: '/projects', label: 'Projects', icon: 'project' },
  { to: '/study', label: 'Study plan', icon: 'study' },
  { to: '/clubs', label: 'Clubs', icon: 'club' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
]

function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open, close, ref])
}

function QuickAdd({ variant }: { variant: 'side' | 'fab' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ed = useEditors()
  useDismiss(open, () => setOpen(false), ref)
  const items: [string, string, string?][] = [['assignment', 'Assignment', 'N'], ['session', 'Work session'], ['event', 'Event'], ['exam', 'Exam'], ['course', 'Course'], ['project', 'Project'], ['club', 'Club or activity']]
  return (
    <div className={'quick q-' + variant} ref={ref}>
      <button className="btn primary quick-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <Icon name="plus" /><span>Quick add</span>
      </button>
      {open && (
        <ul className="menu" role="menu" aria-label="Quick add">
          {items.map(([t, l, k]) => (
            <li key={t} role="none"><button role="menuitem" onClick={() => { setOpen(false); ed.open(t as any) }}>{l}{k && <kbd>{k}</kbd>}</button></li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Shell() {
  const { email, demo, signOut } = useAuth()
  const { saving } = useStore()
  const ed = useEditors()
  const loc = useLocation()
  const [more, setMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  useDismiss(more, () => setMore(false), moreRef)
  useEffect(() => { setMore(false); document.getElementById('main')?.focus({ preventScroll: true }); window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input,textarea,select,dialog,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); ed.open('assignment') }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [ed])
  const primary = NAV.filter((n) => ['/', '/assignments', '/calendar', '/study'].includes(n.to))
  const secondary = NAV.filter((n) => !primary.includes(n))
  return (
    <div className="shell">
      <a href="#main" className="skip">Skip to content</a>
      {demo && <div className="demo-banner" role="note"><strong>Local demo mode.</strong> Not an account — data stays in this browser only and isn’t secured.</div>}
      <aside className="side">
        <Wordmark />
        <QuickAdd variant="side" />
        <nav aria-label="Main">
          <ul>{NAV.map((n) => (
            <li key={n.to}><NavLink to={n.to} end={n.end}><Icon name={n.icon} /><span>{n.label}</span></NavLink></li>
          ))}</ul>
        </nav>
        <div className="side-foot">
          <p className="who" title={email}>{email}</p>
          <p className="sync" role="status">{saving ? 'Saving…' : demo ? 'Saved in this browser' : 'All changes saved'}</p>
          <button className="link-btn" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <header className="topbar"><Wordmark small /><span className="sync" role="status">{saving ? 'Saving…' : ''}</span></header>
      <main id="main" tabIndex={-1}><Outlet /></main>
      <nav className="bottom" aria-label="Main">
        <ul>
          {primary.map((n) => <li key={n.to}><NavLink to={n.to} end={n.end}><Icon name={n.icon} /><span>{n.label.replace(' plan', '')}</span></NavLink></li>)}
          <li ref={moreRef as any} className="more-li">
            <button aria-expanded={more} aria-haspopup="menu" onClick={() => setMore(!more)} className={secondary.some((n) => loc.pathname.startsWith(n.to)) ? 'active' : ''}><Icon name="more" /><span>More</span></button>
            {more && (
              <ul className="menu up" role="menu" aria-label="More sections">
                {secondary.map((n) => <li key={n.to} role="none"><NavLink role="menuitem" to={n.to}>{n.label}</NavLink></li>)}
                <li role="none"><button role="menuitem" onClick={signOut}>Sign out</button></li>
              </ul>
            )}
          </li>
        </ul>
      </nav>
      <QuickAdd variant="fab" />
      <Toasts />
    </div>
  )
}
