const numberFormat = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 })
const readingFormat = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 3, useGrouping: false })

export const round2 = (n: number) => Math.round(n * 100) / 100
export const round1 = (n: number) => Math.round(n * 10) / 10

/** 1234.5 -> "1,234.5" */
export const formatNumber = (n: number) => (Number.isFinite(n) ? numberFormat.format(n) : '0')

/** Meter readings are shown like the meter itself: no thousands separators. 12586 -> "12586" */
export const formatReading = (n: number) => readingFormat.format(n)

/** 136 -> "136 units" */
export const formatUnits = (n: number, unit: string) => `${formatNumber(n)} ${unit}`

/** Parse a typed number ("12,586", "1500.5"). Returns null for empty or invalid input. */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, '').trim()
  if (cleaned === '') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** A Date as a local YYYY-MM-DD. */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Today's local date as YYYY-MM-DD. */
export const todayISO = () => toISODate(new Date())

/** Local midnight of a YYYY-MM-DD date. */
export function dateAt(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = dateAt(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

const DAY_MS = 86_400_000

/** Whole calendar days from a to b (b - a). Rounded, so daylight-saving shifts don't matter. */
export const daysBetween = (a: string, b: string) => Math.round((dateAt(b).getTime() - dateAt(a).getTime()) / DAY_MS)

/** Fractional days between two instants. */
export const daysSpan = (from: Date, to: Date) => (to.getTime() - from.getTime()) / DAY_MS

/** "2026-10-19" -> "19 Oct 2026" */
export const formatDate = (iso: string) =>
  dateAt(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** "2026-10-19" -> "19 Oct" */
export const formatShortDate = (iso: string) => dateAt(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** ISO timestamp -> "2 Nov, 9:10 pm" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
  return `${date}, ${time}`
}

/** ISO timestamp -> value for <input type="datetime-local"> (local time, minutes). */
export function toDateTimeInput(iso: string): string {
  const d = new Date(iso)
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value -> ISO timestamp. Null when empty or invalid. */
export function fromDateTimeInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** "2026-10-15" -> "Oct 2026": the month a cycle is named after (the month it starts in). */
export const cycleLabel = (startDate: string) =>
  dateAt(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
