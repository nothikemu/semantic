import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/backend'
import { useAuth } from './AuthContext'
import { Button, Field, Wordmark } from '../components/ui'

type Mode = 'signin' | 'signup' | 'forgot' | 'reset'

export function SetupNotice() {
  const { enterDemo } = useAuth()
  return (
    <section className="notice" aria-labelledby="setup-h">
      <h2 id="setup-h">Accounts aren’t set up yet</h2>
      <p>
        Sign-in needs a Supabase project. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to a
        <code> .env</code> file (see <code>.env.example</code>), run <code>supabase/migrations/0001_init.sql</code>, then restart the dev server.
      </p>
      <p>
        <strong>Demo mode</strong> lets you try the app now. It is <strong>not an account</strong>: there is no password, nothing is secure,
        and data stays in this browser only.
      </p>
      <Button variant="secondary" onClick={enterDemo}>Continue in local demo mode</Button>
    </section>
  )
}

export function AuthPage({ mode }: { mode: Mode }) {
  const { userId, recovery, clearRecovery } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const effective: Mode = recovery ? 'reset' : mode
  if (userId && !(effective === 'reset')) return <Navigate to={(loc.state as any)?.from ?? '/'} replace />

  const validate = () => {
    const e: Record<string, string> = {}
    if (effective !== 'reset') {
      if (!email.trim()) e.email = 'Enter your email address.'
      else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'That doesn’t look like an email address — check for typos.'
    }
    if (effective !== 'forgot') {
      if (!password) e.password = effective === 'signin' ? 'Enter your password.' : 'Choose a password.'
      else if (effective !== 'signin' && password.length < 8) e.password = 'Use at least 8 characters.'
    }
    setErrors(e)
    return e
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setFormError(''); setInfo('')
    const e = validate()
    if (Object.keys(e).length) { setTimeout(() => (document.querySelector('.field.has-error input') as HTMLElement | null)?.focus(), 0); return }
    if (!supabase) return
    setBusy(true)
    try {
      if (effective === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        nav('/', { replace: true })
      } else if (effective === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        if (!data.session) setInfo('Account created. Check your email for a confirmation link, then sign in.')
      } else if (effective === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset` })
        if (error) throw error
        setInfo('If an account exists for that email, a reset link is on its way. It can take a minute.')
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        clearRecovery()
        nav('/', { replace: true })
      }
    } catch (err: any) {
      const msg = String(err?.message ?? '')
      setFormError(
        /invalid login/i.test(msg) ? 'That email and password don’t match. Check both, or reset your password.'
        : /already registered/i.test(msg) ? 'An account with that email already exists. Try signing in instead.'
        : /rate|too many/i.test(msg) ? 'Too many attempts. Wait a minute and try again.'
        : /fetch|network/i.test(msg) ? 'Couldn’t reach the server. Check your connection and try again.'
        : msg || 'Something went wrong. Try again.',
      )
    } finally { setBusy(false) }
  }

  const titles: Record<Mode, string> = { signin: 'Welcome back', signup: 'Create your account', forgot: 'Reset your password', reset: 'Choose a new password' }
  const cta: Record<Mode, string> = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Save new password' }

  return (
    <main className="auth">
      <div className="auth-card">
        <Wordmark />
        <h1>{titles[effective]}</h1>
        {!supabaseConfigured ? <SetupNotice /> : (
          <form onSubmit={submit} noValidate>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            {info && <p className="form-info" role="status">{info}</p>}
            {effective !== 'reset' && (
              <Field label="Email" error={errors.email}>
                {(p) => <input {...p} type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={validate} />}
              </Field>
            )}
            {effective !== 'forgot' && (
              <Field label={effective === 'reset' ? 'New password' : 'Password'} error={errors.password} hint={effective !== 'signin' ? 'At least 8 characters.' : undefined}>
                {(p) => (
                  <div className="pw">
                    <input {...p} type={show ? 'text' : 'password'} name="password" autoComplete={effective === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="link-btn" aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}<span className="sr-only"> password</span></button>
                  </div>
                )}
              </Field>
            )}
            <Button type="submit" busy={busy} block>{cta[effective]}</Button>
          </form>
        )}
        <nav className="auth-links" aria-label="Account options">
          {effective === 'signin' && <><Link to="/signup">Create an account</Link><Link to="/forgot">Forgot password?</Link></>}
          {effective === 'signup' && <Link to="/signin">Already have an account? Sign in</Link>}
          {effective === 'forgot' && <Link to="/signin">Back to sign in</Link>}
        </nav>
      </div>
    </main>
  )
}
