import { Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/context'
import { buttonPrimary, buttonSecondary, cardClass, inputClass } from '../components/styles'
import { emailLinkError, isSupabaseConfigured } from '../lib/supabase'

export default function LoginPage() {
  const { user, loading, signIn, sendPasswordReset, startDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(
    emailLinkError ? `That email link didn't work (${emailLinkError}). Ask for a new invite, or use "Forgot password?".` : null,
  )

  // Dashboard straight after login.
  if (!loading && user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await signIn(email.trim(), password)
    setBusy(false)
    if (message) setError(message)
  }

  async function onForgot() {
    setError(null)
    setNotice(null)
    if (!email.trim()) return setError('Type your email above first.')
    setBusy(true)
    const message = await sendPasswordReset(email.trim())
    setBusy(false)
    if (message) return setError(message)
    setNotice(`If ${email.trim()} has an account, a reset link is on its way. Open it on this phone to choose a new password.`)
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="lcd-panel absolute inset-x-0 top-0 h-80 rounded-b-[2.75rem]" />

      <div className="relative mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 px-6 py-10">
        <div className="text-center text-lcd-text">
          <img src="/favicon.svg" alt="" className="mx-auto mb-4 h-20 w-20 rounded-[1.4rem] shadow-[0_0_40px_-6px_var(--lcd-glow)]" />
          <h1 className="text-3xl font-semibold tracking-tight">
            My <span className="text-lcd-digit">Meters</span>
          </h1>
          <p className="lcd-digits mt-1 text-base">HAR UNIT KA HISAAB</p>
        </div>

        <form onSubmit={onSubmit} className={`${cardClass} space-y-3 p-5`}>
          <h2 className="mb-1 text-lg font-bold">Sign in</h2>
          {!isSupabaseConfigured && (
            <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
              Supabase keys missing: copy <code>.env.example</code> to <code>.env.local</code> and fill them in.
            </p>
          )}
          <label className="relative block">
            <Mail size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </label>
          <label className="relative block">
            <Lock size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </label>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          {notice && <p className="rounded-xl bg-primary-soft p-3 text-sm text-primary-text">{notice}</p>}
          <button type="submit" disabled={busy || !isSupabaseConfigured} className={`w-full ${buttonPrimary}`}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" onClick={onForgot} disabled={busy} className="w-full text-center text-sm font-semibold text-primary-text">
            Forgot password?
          </button>
          {startDemo && (
            <button type="button" onClick={startDemo} className={`w-full ${buttonSecondary}`}>
              Try the demo (dev only, nothing syncs)
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
