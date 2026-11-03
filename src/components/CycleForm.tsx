import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useDb } from '../auth/context'
import { deleteCycle, startCycle, updateCycle } from '../db/repo'
import type { Cycle, Reading } from '../db/schema'
import { addDays, formatDate, formatDateTime, formatReading, parseNumber, toISODate, todayISO } from '../lib/format'
import Modal from './Modal'
import { buttonDanger, buttonPrimary, inputClass, labelClass } from './styles'

const DEFAULT_CYCLE_DAYS = 30

type Props = {
  meterId: string
  unit: string
  /** All months of the meter, oldest first. */
  cycles: Cycle[]
  /** The month being edited; undefined to start a new one. */
  cycle?: Cycle
  /**
   * Readings of the meter's current month, oldest first. Editing that month keeps them inside it;
   * a new month takes over the ones noted on or after its start date.
   */
  readings: Reading[]
  /** Latest reading of the meter, shown as a hint for a new month's opening. */
  lastReading?: number
  onClose: () => void
}

/** Start a billing month with the opening reading from the bill, or correct one. */
const dayOf = (r: Reading) => toISODate(new Date(r.taken_at))

export default function CycleForm({ meterId, unit, cycles, cycle, readings, lastReading, onClose }: Props) {
  const { db, userId } = useDb()
  const [startDate, setStartDate] = useState(cycle?.start_date ?? todayISO())
  const [endDate, setEndDate] = useState(cycle?.end_date ?? addDays(todayISO(), DEFAULT_CYCLE_DAYS))
  const [endTouched, setEndTouched] = useState(Boolean(cycle))
  const [opening, setOpening] = useState(cycle ? formatReading(cycle.opening_reading) : '')
  const [error, setError] = useState<string | null>(null)

  const others = cycles.filter((c) => c.id !== cycle?.id)
  const index = cycle ? cycles.findIndex((c) => c.id === cycle.id) : cycles.length
  const prev = cycles[index - 1]
  const next = cycle ? cycles[index + 1] : undefined
  // Starting a new month: readings from its start date on belong to it.
  const moving = cycle ? [] : readings.filter((r) => startDate && dayOf(r) >= startDate)
  const staying = cycle ? [] : readings.filter((r) => !startDate || dayOf(r) < startDate)

  function onStartChange(value: string) {
    setStartDate(value)
    if (!endTouched && value) setEndDate(addDays(value, DEFAULT_CYCLE_DAYS))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const openingValue = parseNumber(opening)
    if (!startDate || !endDate) return setError('Enter both dates.')
    if (endDate <= startDate) return setError('The next bill date must be after the start date.')
    if (openingValue === null || openingValue < 0) return setError('Enter the opening reading from the bill.')
    if (others.some((c) => c.start_date === startDate)) return setError(`A month already starts on ${formatDate(startDate)}.`)
    if (prev && startDate < prev.start_date) return setError(`Must start after the previous month (${formatDate(prev.start_date)}).`)
    if (next && startDate > next.start_date) return setError(`Must start before the next month (${formatDate(next.start_date)}).`)
    const first = cycle ? readings[0] : moving[0]
    if (cycle && first && dayOf(first) < startDate) {
      return setError(`This month has a reading on ${formatDate(dayOf(first))}. Start on or before that day.`)
    }
    if (first && openingValue > first.reading) {
      return setError(`The opening can't be more than the reading of ${formatDateTime(first.taken_at)} (${formatReading(first.reading)}).`)
    }
    const lastStaying = staying.at(-1)
    if (lastStaying && openingValue < lastStaying.reading) {
      return setError(`The opening can't be less than the reading of ${formatDateTime(lastStaying.taken_at)} (${formatReading(lastStaying.reading)}).`)
    }

    const data = { start_date: startDate, end_date: endDate, opening_reading: openingValue }
    if (cycle) await updateCycle(db, cycle.id, data)
    else await startCycle(db, userId, meterId, data, moving.map((r) => r.id))
    onClose()
  }

  async function onDelete() {
    if (!cycle || !window.confirm(`Delete the month starting ${formatDate(cycle.start_date)} and all its readings?`)) return
    await deleteCycle(db, cycle.id)
    onClose()
  }

  return (
    <Modal title={cycle ? 'Edit month' : cycles.length === 0 ? 'Start the first month' : 'Start a new month'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {!cycle && (
          <p className="text-sm text-ink-2">
            Take the <span className="font-semibold text-ink">present reading</span> and reading date from your latest bill.
          </p>
        )}
        <div>
          <label htmlFor="cycle-opening" className={labelClass}>
            Opening reading ({unit})
          </label>
          <input
            id="cycle-opening"
            inputMode="decimal"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder={lastReading !== undefined ? formatReading(lastReading) : '0'}
            className={`${inputClass} text-2xl font-bold tracking-wider tabular-nums`}
            autoFocus={!cycle}
          />
          {!cycle && lastReading !== undefined && (
            <p className="mt-1.5 text-sm text-ink-3">Last reading you noted: {formatReading(lastReading)}</p>
          )}
        </div>
        {/* Side by side only when a long date format still fits. */}
        <div className="grid gap-3 min-[420px]:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="cycle-start" className={labelClass}>
              Reading date
            </label>
            <input id="cycle-start" type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)} className={inputClass} />
          </div>
          <div className="min-w-0">
            <label htmlFor="cycle-end" className={labelClass}>
              Next bill date
            </label>
            <input
              id="cycle-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndTouched(true)
                setEndDate(e.target.value)
              }}
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-ink-3">The next bill date is used to estimate where the month will end up.</p>
        {moving.length > 0 && (
          <p className="rounded-2xl bg-primary-soft px-3 py-2 text-sm text-primary-text">
            {moving.length === 1 ? 'The reading' : `${moving.length} readings`} you noted from {formatDate(dayOf(moving[0]))} on{' '}
            {moving.length === 1 ? 'moves' : 'move'} into the new month.
          </p>
        )}
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className={`flex-1 ${buttonPrimary}`}>
            {cycle ? 'Save' : 'Start month'}
          </button>
          {cycle && (
            <button type="button" onClick={onDelete} className={buttonDanger} aria-label="Delete month">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
