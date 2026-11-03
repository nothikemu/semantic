import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Backend } from './backend'
import { DB, ListTable, Table, emptyDB, uid } from './types'

export interface Op { put?: [Table, any][]; del?: [ListTable, string][] }
export interface ToastMsg { id: number; text: string; undo?: () => void; tone?: 'ok' | 'error' }
type Status = 'loading' | 'ready' | 'error'

interface Ctx {
  db: DB
  status: Status
  saving: boolean
  loadError?: string
  mutate: (op: Op, toast?: string) => void
  put: <T extends { id: string }>(table: Table, rec: T, toast?: string) => void
  reload: () => void
  toasts: ToastMsg[]
  toast: (text: string, opts?: Partial<ToastMsg>) => void
  dismissToast: (id: number) => void
  announce: string
}
const StoreCtx = createContext<Ctx>(null as any)
export const useStore = () => useContext(StoreCtx)

export function StoreProvider({ backend, userId, children }: { backend: Backend; userId: string; children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => emptyDB(userId))
  const dbRef = useRef(db)
  dbRef.current = db
  const [status, setStatus] = useState<Status>('loading')
  const [loadError, setLoadError] = useState<string>()
  const [pending, setPending] = useState(0)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [announce, setAnnounce] = useState('')
  const nextToast = useRef(1)

  const reload = useCallback(() => {
    setStatus('loading')
    backend.load().then(
      (d) => { setDb(d); setStatus('ready') },
      (e) => { setLoadError(e?.message ?? 'Unknown error'); setStatus('error') },
    )
  }, [backend])
  useEffect(reload, [reload])

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((text: string, opts: Partial<ToastMsg> = {}) => {
    const id = nextToast.current++
    setToasts((t) => [...t.slice(-2), { id, text, ...opts }])
    setAnnounce(text)
    setTimeout(() => dismissToast(id), opts.undo ? 8000 : 4500)
  }, [dismissToast])

  const mutate = useCallback((op: Op, msg?: string) => {
    const before = dbRef.current
    const next: any = { ...before }
    const undo: Op = { put: [], del: [] }
    for (const [t, rec] of op.put ?? []) {
      if (t === 'prefs') { undo.put!.push(['prefs', before.prefs]); next.prefs = rec; continue }
      const list = (next[t] as { id: string }[]).slice()
      const i = list.findIndex((r) => r.id === rec.id)
      if (i >= 0) { undo.put!.push([t, list[i]]); list[i] = rec } else { undo.del!.push([t as ListTable, rec.id]); list.push(rec) }
      next[t] = list
    }
    for (const [t, id] of op.del ?? []) {
      const old = (next[t] as { id: string }[]).find((r) => r.id === id)
      if (!old) continue
      undo.put!.push([t, old])
      next[t] = (next[t] as { id: string }[]).filter((r) => r.id !== id)
    }
    setDb(next)
    setPending((n) => n + 1)
    const run = async () => {
      for (const [t, rec] of op.put ?? []) await backend.save(t, rec)
      for (const [t, id] of op.del ?? []) await backend.remove(t, id)
    }
    run().then(
      () => setPending((n) => n - 1),
      (e) => {
        setPending((n) => n - 1)
        setDb(before)
        toast(`Couldn't save that change (${e?.message ?? 'network error'}). It was reverted — try again.`, { tone: 'error' })
      },
    )
    if (msg) toast(msg, { undo: () => mutate(undo, 'Undone') })
  }, [backend, toast])

  const put = useCallback(<T extends { id: string }>(table: Table, rec: T, msg?: string) => mutate({ put: [[table, rec]] }, msg), [mutate])

  const value = useMemo(() => ({
    db, status, saving: pending > 0, loadError, mutate, put, reload, toasts, toast, dismissToast, announce,
  }), [db, status, pending, loadError, mutate, put, reload, toasts, toast, dismissToast, announce])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export { uid }
