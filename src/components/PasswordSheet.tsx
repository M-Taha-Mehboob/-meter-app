import { CheckCircle2, Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import Modal from './Modal'
import { buttonPrimary, inputClass, labelClass } from './styles'

const MIN_LENGTH = 8

/**
 * Choose a password. "welcome" = right after an invite / reset link (can't be skipped, or the user
 * could never sign in again); "change" = from Settings.
 */
export default function PasswordSheet({ mode, onClose }: { mode: 'welcome' | 'change'; onClose: () => void }) {
  const { user, setPassword } = useAuth()
  const [password, setPasswordText] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
    if (password !== confirm) return setError('The two passwords are not the same.')
    setBusy(true)
    setError(null)
    const message = await setPassword(password)
    setBusy(false)
    if (message) return setError(message)
    setDone(true)
  }

  if (done) {
    return (
      <Modal title="Password saved" onClose={onClose}>
        <div className="space-y-4">
          <p className="flex gap-2 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 size={18} className="shrink-0" />
            From now on sign in with {user?.email} and this password, on any phone.
          </p>
          <button onClick={onClose} className={`w-full ${buttonPrimary}`}>
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={mode === 'welcome' ? 'Set your password' : 'Change password'} onClose={onClose} dismissable={mode === 'change'}>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === 'welcome' && (
          <p className="text-sm text-ink-2">
            Welcome! Your login is <span className="font-semibold text-ink">{user?.email}</span>. Choose a password so
            you can sign in again later, also from the home-screen app.
          </p>
        )}
        <div>
          <label htmlFor="new-password" className={labelClass}>
            New password
          </label>
          <div className="relative">
            <Lock size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPasswordText(e.target.value)}
              className={`${inputClass} pl-10`}
              autoFocus
            />
          </div>
        </div>
        <div>
          <label htmlFor="confirm-password" className={labelClass}>
            Type it again
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <button type="submit" disabled={busy} className={`w-full ${buttonPrimary}`}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </Modal>
  )
}
