import type { Cycle, Reading } from '../db/schema'
import { addDays, dateAt, daysBetween, daysSpan, round1, round2, toISODate } from './format'

// Pure calculations for one billing cycle. Nothing here is stored: it is all derived from the
// opening reading and the readings noted since.

export type UsageStatus = 'none' | 'ok' | 'warn' | 'over'

export interface CycleStats {
  opening: number
  /** Last noted reading, or the opening reading when none yet. */
  latest: number
  latestAt: string | null
  used: number
  /** Length of the cycle, start to expected bill date. */
  daysTotal: number
  /** From the start of the cycle to the last reading (fractional). */
  daysElapsed: number
  /** Whole days from today to the expected bill date (0 once it has passed). */
  daysLeft: number
  /** null until there is about a day of readings to average. */
  avgPerDay: number | null
  /** Units expected by the bill date at the current pace. */
  projected: number | null
  limit: number | null
  /** none = no limit set; warn = on pace to cross the limit; over = already crossed. */
  status: UsageStatus
  /** Units a day that still keep the month under the limit. null without a limit or days left. */
  allowedPerDay: number | null
}

const MIN_DAYS_FOR_AVERAGE = 0.5

/** Readings of one cycle, oldest first. */
export const sortReadings = (readings: Reading[]) =>
  [...readings].sort((a, b) => a.taken_at.localeCompare(b.taken_at))

export function cycleStats(cycle: Cycle, readings: Reading[], limit: number | null, now = new Date()): CycleStats {
  const sorted = sortReadings(readings)
  const last = sorted.at(-1)
  const latest = last?.reading ?? cycle.opening_reading
  const used = round2(Math.max(0, latest - cycle.opening_reading))
  const start = dateAt(cycle.start_date)
  const end = dateAt(cycle.end_date)
  const daysTotal = daysBetween(cycle.start_date, cycle.end_date)
  const daysElapsed = last ? Math.max(0, daysSpan(start, new Date(last.taken_at))) : 0
  const daysLeft = Math.max(0, daysBetween(toISODate(now), cycle.end_date))

  // Shown rounded (per day to 0.1, the estimate to whole units); the estimate uses the exact pace.
  const pace = last && daysElapsed >= MIN_DAYS_FOR_AVERAGE ? used / daysElapsed : null
  const avgPerDay = pace === null ? null : round1(pace)
  const projected = pace === null || !last ? null : Math.round(used + pace * Math.max(0, daysSpan(new Date(last.taken_at), end)))

  let status: UsageStatus = 'none'
  if (limit !== null) {
    if (used >= limit) status = 'over'
    else if (projected !== null && projected > limit) status = 'warn'
    else status = 'ok'
  }
  const allowedPerDay = limit !== null && daysLeft > 0 && used < limit ? round1((limit - used) / daysLeft) : null

  return {
    opening: cycle.opening_reading,
    latest,
    latestAt: last?.taken_at ?? null,
    used,
    daysTotal,
    daysElapsed,
    daysLeft,
    avgPerDay,
    projected,
    limit,
    status,
    allowedPerDay,
  }
}

export interface DayUsage {
  /** YYYY-MM-DD */
  date: string
  /** null = after the last reading (no data yet). */
  units: number | null
  /** true when no reading was noted that day, so its share was spread from a longer gap. */
  estimated: boolean
}

/**
 * Units per calendar day of the cycle. Readings are noted irregularly, so the units between two
 * readings are spread evenly over the time between them.
 */
export function dailyUsage(cycle: Cycle, readings: Reading[], now = new Date()): DayUsage[] {
  const sorted = sortReadings(readings)
  const points = [
    { t: dateAt(cycle.start_date).getTime(), v: cycle.opening_reading },
    ...sorted.map((r) => ({ t: new Date(r.taken_at).getTime(), v: r.reading })),
  ]
  const lastT = points.at(-1)!.t
  const readingDays = new Set(sorted.map((r) => toISODate(new Date(r.taken_at))))
  const lastDay = toISODate(now) < cycle.end_date ? toISODate(now) : addDays(cycle.end_date, -1)
  const days: DayUsage[] = []

  for (let date = cycle.start_date; date <= lastDay; date = addDays(date, 1)) {
    const dayStart = dateAt(date).getTime()
    const dayEnd = dateAt(addDays(date, 1)).getTime()
    if (dayStart >= lastT) {
      days.push({ date, units: null, estimated: false })
      continue
    }
    let units = 0
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]
      const b = points[i]
      if (b.t <= a.t) continue
      const overlap = Math.min(b.t, dayEnd) - Math.max(a.t, dayStart)
      if (overlap > 0) units += ((b.v - a.v) * overlap) / (b.t - a.t)
    }
    days.push({ date, units: round2(Math.max(0, units)), estimated: !readingDays.has(date) })
  }
  return days
}

export interface CycleSummary {
  cycle: Cycle
  used: number
  days: number
  avgPerDay: number | null
  /** true while this is the meter's current cycle (units still growing). */
  current: boolean
  /** Difference in units from the previous cycle; null for the first. */
  change: number | null
}

/**
 * One line per cycle, newest first. A finished cycle's units are the next opening reading minus its
 * own (the same number the bill shows); the current cycle uses its last reading.
 */
export function summarizeCycles(cycles: Cycle[], readingsByCycle: Map<string, Reading[]>, now = new Date()): CycleSummary[] {
  const ordered = [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const result: CycleSummary[] = []
  for (const [i, cycle] of ordered.entries()) {
    const next = ordered[i + 1]
    const readings = readingsByCycle.get(cycle.id) ?? []
    let used: number
    let days: number
    if (next) {
      used = round2(Math.max(0, next.opening_reading - cycle.opening_reading))
      days = daysBetween(cycle.start_date, next.start_date)
    } else {
      const stats = cycleStats(cycle, readings, null, now)
      used = stats.used
      days = Math.min(stats.daysTotal, Math.max(0, stats.daysElapsed))
    }
    const prev = result.at(-1)
    result.push({
      cycle,
      used,
      days: round2(days),
      avgPerDay: days >= MIN_DAYS_FOR_AVERAGE ? round1(used / days) : null,
      current: !next,
      change: prev ? round2(used - prev.used) : null,
    })
  }
  return result.reverse()
}
