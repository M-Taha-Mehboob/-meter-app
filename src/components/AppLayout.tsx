import { useState } from 'react'
import { Outlet } from 'react-router'
import { useAuth } from '../auth/context'
import BottomNav from './BottomNav'
import PasswordSheet from './PasswordSheet'
import SettingsSheet from './SettingsSheet'
import SyncBadge from './SyncBadge'

export default function AppLayout() {
  const { user, needsPassword, dismissPasswordPrompt } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const initial = user?.email.charAt(0).toUpperCase() || '?'

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="sticky top-0 z-20 bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-xl shadow-card" />
            <span className="text-lg font-semibold tracking-tight">
              My <span className="text-primary-text">Meters</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SyncBadge />
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              title={user?.email}
              className="grid h-9 w-9 place-items-center rounded-full border border-line bg-card text-sm font-bold text-primary-text"
            >
              {initial}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 pt-2 pb-28">
        <Outlet />
      </main>
      <BottomNav />
      {settingsOpen && (
        <SettingsSheet
          onClose={() => setSettingsOpen(false)}
          onChangePassword={() => {
            setSettingsOpen(false)
            setChangingPassword(true)
          }}
        />
      )}
      {/* After an invite / reset link the user must pick a password before anything else. */}
      {(needsPassword || changingPassword) && (
        <PasswordSheet mode={needsPassword ? 'welcome' : 'change'} onClose={() => {
            setChangingPassword(false)
            dismissPasswordPrompt()
          }}
        />
      )}
    </div>
  )
}
