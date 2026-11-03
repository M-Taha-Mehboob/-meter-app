import { createContext, useContext } from 'react'
import type { MeterDB } from '../db/schema'

export interface AuthUser {
  id: string
  email: string
}

export interface AuthState {
  user: AuthUser | null
  /** True until the stored session has been checked on startup. */
  loading: boolean
  /** Returns an error message, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  /** True after opening an invite / password-reset link: the user must choose a password. */
  needsPassword: boolean
  /** Sets the signed-in user's password. Returns an error message, or null on success. */
  setPassword: (password: string) => Promise<string | null>
  /** Hides the set-password prompt once the user has seen the confirmation. */
  dismissPasswordPrompt: () => void
  /** Emails a password-reset link. Returns an error message, or null on success. */
  sendPasswordReset: (email: string) => Promise<string | null>
  /** Dev server without Supabase keys only: open the app with a local demo user (nothing syncs). */
  startDemo: (() => void) | null
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export interface DbState {
  db: MeterDB
  userId: string
}

export const DbContext = createContext<DbState | null>(null)

/** The signed-in user's local database. Only available inside the authenticated layout. */
export function useDb(): DbState {
  const ctx = useContext(DbContext)
  if (!ctx) throw new Error('useDb must be used inside <DbProvider>')
  return ctx
}
