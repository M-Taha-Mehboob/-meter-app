import { ArrowRight, Gauge, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useDb } from '../auth/context'
import { CategoryGlyph } from '../components/CategoryIcon'
import MeterForm from '../components/MeterForm'
import ReadingFlow from '../components/ReadingFlow'
import StatusPill from '../components/StatusPill'
import { buttonPrimary, buttonSecondary, captionClass, cardClass, lcdClass } from '../components/styles'
import RingGauge from '../components/RingGauge'
import { useCategories, useMeterViews, type MeterView } from '../db/hooks'
import { addDefaultCategories } from '../db/repo'
import type { Category } from '../db/schema'
import { categoryColor, tint } from '../lib/category'
import { formatDateTime, formatNumber } from '../lib/format'

export default function HomePage() {
  const { db, userId } = useDb()
  const navigate = useNavigate()
  const categories = useCategories(db)
  const views = useMeterViews(db)
  const [noting, setNoting] = useState<MeterView | null>(null)
  const [addingMeter, setAddingMeter] = useState(false)

  if (categories === undefined || views === undefined) return <p className="text-ink-3">Loading…</p>

  if (categories.length === 0) {
    return (
      <EmptyState title="Welcome to My Meters" text="First make categories for your meters. Bijli, Gas and Pani are ready to add, or make your own.">
        <button onClick={() => addDefaultCategories(db, userId)} className={`w-full ${buttonPrimary}`}>
          Add Bijli, Gas and Pani
        </button>
        <Link to="/meters" className={`w-full ${buttonSecondary}`}>
          Make my own
        </Link>
      </EmptyState>
    )
  }

  const active = views.filter((v) => v.meter.is_active)
  const meterForm = addingMeter && (
    <MeterForm
      meter={null}
      categories={categories}
      allMeters={views.map((v) => v.meter)}
      onClose={() => setAddingMeter(false)}
      onSaved={(id) => navigate(`/meter/${id}`)}
    />
  )

  if (active.length === 0) {
    return (
      <>
        <EmptyState title="Add your first meter" text='Pick a category and give the meter your own name, e.g. "Ghar ka meter".'>
          <button onClick={() => setAddingMeter(true)} className={`w-full ${buttonPrimary}`}>
            <Plus size={18} /> Add meter
          </button>
        </EmptyState>
        {meterForm}
      </>
    )
  }

  // Meters in category order; each card names its own category.
  const cards = categories.flatMap((category) =>
    active.filter((v) => v.meter.category_id === category.id).map((view) => ({ category, view })),
  )

  return (
    <section className="space-y-4">
      <Hero views={active} />
      <h2 className={`${captionClass} px-1 pt-1 text-ink-3`}>Your meters</h2>
      {cards.map(({ category, view }) => (
        <MeterCard key={view.meter.id} view={view} category={category} onAddReading={() => setNoting(view)} />
      ))}
      <button onClick={() => setAddingMeter(true)} className={`w-full ${buttonSecondary}`}>
        <Plus size={18} /> Add meter
      </button>
      {noting && <ReadingFlow view={noting} onClose={() => setNoting(null)} />}
      {meterForm}
    </section>
  )
}

