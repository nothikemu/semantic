import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useStore } from '../lib/store'

const P: Record<string, string> = {
  plus: 'M12 5v14M5 12h14', check: 'M5 12.5l4.5 4.5L19 7.5', x: 'M6 6l12 12M18 6L6 18',
  today: 'M4 6h16M4 12h10M4 18h7', assign: 'M6 4h12v16H6zM9 9h6M9 13h6M9 17h3',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', course: 'M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z M12 6v13',
  project: 'M3 7h7l2 2h9v10H3z', study: 'M12 3a6 6 0 00-3 11v3h6v-3a6 6 0 00-3-11zM9.5 20h5', club: 'M8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 2.5-5 6-5s6 2 6 5M16 11a3 3 0 100-6M17 15c3 0 5 2 5 5',
  gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4',
  more: 'M5 12h.01M12 12h.01M19 12h.01', left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  edit: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l5 5', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  clock: 'M12 4a8 8 0 100 16 8 8 0 000-16zM12 8v4l3 2', flag: 'M6 21V4h11l-2 4 2 4H6',
}
export function Icon({ name, size = 20 }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={P[name]} />
    </svg>
  )
}

export function Wordmark({ small }: { small?: boolean }) {
  return (
    <span className={'wordmark' + (small ? ' small' : '')}>
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="7" y="4" width="4" height="24" rx="1" fill="var(--accent)" />
        <rect x="14" y="9" width="12" height="2.5" fill="currentColor" />
        <rect x="14" y="15" width="12" height="2.5" fill="currentColor" />
        <rect x="14" y="21" width="8" height="2.5" fill="currentColor" />
      </svg>
      Margin
    </span>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; busy?: boolean; block?: boolean; size?: 'sm' | 'md' }
export function Button({ variant = 'primary', busy, block, size = 'md', className = '', children, disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn ${variant} ${size} ${block ? 'block' : ''} ${className}`} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy && <span className="spinner" aria-hidden="true" />}{children}
    </button>
  )
}

export function Field({ label, error, hint, optional, children }: {
  label: string; error?: string; hint?: string; optional?: boolean
  children: (p: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
}) {
  const id = useId()
  const desc = [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined
  return (
    <div className={'field' + (error ? ' has-error' : '')}>
      <label htmlFor={id}>{label}{optional && <span className="opt"> (optional)</span>}</label>
      {children({ id, 'aria-describedby': desc, 'aria-invalid': error ? true : undefined })}
      {hint && <p className="hint" id={`${id}-h`}>{hint}</p>}
      {error && <p className="err" id={`${id}-e`}>{error}</p>}
    </div>
  )
}

export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const tid = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  if (!open) return <dialog ref={ref} />
  return (
    <dialog ref={ref} className={'dialog' + (wide ? ' wide' : '')} aria-labelledby={tid}
      onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose() }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="dialog-body">
        <header className="dialog-head">
          <h2 id={tid}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog"><Icon name="x" /></button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

export function Confirm({ open, title, body, confirmLabel, onConfirm, onCancel }: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="dialog-content"><p>{body}</p></div>
      <footer className="dialog-foot">
        <Button variant="ghost" onClick={onCancel}>Keep it</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </footer>
    </Dialog>
  )
}

export function Toasts() {
  const { toasts, dismissToast, announce } = useStore()
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announce}</div>
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={'toast ' + (t.tone ?? '')} role={t.tone === 'error' ? 'alert' : undefined}>
            <span>{t.text}</span>
            {t.undo && <button className="link-btn" onClick={() => { t.undo!(); dismissToast(t.id) }}><Icon name="undo" size={16} /> Undo</button>}
            <button className="icon-btn small" onClick={() => dismissToast(t.id)} aria-label="Dismiss message"><Icon name="x" size={16} /></button>
          </div>
        ))}
      </div>
    </>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'good' | 'accent' }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function CourseTag({ course }: { course?: { code?: string; name: string; color: string } }) {
  if (!course) return <span className="course-tag muted">No course</span>
  return <span className="course-tag"><i style={{ background: course.color }} aria-hidden="true" />{course.code || course.name}</span>
}
