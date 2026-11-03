import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDb } from '../auth/context'
import { supabase } from '../lib/supabase'
import { SyncContext, type SyncState } from './context'
import { countPending, syncNow } from './sync'

const AFTER_EDIT_DELAY_MS = 2000
const INTERVAL_MS = 60_000

/** Syncs on start, when coming back online / to the foreground, shortly after edits, and every minute. */
export default function SyncProvider({ children }: { children: ReactNode }) {
  const { db, userId } = useDb()
  const pending = useLiveQuery(() => countPending(db), [db])
  const [online, setOnline] = useState(() => navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const running = useRef(false)
  const runAgain = useRef(false)

  const run = useCallback(async () => {
    if (!supabase || !navigator.onLine) return
    if (running.current) {
      runAgain.current = true
      return
    }
    running.current = true
    setSyncing(true)
    try {
      do {
        runAgain.current = false
        await syncNow(db, supabase, userId)
      } while (runAgain.current)
      setError(null)
      setLastSyncedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      running.current = false
      setSyncing(false)
    }
  }, [db, userId])

  useEffect(() => {
    const first = setTimeout(run, 0)
    const timer = setInterval(run, INTERVAL_MS)
    const onOnline = () => {
      setOnline(true)
      void run()
    }
    const onOffline = () => setOnline(false)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [run])

  // Upload soon after local edits (debounced).
  useEffect(() => {
    if (!pending) return
    const t = setTimeout(run, AFTER_EDIT_DELAY_MS)
    return () => clearTimeout(t)
  }, [pending, run])

  const value = useMemo<SyncState>(
    () => ({ online, syncing, error, pending, lastSyncedAt, syncNow: () => void run() }),
    [online, syncing, error, pending, lastSyncedAt, run],
  )
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
