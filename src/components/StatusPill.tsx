import type { UsageStatus } from '../lib/cycle'

const PILLS: Record<Exclude<UsageStatus, 'none'>, { label: string; tone: string }> = {
  ok: { label: 'On track', tone: 'bg-ok-soft text-ok' },
  warn: { label: 'Heading over', tone: 'bg-warn-soft text-warn' },
  over: { label: 'Limit crossed', tone: 'bg-danger-soft text-danger' },
}

/** Limit status as text, never colour alone. Nothing when the meter has no limit. */
export default function StatusPill({ status }: { status: UsageStatus }) {
  if (status === 'none') return null
  const { label, tone } = PILLS[status]
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
}
