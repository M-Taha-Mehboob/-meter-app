import { useState, type FormEvent } from 'react'
import { useDb } from '../auth/context'
import { addMeter, deleteMeter, updateMeter } from '../db/repo'
import type { Category, Meter } from '../db/schema'
import { formatNumber, parseNumber } from '../lib/format'
import { CategoryGlyph } from './CategoryIcon'
import Modal from './Modal'
import { buttonDanger, buttonPrimary, checkboxClass, inputClass, labelClass } from './styles'

type Props = {
  meter: Meter | null
  categories: Category[]
  allMeters: Meter[]
  defaultCategoryId?: string
  onClose: () => void
  /** Called with the meter's id after saving. */
  onSaved?: (id: string) => void
  onDeleted?: () => void
}

export default function MeterForm({ meter, categories, allMeters, defaultCategoryId, onClose, onSaved, onDeleted }: Props) {
  const { db, userId } = useDb()
  const [name, setName] = useState(meter?.name ?? '')
  const [categoryId, setCategoryId] = useState(meter?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '')
  const [limit, setLimit] = useState(meter?.alert_limit != null ? String(meter.alert_limit) : '')
  const [isActive, setIsActive] = useState(meter?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const unit = categories.find((c) => c.id === categoryId)?.unit ?? 'units'
  const typedLimit = parseNumber(limit)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    const alertLimit = limit.trim() === '' ? null : parseNumber(limit)
    if (!trimmed) return setError('Give the meter a name, e.g. "Ghar ka meter".')
    if (!categoryId) return setError('Choose a category.')
    if (alertLimit !== null && alertLimit <= 0) return setError('The alert limit must be more than 0, or leave it empty.')
    if (limit.trim() !== '' && alertLimit === null) return setError('Enter the alert limit as a number.')
    const duplicate = allMeters.some((m) => m.id !== meter?.id && m.name.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) return setError(`"${trimmed}" already exists.`)

    const data = { name: trimmed, category_id: categoryId, alert_limit: alertLimit, is_active: isActive }
    let id = meter?.id
    if (meter) await updateMeter(db, meter.id, data)
    else id = await addMeter(db, userId, data)
    onClose()
    onSaved?.(id!)
  }

  async function onDelete() {
    if (!meter || !window.confirm(`Delete "${meter.name}" with all its months and readings?`)) return
    await deleteMeter(db, meter.id)
    onClose()
    onDeleted?.()
  }

  return (
    <Modal title={meter ? 'Edit meter' : 'New meter'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <span className={labelClass}>Category</span>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((c) => {
              const selected = c.id === categoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  aria-pressed={selected}
                  aria-label={c.name}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border p-2.5 text-xs font-semibold transition ${
                    selected ? 'border-primary bg-primary-soft text-ink' : 'border-line text-ink-2'
                  }`}
                >
                  <CategoryGlyph name={c.icon} size={20} className={selected ? 'text-primary-text' : ''} />
                  <span className="w-full truncate text-center">{c.name}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label htmlFor="meter-name" className={labelClass}>
            Meter name
          </label>
          <input
            id="meter-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ghar ka meter, Dukaan"
            className={inputClass}
            autoFocus={!meter}
          />
        </div>
        <div>
          <label htmlFor="meter-limit" className={labelClass}>
            Alert when the month reaches ({unit})
          </label>
          <input
            id="meter-limit"
            inputMode="decimal"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="e.g. 200 (empty = no alert)"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-ink-3">
            You get a warning as soon as the month is heading past {typedLimit !== null && typedLimit > 0 ? formatNumber(typedLimit) : 'this'}, and
            a popup when it crosses it.
          </p>
        </div>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className={checkboxClass} />
          Active (show on the home screen)
        </label>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className={`flex-1 ${buttonPrimary}`}>
            Save
          </button>
          {meter && (
            <button type="button" onClick={onDelete} className={buttonDanger}>
              Delete
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
