import type { ReactNode } from 'react'

/** Legend entry: a coloured key beside text in normal ink (text never takes the series colour). */
export function LegendItem({ color, label, shape = 'square' }: { color: string; label: string; shape?: 'square' | 'line' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
      {shape === 'square' ? (
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      ) : (
        <span className="h-0.5 w-4 rounded" style={{ background: color }} />
      )}
      {label}
    </span>
  )
}

/** Tooltip card shared by the charts. */
export function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: ReactNode; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-semibold text-ink tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  )
}
