import { Check, KeyRound, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useAuth } from '../auth/context'
import { useSync } from '../sync/context'
import { ACCENTS, useTheme, type ThemeMode } from '../theme/theme'
import Modal from './Modal'
import { buttonDanger, buttonSecondary } from './styles'

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: 'Auto', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
]

export default function SettingsSheet({ onClose, onChangePassword }: { onClose: () => void; onChangePassword: () => void }) {
  const { user, signOut } = useAuth()
  const { pending } = useSync()
  const { mode, accent, setMode, setAccent } = useTheme()

  function onSignOut() {
    // Local data is kept either way; unsynced rows upload after the next sign-in.
    const message = pending
      ? `${pending} change(s) are not uploaded yet. They stay on this device and upload after you sign in again.\n\nSign out?`
      : 'Sign out?'
    if (window.confirm(message)) void signOut()
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="space-y-6">
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-2">Appearance</h4>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card-2 p-1">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition ${
                  mode === id ? 'bg-card text-ink shadow-card' : 'text-ink-3'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink-2">Colour</h4>
          <div className="grid grid-cols-4 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                aria-pressed={accent === a.id}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-xs font-semibold transition ${
                  accent === a.id ? 'border-primary bg-primary-soft text-ink' : 'border-line text-ink-2'
                }`}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: a.swatch }}>
                  {accent === a.id && <Check size={16} strokeWidth={3} />}
                </span>
                {a.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <p className="text-sm text-ink-2">
            Signed in as <span className="font-semibold text-ink">{user?.email}</span>
          </p>
          <button onClick={onChangePassword} className={`w-full ${buttonSecondary}`}>
            <KeyRound size={18} />
            Change password
          </button>
          <button onClick={onSignOut} className={`w-full ${buttonDanger}`}>
            <LogOut size={18} />
            Sign out
          </button>
        </section>
      </div>
    </Modal>
  )
}
