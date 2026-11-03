import { useState, type FormEvent } from 'react'
import { useDb } from '../auth/context'
import { addCategory, CategoryInUseError, deleteCategory, updateCategory } from '../db/repo'
import type { Category, CategoryIcon } from '../db/schema'
import { CategoryGlyph } from './CategoryIcon'
import Modal from './Modal'
import { buttonDanger, buttonPrimary, inputClass, labelClass } from './styles'

const ICONS: { id: CategoryIcon; label: string }[] = [
  { id: 'zap', label: 'Bijli' },
  { id: 'flame', label: 'Gas' },
  { id: 'droplet', label: 'Pani' },
  { id: 'gauge', label: 'Other' },
]

export default function CategoryForm({ category, allCategories, onClose }: { category: Category | null; allCategories: Category[]; onClose: () => void }) {
  const { db, userId } = useDb()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState<CategoryIcon>(category?.icon ?? 'gauge')
  const [unit, setUnit] = useState(category?.unit ?? 'units')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Enter a name.')
    if (!unit.trim()) return setError('Enter the unit, e.g. units or m³.')
    const duplicate = allCategories.some((c) => c.id !== category?.id && c.name.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) return setError(`"${trimmed}" already exists.`)

    const data = { name: trimmed, icon, unit: unit.trim() }
    if (category) await updateCategory(db, category.id, data)
    else await addCategory(db, userId, data)
    onClose()
  }

  async function onDelete() {
    if (!category || !window.confirm(`Delete "${category.name}"?`)) return
    try {
      await deleteCategory(db, category.id)
      onClose()
    } catch (err) {
      if (!(err instanceof CategoryInUseError)) throw err
      setError('This category still has meters. Move or delete them first.')
    }
  }

  return (
    <Modal title={category ? 'Edit category' : 'New category'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="category-name" className={labelClass}>
            Name
          </label>
          <input id="category-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus={!category} />
        </div>
        <div>
          <span className={labelClass}>Icon</span>
          <div className="grid grid-cols-4 gap-2">
            {ICONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setIcon(id)}
                aria-pressed={icon === id}
                className={`flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-xs font-semibold transition ${
                  icon === id ? 'border-primary bg-primary-soft text-ink' : 'border-line text-ink-2'
                }`}
              >
                <CategoryGlyph name={id} size={20} className={icon === id ? 'text-primary-text' : ''} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="category-unit" className={labelClass}>
            Unit
          </label>
          <input id="category-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="units, m³, gallons" className={inputClass} />
        </div>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className={`flex-1 ${buttonPrimary}`}>
            Save
          </button>
          {category && (
            <button type="button" onClick={onDelete} className={buttonDanger}>
              Delete
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
