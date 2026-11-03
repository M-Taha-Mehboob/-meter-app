import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useDb } from '../auth/context'
import CategoryForm from '../components/CategoryForm'
import CategoryIcon from '../components/CategoryIcon'
import MeterForm from '../components/MeterForm'
import { buttonPrimary, buttonSecondary, cardClass } from '../components/styles'
import { useCategories, useMeters } from '../db/hooks'
import { addDefaultCategories } from '../db/repo'
import type { Category, Meter } from '../db/schema'
import { formatNumber } from '../lib/format'

export default function MetersPage() {
  const { db, userId } = useDb()
  const navigate = useNavigate()
  const categories = useCategories(db)
  const meters = useMeters(db)
  // undefined = closed, null = new
  const [editingCategory, setEditingCategory] = useState<Category | null | undefined>(undefined)
  const [editingMeter, setEditingMeter] = useState<{ meter: Meter | null; categoryId?: string } | null>(null)

  if (categories === undefined || meters === undefined) return <p className="text-ink-3">Loading…</p>

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Meters</h2>
        <button onClick={() => setEditingCategory(null)} className={buttonSecondary}>
          <Plus size={18} /> Category
        </button>
      </div>

      {categories.length === 0 && (
        <div className={`${cardClass} space-y-3 p-5 text-center`}>
          <p className="font-semibold">No categories yet</p>
          <p className="text-sm text-ink-3">Every meter belongs to a category such as Bijli, Gas or Pani.</p>
          <button onClick={() => addDefaultCategories(db, userId)} className={`w-full ${buttonPrimary}`}>
            Add Bijli, Gas and Pani
          </button>
        </div>
      )}

      {categories.map((category) => {
        const list = meters.filter((m) => m.category_id === category.id)
        return (
          <div key={category.id} className="space-y-2">
            <div className="flex items-center gap-3 px-1">
              <CategoryIcon name={category.icon} />
              <button onClick={() => setEditingCategory(category)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-bold">{category.name}</p>
                <p className="text-xs text-ink-3">
                  {list.length} {list.length === 1 ? 'meter' : 'meters'} · {category.unit} · tap to edit
                </p>
              </button>
              <button
                onClick={() => setEditingMeter({ meter: null, categoryId: category.id })}
                aria-label={`Add a ${category.name} meter`}
                className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-text"
              >
                <Plus size={18} />
              </button>
            </div>
            {list.length > 0 && (
              <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
                {list.map((meter) => (
                  <li key={meter.id}>
                    <button onClick={() => setEditingMeter({ meter })} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-card-2">
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate font-semibold ${meter.is_active ? '' : 'text-ink-3 line-through'}`}>{meter.name}</span>
                        <span className="block text-xs text-ink-3">
                          {meter.alert_limit !== null ? `Alert at ${formatNumber(meter.alert_limit)} ${category.unit}` : 'No alert limit'}
                          {!meter.is_active && ' · inactive'}
                        </span>
                      </span>
                      <ChevronRight size={18} className="text-ink-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {editingCategory !== undefined && (
        <CategoryForm category={editingCategory} allCategories={categories} onClose={() => setEditingCategory(undefined)} />
      )}
      {editingMeter && (
        <MeterForm
          meter={editingMeter.meter}
          categories={categories}
          allMeters={meters}
          defaultCategoryId={editingMeter.categoryId}
          onClose={() => setEditingMeter(null)}
          onSaved={(id) => !editingMeter.meter && navigate(`/meter/${id}`)}
        />
      )}
    </section>
  )
}
