import { Camera, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useDb } from '../auth/context'
import { addReading, deleteReading, updateReading } from '../db/repo'
import type { Cycle, Reading } from '../db/schema'
import { dateAt, formatDate, formatDateTime, formatNumber, formatReading, fromDateTimeInput, parseNumber, toDateTimeInput } from '../lib/format'
import { compressPhoto } from '../lib/photo'
import Modal from './Modal'
import { PhotoPreview } from './Photo'
import { buttonDanger, buttonPrimary, buttonSecondary, inputClass, labelClass } from './styles'

type Props = {
  meterName: string
  unit: string
  cycle: Cycle
  /** Readings of this month, oldest first. */
  readings: Reading[]
  /** The reading being edited; undefined for a new one. */
  reading?: Reading
  onClose: () => void
  /** Called instead of onClose after a reading is added or changed (not after a delete). */
  onSaved?: () => void
}

type NewPhoto = { blob: Blob; url: string }

/** A few minutes of slack for a phone clock that runs slightly behind. */
const isFuture = (iso: string) => new Date(iso).getTime() > Date.now() + 5 * 60_000

export default function ReadingForm({ meterName, unit, cycle, readings, reading, onClose, onSaved }: Props) {
  const { db, userId } = useDb()
  const [value, setValue] = useState(reading ? formatReading(reading.reading) : '')
  const [takenAt, setTakenAt] = useState(() => toDateTimeInput(reading?.taken_at ?? new Date().toISOString()))
  const [note, setNote] = useState(reading?.note ?? '')
  // undefined = keep the saved photo, null = no photo, otherwise a newly taken photo
  const [photo, setPhoto] = useState<NewPhoto | null | undefined>(reading ? undefined : null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const photoUrl = photo ? photo.url : null

  // Free the previous preview whenever the photo changes or the form closes.
  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo])

  const others = readings.filter((r) => r.id !== reading?.id)
  const takenIso = fromDateTimeInput(takenAt)
  const before = takenIso ? others.filter((r) => r.taken_at < takenIso).at(-1) : others.at(-1)
  const after = takenIso ? others.find((r) => r.taken_at > takenIso) : undefined
  const previousValue = before?.reading ?? cycle.opening_reading
  const parsed = parseNumber(value)
  const diff = parsed !== null && parsed >= previousValue ? parsed - previousValue : null
  const savedPhotoPath = photo === undefined ? reading?.photo_path ?? null : null

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      const blob = await compressPhoto(file)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
    } catch {
      setError('That photo could not be read. Try taking it again.')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (parsed === null || parsed < 0) return setError('Enter the number shown on the meter.')
    if (!takenIso) return setError('Enter the date and time of the reading.')
    if (new Date(takenIso) < dateAt(cycle.start_date)) {
      return setError(`This month started on ${formatDate(cycle.start_date)}. Pick a time after that.`)
    }
    if (isFuture(takenIso)) return setError('The time is in the future.')
    if (parsed < previousValue) {
      const from = before ? `the reading of ${formatDateTime(before.taken_at)}` : 'the opening reading'
      return setError(`The reading can't be less than ${from} (${formatReading(previousValue)}).`)
    }
    if (after && parsed > after.reading) {
      return setError(`The reading can't be more than the later one of ${formatDateTime(after.taken_at)} (${formatReading(after.reading)}).`)
    }

    setBusy(true)
    const data = { reading: parsed, taken_at: takenIso, note: note.trim() || null }
    const photoChange = photo === undefined ? undefined : (photo?.blob ?? null)
    if (reading) await updateReading(db, reading, data, photoChange)
    else await addReading(db, userId, { meter_id: cycle.meter_id, cycle_id: cycle.id }, data, photoChange ?? null)
    setBusy(false)
    if (onSaved) onSaved()
    else onClose()
  }

  async function onDelete() {
    if (!reading || !window.confirm(`Delete the reading ${formatReading(reading.reading)} of ${formatDateTime(reading.taken_at)}?`)) return
    await deleteReading(db, reading)
    onClose()
  }

  return (
    <Modal title={reading ? 'Edit reading' : `New reading · ${meterName}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="reading-value" className={labelClass}>
            Meter reading
          </label>
          <input
            id="reading-value"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={formatReading(previousValue)}
            className={`${inputClass} text-2xl font-bold tracking-wider tabular-nums`}
            autoFocus={!reading}
          />
          <p className="mt-1.5 text-sm text-ink-3">
            {before ? `Previous: ${formatReading(before.reading)} on ${formatDateTime(before.taken_at)}` : `Opening: ${formatReading(cycle.opening_reading)}`}
            {diff !== null && <span className="font-semibold text-primary-text"> · +{formatNumber(diff)} {unit}</span>}
          </p>
        </div>

        <div>
          <label htmlFor="reading-time" className={labelClass}>
            Date and time
          </label>
          <input id="reading-time" type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="reading-note" className={labelClass}>
            Note (optional)
          </label>
          <input id="reading-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. AC chala tha" className={inputClass} />
        </div>

        <div>
          <span className={labelClass}>Photo of the meter (optional)</span>
          {photoUrl ? (
            <img src={photoUrl} alt="New photo of the meter" className="max-h-56 w-full rounded-xl object-cover" />
          ) : (
            savedPhotoPath && <PhotoPreview path={savedPhotoPath} />
          )}
          <div className="mt-2 flex gap-2">
            <label className={`flex-1 cursor-pointer ${buttonSecondary}`}>
              <Camera size={18} />
              {photoUrl || savedPhotoPath ? 'Retake photo' : 'Take photo'}
              <input
                id="reading-photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void onPickPhoto(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
            {(photoUrl || savedPhotoPath) && (
              <button type="button" onClick={() => setPhoto(null)} className={buttonSecondary} aria-label="Remove photo">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={`flex-1 ${buttonPrimary}`}>
            {busy ? 'Saving…' : 'Save reading'}
          </button>
          {reading && (
            <button type="button" onClick={onDelete} className={buttonDanger} aria-label="Delete reading">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
