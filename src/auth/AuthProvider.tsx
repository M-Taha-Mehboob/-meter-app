import { isAuthRetryableFetchError, type User } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { emailLinkType, supabase } from '../lib/supabase'
import { AuthContext, type AuthState, type AuthUser } from './context'

// The last signed-in user, so the app still opens offline when the access token
// has expired and can't be refreshed. Supabase keeps the session itself; this is only the fallback.
const CACHE_KEY = 'my-meters:last-user'

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function cacheUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // storage unavailable (private mode): offline fallback just won't work
  }
}

const toAuthUser = (u: User): AuthUser => ({ id: u.id, email: u.email ?? '' })

/** Dev-only user for trying the screens before the Supabase keys are set. Data stays in this browser. */
const DEMO_USER: AuthUser = { id: 'local-demo', email: 'demo (this browser only)' }
const DEMO_ALLOWED = import.meta.env.DEV && !supabase

export default function AuthProvider({ children }: { children: ReactNode }) {
  // The demo user survives a reload (dev only); a real session is restored by getSession below.
  const [user, setUser] = useState<AuthUser | null>(() => (DEMO_ALLOWED && readCachedUser()?.id === DEMO_USER.id ? DEMO_USER : null))
  const [loading, setLoading] = useState(supabase !== null)
  // Invited users have no password yet; a reset link means they forgot it. Either way, ask for one.
  const [needsPassword, setNeedsPassword] = useState(emailLinkType === 'invite' || emailLinkType === 'recovery')

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    client.auth.getSession().then(({ data, error }) => {
      if (data.session) {
        const u = toAuthUser(data.session.user)
        cacheUser(u)
        setUser(u)
      } else if (error && isAuthRetryableFetchError(error)) {
        setUser(readCachedUser()) // offline with an expired token
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
      if (event === 'SIGNED_OUT') {
        cacheUser(null)
        setUser(null)
      } else if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        const u = toAuthUser(session.user)
        cacheUser(u)
        setUser((prev) => (prev?.id === u.id && prev.email === u.email ? prev : u))
      }
      // INITIAL_SESSION is handled by getSession above (it can't tell "offline" from "signed out").
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        if (!supabase) return 'Supabase is not configured (.env.local).'
        if (!navigator.onLine) return 'No internet. The first sign-in needs a connection.'
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error) return null
        if (error.message === 'Invalid login credentials') return 'Wrong email or password.'
        return error.message
      },
      async signOut() {
        cacheUser(null)
        setUser(null)
        setNeedsPassword(false)
        // 'local' clears this device's session without needing the network.
        await supabase?.auth.signOut({ scope: 'local' })
      },
      needsPassword,
      async setPassword(password) {
        if (!supabase) return 'Supabase is not configured (.env.local).'
        if (!navigator.onLine) return 'No internet. Changing the password needs a connection.'
        const { error } = await supabase.auth.updateUser({ password })
        return error ? error.message : null
      },
      dismissPasswordPrompt: () => setNeedsPassword(false),
      async sendPasswordReset(email) {
        if (!supabase) return 'Supabase is not configured (.env.local).'
        if (!navigator.onLine) return 'No internet.'
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        return error ? error.message : null
      },
      startDemo: DEMO_ALLOWED
        ? () => {
            cacheUser(DEMO_USER)
            setUser(DEMO_USER)
          }
        : null,
    }),
    [user, loading, needsPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
