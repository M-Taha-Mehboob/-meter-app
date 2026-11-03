import { useMemo } from 'react'
import { Navigate, Outlet } from 'react-router'
import { openMeterDB } from '../db/schema'
import SyncProvider from '../sync/SyncProvider'
import { DbContext, useAuth } from './context'

/** Layout route: sends signed-out users to /login, opens the user's local database and starts sync. */
export default function RequireAuth() {
  const { user, loading } = useAuth()
  const userId = user?.id
  const db = useMemo(() => (userId ? openMeterDB(userId) : null), [userId])

  if (loading) {
    return <div className="flex min-h-full items-center justify-center text-ink-3">Loading…</div>
  }
  if (!user || !db) return <Navigate to="/login" replace />

  return (
    <DbContext.Provider value={{ db, userId: user.id }}>
      <SyncProvider>
        <Outlet />
      </SyncProvider>
    </DbContext.Provider>
  )
}
