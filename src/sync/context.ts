import { createContext, useContext } from 'react'

export interface SyncState {
  online: boolean
  syncing: boolean
  /** Last error message, cleared by the next successful sync. */
  error: string | null
  /** Local changes not yet uploaded. undefined while counting. */
  pending: number | undefined
  lastSyncedAt: Date | null
  syncNow: () => void
}

export const SyncContext = createContext<SyncState | null>(null)

export function useSync(): SyncState {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>')
  return ctx
}
