import { useEffect, useState } from 'react'
import type { MeterDB } from '../db/schema'
import { supabase } from './supabase'

export const PHOTO_BUCKET = 'meter-photos'

const MAX_SIDE = 1280
const QUALITY = 0.72

/**
 * Shrinks a camera photo to at most 1280px on the long side as JPEG (a few hundred KB instead of
 * several MB), so the free 1 GB of Supabase Storage lasts.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read the photo.'))), 'image/jpeg', QUALITY),
  )
}

export type PhotoState = { url: string | null; status: 'loading' | 'ready' | 'unavailable' }

/**
 * Object URL for a reading's photo: the copy on this device if there is one, otherwise downloaded
 * once from Supabase and kept on the device for offline viewing.
 */
export function usePhotoUrl(db: MeterDB, path: string | null): PhotoState {
  // Tagged with its path, so a result for an older path is never shown for a new one.
  const [state, setState] = useState<PhotoState & { path: string | null }>({ path: null, url: null, status: 'loading' })

  useEffect(() => {
    if (!path) return
    let cancelled = false
    let url: string | null = null
    const settle = (blob: Blob | null) => {
      if (cancelled) return
      url = blob ? URL.createObjectURL(blob) : null
      setState({ path, url, status: blob ? 'ready' : 'unavailable' })
    }
    ;(async () => {
      const local = await db.photos.get(path)
      if (local?.blob) return settle(local.blob)
      if (!supabase || !navigator.onLine) return settle(null)
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path)
      if (error || !data) return settle(null)
      await db.photos.put({ path, blob: data, state: 'done' })
      settle(data)
    })().catch(() => settle(null))

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [db, path])

  if (!path) return { url: null, status: 'unavailable' }
  if (state.path !== path) return { url: null, status: 'loading' }
  return { url: state.url, status: state.status }
}
