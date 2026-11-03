import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/backend'

interface Auth {
  loading: boolean
  userId?: string
  email?: string
  demo: boolean
  recovery: boolean
  enterDemo: () => void
  signOut: () => Promise<void>
  clearRecovery: () => void
}
const Ctx = createContext<Auth>(null as any)
export const useAuth = () => useContext(Ctx)
const DEMO_KEY = 'margin.mode'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabaseConfigured)
  const [recovery, setRecovery] = useState(false)
  const [demo, setDemo] = useState(() => {
    try { return localStorage.getItem(DEMO_KEY) === 'demo' } catch { return false }
  })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value: Auth = {
    loading,
    userId: session?.user.id ?? (demo ? 'demo' : undefined),
    email: session?.user.email ?? (demo ? 'Demo mode' : undefined),
    demo: !session && demo,
    recovery,
    enterDemo: () => { try { localStorage.setItem(DEMO_KEY, 'demo') } catch { /* ignore */ } setDemo(true) },
    signOut: async () => {
      if (supabase && session) await supabase.auth.signOut()
      try { localStorage.removeItem(DEMO_KEY) } catch { /* ignore */ }
      setDemo(false)
      setSession(null)
    },
    clearRecovery: () => setRecovery(false),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