function greeting(now = new Date()) {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function Hero({ views }: { views: MeterView[] }) {
  const over = views.filter((v) => v.stats?.status === 'over').length
  const warn = views.filter((v) => v.stats?.status === 'warn').length
  const notStarted = views.filter((v) => !v.cycle).length
  let headline = 'All meters are on track'
  if (over) headline = `${over} ${over === 1 ? 'meter has' : 'meters have'} crossed the limit`
  else if (warn) headline = `${warn} ${warn === 1 ? 'meter is' : 'meters are'} heading over the limit`
  else if (views.every((v) => v.stats?.limit == null)) headline = `${views.length} ${views.length === 1 ? 'meter' : 'meters'} this month`
  const [now] = useState(() => new Date())
  const stamp = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getFullYear()).slice(2)}`

  return (
    <div className={`${lcdClass} p-5`}>
      <div className="flex items-center justify-between">
        <p className={`${captionClass} text-lcd-dim`}>{greeting(now)}</p>
        <p className="lcd-digits text-lg" aria-label={now.toDateString()}>
          {stamp}
        </p>
      </div>
      <p className="mt-3 text-[1.65rem] leading-tight font-semibold tracking-tight text-balance">{headline}</p>
      <p className="mt-1.5 text-sm text-lcd-dim">
        {notStarted > 0
          ? `${notStarted} ${notStarted === 1 ? 'meter needs' : 'meters need'} the opening reading from the bill.`
          : 'Tap Reading on a meter to note today’s number.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {views.map(({ meter, category, stats }) => {
          const color = stats?.status === 'over' ? 'var(--danger)' : categoryColor(category?.icon)
          return (
            <span key={meter.id} className="inline-flex max-w-full items-center gap-2 rounded-full border border-lcd-line bg-lcd-to/50 py-1 pr-3 pl-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              <span className="truncate text-lcd-text">{meter.name}</span>
              {stats && <span className="font-lcd text-lcd-digit">{formatNumber(stats.used)}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function MeterCard({ view, category, onAddReading }: { view: MeterView; category: Category; onAddReading: () => void }) {
  const { meter, stats, cycle } = view
  const unit = category.unit
  const color = stats?.status === 'over' ? 'var(--danger)' : categoryColor(category.icon)
  const percent = stats?.limit ? Math.round((stats.used / stats.limit) * 100) : null

  return (
    <div className={`${cardClass} relative overflow-hidden`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full blur-2xl"
        style={{ background: tint(categoryColor(category.icon), 18) }}
      />
      <Link to={`/meter/${meter.id}`} className="relative flex items-center gap-4 p-4 pb-3">
        <RingGauge
          used={stats?.used ?? 0}
          limit={stats?.limit ?? null}
          projected={stats?.projected ?? null}
          size={88}
          stroke={8}
          color={color}
          track="var(--chart-track)"
          limitColor="var(--chart-limit)"
          label={stats?.limit ? `${percent}% of the ${formatNumber(stats.limit)} ${unit} limit` : `${meter.name}`}
        >
          {percent !== null ? (
            <>
              <span className="text-lg leading-none font-bold tabular-nums">{percent}%</span>
              <span className="mt-0.5 text-[10px] text-ink-3">of limit</span>
            </>
          ) : (
            <span style={{ color: categoryColor(category.icon) }}>
              <CategoryGlyph name={category.icon} size={24} />
            </span>
          )}
        </RingGauge>
        <div className="min-w-0 flex-1">
          <p className={`${captionClass} flex items-center gap-1`} style={{ color: categoryColor(category.icon) }}>
            <CategoryGlyph name={category.icon} size={12} />
            {category.name}
          </p>
          <p className="mt-0.5 text-lg leading-snug font-semibold break-words">{meter.name}</p>
          {!cycle || !stats ? (
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-text">
              Enter the opening reading <ArrowRight size={16} />
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-ink-2">
                <span className="text-[1.75rem] leading-none font-bold tracking-tight text-ink tabular-nums">{formatNumber(stats.used)}</span>{' '}
                <span className="text-sm">{unit}</span>
              </p>
              {stats.projected !== null && (
                <p className="mt-1 text-xs text-ink-3 tabular-nums">
                  Heading for {formatNumber(stats.projected)} · {formatNumber(stats.avgPerDay ?? 0)} a day
                </p>
              )}
            </>
          )}
        </div>
      </Link>
      {cycle && stats && (
        <div className="relative flex items-center gap-2 border-t border-line px-4 py-2.5">
          <p className="min-w-0 flex-1 truncate text-xs text-ink-3">
            {stats.latestAt ? `Last ${formatDateTime(stats.latestAt)}` : 'No reading yet this month'}
          </p>
          <StatusPill status={stats.status} />
          <button
            onClick={onAddReading}
            aria-label={`Note a reading for ${meter.name}`}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-95"
            style={{ background: tint(categoryColor(category.icon), 16), color: 'var(--ink)' }}
          >
            <Plus size={16} style={{ color: categoryColor(category.icon) }} /> Reading
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className={`${cardClass} mx-auto mt-4 flex max-w-sm flex-col items-center gap-3 p-8 text-center`}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary-text">
        <Gauge size={26} />
      </span>
      <p className="text-lg font-bold">{title}</p>
      <p className="text-sm text-ink-3">{text}</p>
      <div className="mt-2 flex w-full flex-col gap-2">{children}</div>
    </div>
  )
}
