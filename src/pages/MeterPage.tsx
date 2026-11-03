import { AlertTriangle, ArrowLeft, BarChart3, CalendarDays, CalendarPlus, NotebookPen, Pencil, Plus, Siren, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useDb } from '../auth/context'
import CategoryIcon, { CategoryGlyph } from '../components/CategoryIcon'
import DailyUsageChart from '../components/charts/DailyUsageChart'
import CycleForm from '../components/CycleForm'
import MeterDigits from '../components/MeterDigits'
import MeterForm from '../components/MeterForm'
import { PhotoThumb } from '../components/Photo'
import ReadingFlow from '../components/ReadingFlow'
import { buttonPrimary, buttonSecondary, captionClass, cardClass, iconButton, lcdClass } from '../components/styles'
import RingGauge from '../components/RingGauge'
import { useCategories, useMeters, useMeterView, type MeterView } from '../db/hooks'
import type { Reading } from '../db/schema'
import { categoryColor, tint } from '../lib/category'
import { dailyUsage, type CycleStats } from '../lib/cycle'
import { formatDate, formatDateTime, formatNumber, formatReading, formatShortDate, todayISO } from '../lib/format'

export default function MeterPage() {
  const { id } = useParams()
  const { db } = useDb()
  const navigate = useNavigate()
  const view = useMeterView(db, id)
  const categories = useCategories(db)
  const meters = useMeters(db)
  // undefined = closed, null = new reading
  const [reading, setReading] = useState<Reading | null | undefined>(undefined)
  const [cycleForm, setCycleForm] = useState<'new' | 'edit' | null>(null)
  const [editingMeter, setEditingMeter] = useState(false)

  if (view === undefined) return <p className="text-ink-3">Loading…</p>
  if (view === null) {
    return (
      <div className="space-y-3 pt-6 text-center">
        <p className="font-semibold">This meter doesn’t exist any more.</p>
        <Link to="/" className="font-semibold text-primary-text">
          Back to home
        </Link>
      </div>
    )
  }

  const { meter, category, cycle, cycles, readings, stats } = view
  const unit = category?.unit ?? 'units'

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/" aria-label="Back" className={iconButton}>
          <ArrowLeft size={20} />
        </Link>
        <CategoryIcon name={category?.icon} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold tracking-tight">{meter.name}</h2>
          <p className="text-xs text-ink-3">
            {category?.name ?? 'No category'}
            {meter.alert_limit !== null && ` · alert at ${formatNumber(meter.alert_limit)} ${unit}`}
          </p>
        </div>
        <button onClick={() => setEditingMeter(true)} aria-label="Edit meter" className={iconButton}>
          <Pencil size={18} />
        </button>
      </div>

      {!cycle || !stats ? (
        <div className={`${cardClass} flex flex-col items-center gap-3 p-8 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary-text">
            <NotebookPen size={22} />
          </span>
          <p className="font-semibold">Start with your bill</p>
          <p className="text-sm text-ink-3">Enter the present reading and reading date from your latest bill. Units are counted from there.</p>
          <button onClick={() => setCycleForm('new')} className={buttonPrimary}>
            <CalendarPlus size={18} /> Enter opening reading
          </button>
        </div>
      ) : (
        <>
          <Hero view={view} stats={stats} unit={unit} />
          <LimitNotice stats={stats} unit={unit} />
          {cycle.end_date <= todayISO() && (
            <div className={`${cardClass} space-y-3 p-4`}>
              <p className="text-sm text-ink-2">
                The bill date ({formatDate(cycle.end_date)}) has come. When the new bill arrives, start the new month with its present reading.
              </p>
              <button onClick={() => setCycleForm('new')} className={`w-full ${buttonPrimary}`}>
                <CalendarPlus size={18} /> Start new month
              </button>
            </div>
          )}
          <StatsGrid stats={stats} unit={unit} />

          <Card title="Units per day" subtitle={`${formatShortDate(cycle.start_date)} to ${formatShortDate(cycle.end_date)}`}>
            {readings.length === 0 ? (
              <p className="text-sm text-ink-3">The chart starts with your first reading.</p>
            ) : (
              <DailyUsageChart
                days={dailyUsage(cycle, readings)}
                unit={unit}
                dailyLimit={stats.limit !== null && stats.daysTotal > 0 ? stats.limit / stats.daysTotal : null}
              />
            )}
          </Card>

          <Card title="Readings this month">
            <ReadingList view={view} onEdit={setReading} onEditOpening={() => setCycleForm('edit')} />
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCycleForm('new')} className={buttonSecondary}>
              <CalendarPlus size={18} /> New month
            </button>
            <Link to={`/summary?meter=${meter.id}`} className={buttonSecondary}>
              <BarChart3 size={18} /> Summary
            </Link>
          </div>

          <button
            onClick={() => setReading(null)}
            className={`fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 rounded-full px-5 py-3.5 shadow-lg sm:right-[max(1rem,calc(50%-17rem))] ${buttonPrimary}`}
          >
            <Plus size={20} /> Reading
          </button>
          {/* Room to scroll the last row out from under the floating button. */}
          <div aria-hidden="true" className="h-14" />
        </>
      )}

      {reading !== undefined && <ReadingFlow view={view} reading={reading ?? undefined} onClose={() => setReading(undefined)} />}
      {cycleForm && (
        <CycleForm
          meterId={meter.id}
          unit={unit}
          cycles={cycles}
          cycle={cycleForm === 'edit' ? cycle ?? undefined : undefined}
          readings={readings}
          lastReading={cycleForm === 'new' && stats ? stats.latest : undefined}
          onClose={() => setCycleForm(null)}
        />
      )}
      {editingMeter && categories && meters && (
        <MeterForm
          meter={meter}
          categories={categories}
          allMeters={meters}
          onClose={() => setEditingMeter(false)}
          onDeleted={() => navigate('/', { replace: true })}
        />
      )}
    </section>
  )
}

function Hero({ view, stats, unit }: { view: MeterView; stats: CycleStats; unit: string }) {
  const cycle = view.cycle!
  const icon = view.category?.icon
  const over = stats.status === 'over'
  // Same colour as the meter's card on Home: its category's, or red once over the limit.
  const ringColor = over ? 'var(--danger)' : categoryColor(icon)
  return (
    <div className={`${lcdClass} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`${captionClass} flex items-center gap-1.5 text-lcd-dim`}>
          <span style={{ color: categoryColor(icon) }}>
            <CategoryGlyph name={icon} size={14} />
          </span>
          This month
        </p>
        {(stats.status === 'warn' || over) && (
          <span
            className={`${captionClass} rounded-full px-2.5 py-1`}
            style={{ background: tint(over ? 'var(--danger)' : 'var(--lcd-glow)', 22), color: over ? 'var(--danger)' : 'var(--lcd-digit)' }}
          >
            {over ? 'Limit crossed' : 'Heading over'}
          </span>
        )}
      </div>

      <div className="mt-2 flex justify-center">
        <RingGauge
          used={stats.used}
          limit={stats.limit}
          projected={stats.projected}
          size={232}
          stroke={14}
          color={ringColor}
          track="var(--lcd-line)"
          limitColor="var(--lcd-text)"
          glow
          label={
            stats.limit !== null
              ? `${formatNumber(stats.used)} of the ${formatNumber(stats.limit)} ${unit} limit used`
              : `${formatNumber(stats.used)} ${unit} used`
          }
        >
          <span className={`${captionClass} text-lcd-dim`}>Used</span>
          <span className="lcd-digits text-[3.4rem] leading-none" style={over ? { color: 'var(--danger)' } : undefined}>
            {formatNumber(stats.used)}
          </span>
          <span className="mt-1 text-sm text-lcd-dim">
            {stats.limit !== null ? `of ${formatNumber(stats.limit)} ${unit}` : unit}
          </span>
        </RingGauge>
      </div>

      <div className="-mt-6 grid grid-cols-2 gap-3 text-center">
        <div>
          <p className={`${captionClass} text-lcd-dim`}>Per day</p>
          <p className="lcd-digits text-2xl">{stats.avgPerDay === null ? '--' : formatNumber(stats.avgPerDay)}</p>
        </div>
        <div>
          <p className={`${captionClass} text-lcd-dim`}>Heading for</p>
          <p className="lcd-digits text-2xl">{stats.projected === null ? '--' : formatNumber(stats.projected)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-lcd-line pt-4">
        <MeterDigits value={stats.latest} />
        <p className="text-xs text-lcd-dim">
          {stats.latestAt
            ? `Meter on ${formatDateTime(stats.latestAt)} · opening ${formatReading(cycle.opening_reading)} on ${formatShortDate(cycle.start_date)}`
            : `Opening reading from the bill, ${formatShortDate(cycle.start_date)}`}
        </p>
      </div>
    </div>
  )
}

/** Always-visible version of the limit popup. */
function LimitNotice({ stats, unit }: { stats: CycleStats; unit: string }) {
  if (stats.limit === null || (stats.status !== 'warn' && stats.status !== 'over')) return null
  const over = stats.status === 'over'
  return (
    <div className={`flex gap-3 rounded-2xl p-4 text-sm font-medium ${over ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'}`}>
      {over ? <Siren size={20} className="shrink-0" /> : <AlertTriangle size={20} className="shrink-0" />}
      <p>
        {over
          ? `Over the ${formatNumber(stats.limit)} ${unit} limit by ${formatNumber(stats.used - stats.limit)} ${unit}.`
          : `At this pace the month ends near ${formatNumber(stats.projected ?? stats.used)} ${unit}.${
              stats.allowedPerDay !== null ? ` Keep to ${formatNumber(stats.allowedPerDay)} a day to stay under ${formatNumber(stats.limit)}.` : ''
            }`}
      </p>
    </div>
  )
}

function StatsGrid({ stats, unit }: { stats: CycleStats; unit: string }) {
  // Today's day of the month (the start date is day 1), not the day of the last reading.
  const dayNumber = Math.min(stats.daysTotal, Math.max(1, stats.daysTotal - stats.daysLeft + 1))
  const monthShare = stats.daysTotal > 0 ? dayNumber / stats.daysTotal : 0
  const items: { icon: LucideIcon; label: string; value: string; note: string }[] = [
    { icon: CalendarDays, label: 'Day of month', value: `${dayNumber} / ${stats.daysTotal}`, note: `${stats.daysLeft} days to the bill` },
    stats.limit !== null
      ? {
          icon: Target,
          label: 'Allowed a day',
          value: stats.allowedPerDay === null ? '–' : formatNumber(stats.allowedPerDay),
          note: stats.used >= stats.limit ? 'limit crossed' : `${unit} to stay under`,
        }
      : { icon: TrendingUp, label: 'Per day', value: stats.avgPerDay === null ? '–' : formatNumber(stats.avgPerDay), note: unit },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ icon: Icon, label, value, note }, i) => (
        <div key={label} className={`${cardClass} min-w-0 p-4`}>
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary-text">
            <Icon size={16} />
          </span>
          <p className="mt-2.5 text-xs text-ink-3">{label}</p>
          <p className="truncate text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          <p className="truncate text-xs text-ink-3">{note}</p>
          {i === 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-2">
              <div className="h-full rounded-full bg-primary" style={{ width: `${monthShare * 100}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/** Newest first, as a timeline down to the opening reading from the bill. */
function ReadingList(props: { view: MeterView; onEdit: (r: Reading) => void; onEditOpening: () => void }) {
  const { view, onEdit, onEditOpening } = props
  const cycle = view.cycle!
  const rows = view.readings.map((r, i) => ({ r, diff: r.reading - (view.readings[i - 1]?.reading ?? cycle.opening_reading) })).reverse()
  const dot = 'absolute top-1/2 left-[1.15rem] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-card'

  return (
    <ul className="relative -mx-4">
      <span aria-hidden="true" className="absolute top-4 bottom-4 left-[1.15rem] w-px bg-line" />
      {rows.map(({ r, diff }, i) => (
        <li key={r.id} className="relative">
          <span aria-hidden="true" className={`${dot} ${i === 0 ? 'bg-primary' : 'bg-ink-3'}`} />
          <div
            role="button"
            tabIndex={0}
            aria-label={`Edit reading ${formatReading(r.reading)} of ${formatDateTime(r.taken_at)}`}
            onClick={() => onEdit(r)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onEdit(r)}
            className="flex cursor-pointer items-center gap-3 py-2.5 pr-4 pl-10 active:bg-card-2"
          >
            <div className="min-w-0 flex-1">
              <p className="font-lcd text-lg leading-tight tracking-wide tabular-nums">{formatReading(r.reading)}</p>
              <p className="truncate text-xs text-ink-3">
                {formatDateTime(r.taken_at)}
                {r.note && ` · ${r.note}`}
              </p>
            </div>
            {r.photo_path && <PhotoThumb path={r.photo_path} />}
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-sm font-semibold text-primary-text tabular-nums">
              +{formatNumber(diff)}
            </span>
          </div>
        </li>
      ))}
      <li className="relative">
        <span aria-hidden="true" className={`${dot} bg-card ring-0 outline-2 outline-ink-3`} />
        <button onClick={onEditOpening} className="flex w-full items-center gap-3 py-2.5 pr-4 pl-10 text-left active:bg-card-2">
          <div className="min-w-0 flex-1">
            <p className="font-lcd text-lg leading-tight tracking-wide text-ink-2 tabular-nums">{formatReading(cycle.opening_reading)}</p>
            <p className="text-xs text-ink-3">Opening from the bill · {formatDate(cycle.start_date)} · tap to correct</p>
          </div>
          <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-3">Start</span>
        </button>
      </li>
    </ul>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className={`${cardClass} p-4`}>
      <div className="mb-3">
        <h3 className="font-bold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-ink-3">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

