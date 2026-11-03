import { AlertTriangle, Check, CloudOff, CloudUpload, RefreshCw } from 'lucide-react'
import { useSync } from '../sync/context'

/** Small status pill in the header; tap to sync now (or see the error). */
export default function SyncBadge() {
  const { online, syncing, error, pending, syncNow } = useSync()

  let label: string
  let tone: string
  let icon
  if (!online) {
    label = pending ? `Offline · ${pending}` : 'Offline'
    tone = 'bg-card-2 text-ink-2'
    icon = <CloudOff size={14} />
  } else if (syncing) {
    label = 'Syncing'
    tone = 'bg-primary-soft text-primary-text'
    icon = <RefreshCw size={14} className="animate-spin" />
  } else if (error) {
    label = 'Sync error'
    tone = 'bg-danger-soft text-danger'
    icon = <AlertTriangle size={14} />
  } else if (pending) {
    label = `${pending} unsynced`
    tone = 'bg-warn-soft text-warn'
    icon = <CloudUpload size={14} />
  } else {
    label = 'Synced'
    tone = 'bg-ok-soft text-ok'
    icon = <Check size={14} />
  }

  function onClick() {
    if (error) window.alert(`Sync failed:\n${error}\n\nYour data is safe on this device. Retrying now.`)
    syncNow()
  }

  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {icon}
      {label}
    </button>
  )
}
