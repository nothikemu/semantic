import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DB, LIST_TABLES, ListTable, Table, defaultPrefs, emptyDB, Prefs } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabaseConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT'))
export const supabase: SupabaseClient | null = supabaseConfigured ? createClient(url!, key!) : null

export interface Backend {
  load(): Promise<DB>
  save(table: Table, rec: { id: string }): Promise<void>
  remove(table: ListTable, id: string): Promise<void>
  wipe(): Promise<void>
}

/** Real, account-scoped storage. Row-level security enforces per-user access server-side. */
export function supabaseBackend(userId: string): Backend {
  const sb = supabase!
  return {
    async load() {
      const db = emptyDB(userId) as any
      const results = await Promise.all(LIST_TABLES.map((t) => sb.from(t).select('data')))
      results.forEach((r, i) => {
        if (r.error) throw r.error
        db[LIST_TABLES[i]] = (r.data ?? []).map((row: any) => row.data)
      })
      const p = await sb.from('preferences').select('data').eq('id', userId).maybeSingle()
      if (p.error) throw p.error
      if (p.data) db.prefs = { ...defaultPrefs(userId), ...(p.data.data as Prefs) }
      return db as DB
    },
    async save(table, rec) {
      const res = await sb.from(table === 'prefs' ? 'preferences' : table).upsert(
        { id: rec.id, user_id: userId, data: rec, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
      if (res.error) throw res.error
    },
    async remove(table, id) {
      const res = await sb.from(table).delete().eq('id', id)
      if (res.error) throw res.error
    },
    async wipe() {
      for (const t of LIST_TABLES) {
        const res = await sb.from(t).delete().eq('user_id', userId)
        if (res.error) throw res.error
      }
    },
  }
}

/** Demo storage: this browser only, NOT an account. */
export function localBackend(): Backend {
  const KEY = 'margin.demo.v1'
  const read = (): DB => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const db = JSON.parse(raw)
        return { ...emptyDB('demo'), ...db, prefs: { ...defaultPrefs('demo'), ...db.prefs } }
      }
    } catch { /* ignore */ }
    return emptyDB('demo')
  }
  const write = (db: DB) => localStorage.setItem(KEY, JSON.stringify(db))
  return {
    async load() { return read() },
    async save(table, rec) {
      const db = read() as any
      if (table === 'prefs') db.prefs = rec
      else {
        const list = db[table] as { id: string }[]
        const i = list.findIndex((r) => r.id === rec.id)
        if (i >= 0) list[i] = rec; else list.push(rec)
      }
      write(db)
    },
    async remove(table, id) {
      const db = read() as any
      db[table] = db[table].filter((r: { id: string }) => r.id !== id)
      write(db)
    },
    async wipe() { localStorage.removeItem(KEY) },
  }
}
