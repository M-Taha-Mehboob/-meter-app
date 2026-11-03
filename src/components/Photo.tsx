import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { useDb } from '../auth/context'
import { usePhotoUrl } from '../lib/photo'
import Modal from './Modal'

/** Small square preview of a reading's photo; tap to see it full size. */
export function PhotoThumb({ path }: { path: string }) {
  const { db } = useDb()
  const { url, status } = usePhotoUrl(db, path)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (url) setOpen(true)
        }}
        aria-label="Show meter photo"
        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-card-2 text-ink-3"
      >
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : status === 'loading' ? null : <ImageOff size={16} />}
      </button>
      {open && url && (
        <Modal title="Meter photo" onClose={() => setOpen(false)}>
          <img src={url} alt="Photo of the meter" className="w-full rounded-xl" />
        </Modal>
      )}
    </>
  )
}

/** Larger preview used inside the reading form. */
export function PhotoPreview({ path }: { path: string }) {
  const { db } = useDb()
  const { url, status } = usePhotoUrl(db, path)
  if (url) return <img src={url} alt="Photo of the meter" className="max-h-56 w-full rounded-xl object-cover" />
  return (
    <p className="rounded-xl bg-card-2 p-3 text-sm text-ink-3">
      {status === 'loading' ? 'Loading photo…' : 'Photo not on this device yet. It shows once you are online.'}
    </p>
  )
}
