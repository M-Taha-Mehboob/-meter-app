import { ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useDb } from '../auth/context'
import CycleHistoryChart from '../components/charts/CycleHistoryChart'
import { cardClass } from '../components/styles'
import { useCategories, useCycleHistory, useMeters } from '../db/hooks'
import type { CycleSummary } from '../lib/cycle'
import { cycleLabel, formatNumber, formatShortDate } from '../lib/format'

export default function SummaryPage() {
  const { db } = useDb()
  const meters = useMeters(db)
  const categories = useCategories(db)
  const [params, setParams] = useSearchParams()
  const ordered = meters ? [...meters].sort((a, b) => Number(b.is_active) - Number(a.is_active)) : []
  const selected = ordered.find((m) => m.id === params.get('meter')) ?? ordered[0]
  const history = useCycleHistory(db, selected?.id)

  if (meters === undefined || categories === undefined) return <p className="text-ink-3">Loading…</p>
  if (!selected) {
    return (
      <div className={`${cardClass} mt-4 flex flex-col items-center gap-2 p-8 text-center`}>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary-text">
          <BarChart3 size={22} />
        </span>
        <p className="font-semibold">No meters yet</p>
        <p className="text-sm text-ink-3">Add a meter on the Home screen and its months show up here.</p>
      </div>
    )
  }

  const unit = categories.find((c) => c.id === selected.category_id)?.unit ?? 'units'
  const finished = (history ?? []).filter((s) => !s.current)
  const average = finished.length ? finished.reduce((s, c) => s + c.used, 0) / finished.length : null
  const highest = finished.length ? finished.reduce((a, b) => (b.used > a.used ? b : a)) : null

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Monthly summary</h2>

      {ordered.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {ordered.map((m) => (
            <button
              key={m.id}
              onClick={() => setParams({ meter: m.id }, { replace: true })}
              aria-pressed={m.id === selected.id}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                m.id === selected.id ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-card text-ink-2'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {history === undefined ? (
        <p className="text-ink-3">Loading…</p>
      ) : history.length === 0 ? (
        <div className={`${cardClass} p-5 text-sm text-ink-3`}>
          No months for {selected.name} yet.{' '}
          <Link to={`/meter/${selected.id}`} className="font-semibold text-primary-text">
            Enter the opening reading
          </Link>
        </div>
      ) : (
        <>
          <div className={`${cardClass} p-4`}>
            <h3 className="mb-3 font-bold tracking-tight">{selected.name}: month by month</h3>
            <CycleHistoryChart summaries={history} unit={unit} limit={selected.alert_limit} />
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
              <Figure label="Months" value={String(history.length)} />
              <Figure label="Average month" value={average === null ? '–' : formatNumber(Math.round(average))} />
              <Figure label="Highest" value={highest ? `${formatNumber(highest.used)}` : '–'} note={highest ? cycleLabel(highest.cycle.start_date) : undefined} />
            </div>
          </div>

          <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
            {history.map((s) => (
              <MonthRow key={s.cycle.id} summary={s} unit={unit} limit={selected.alert_limit} />
            ))}
          </ul>
          <p className="px-1 text-xs text-ink-3">
            A finished month counts from its opening to the next month’s opening, the same units the bill shows.
          </p>
        </>
      )}
    </section>
  )
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="truncate text-sm font-bold tabular-nums">{value}</p>
      {note && <p className="truncate text-[11px] text-ink-3">{note}</p>}
    </div>
  )
}

function MonthRow({ summary, unit, limit }: { summary: CycleSummary; unit: string; limit: number | null }) {
  const { cycle, used, days, avgPerDay, current, change } = summary
  const overLimit = limit !== null && used > limit
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          {cycleLabel(cycle.start_date)}
          {current && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-text">So far</span>}
          {overLimit && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">Over limit</span>}
        </p>
        <p className="text-xs text-ink-3 tabular-nums">
          {formatShortDate(cycle.start_date)} · {Math.round(days)} days · {avgPerDay === null ? '–' : formatNumber(avgPerDay)} a day
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold tabular-nums">
          {formatNumber(used)} <span className="text-xs font-medium text-ink-3">{unit}</span>
        </p>
        {change !== null && !current && change !== 0 && (
          <p className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${change > 0 ? 'text-warn' : 'text-ok'}`}>
            {change > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {formatNumber(Math.abs(change))} {change > 0 ? 'more' : 'less'}
          </p>
        )}
      </div>
    </li>
  )
}
