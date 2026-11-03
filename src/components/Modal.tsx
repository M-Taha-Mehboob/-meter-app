import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  /** false = no close button, backdrop tap or Escape (for steps the user must finish). */
  dismissable?: boolean
}

/** Bottom sheet on phones, centred dialog on wider screens. */
export default function Modal({ title, onClose, children, dismissable = true }: Props) {
  useEffect(() => {
    if (!dismissable) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, dismissable])

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          {dismissable && (
            <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-card-2 text-ink-2">
              <X size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
