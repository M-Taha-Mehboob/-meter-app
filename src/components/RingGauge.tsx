import type { ReactNode } from 'react'

type Props = {
  used: number
  limit: number | null
  /** Where the month is heading; drawn as a faint arc ahead of the used part. */
  projected: number | null
  size: number
  stroke: number
  /** Colour of the used arc. */
  color: string
  /** Colour of the empty track. */
  track: string
  /** Colour of the limit tick. */
  limitColor: string
  glow?: boolean
  /** Shown in the middle of the dial. */
  children?: ReactNode
  label: string
}

const SWEEP = 0.75 // a 270 degree dial, open at the bottom like a meter
const START_DEG = 135

/** A meter dial: units used against the limit, the month's estimate as a faint arc, the limit as a tick. */
export default function RingGauge({ used, limit, projected, size, stroke, color, track, limitColor, glow = false, children, label }: Props) {
  const scale = Math.max(limit ?? 0, projected ?? 0, used, 1)
  const r = (size - stroke) / 2 - (limit !== null ? 4 : 0)
  const c = 2 * Math.PI * r
  const arc = c * SWEEP
  const center = size / 2
  const dash = (fraction: number) => `${Math.max(0, Math.min(1, fraction)) * arc} ${c}`
  const usedFraction = used / scale
  const projectedFraction = projected !== null ? projected / scale : 0

  let tick: { x1: number; y1: number; x2: number; y2: number } | null = null
  if (limit !== null) {
    const angle = ((START_DEG + (limit / scale) * 360 * SWEEP) * Math.PI) / 180
    const inner = r - stroke / 2 - 2
    const outer = r + stroke / 2 + 4
    tick = {
      x1: center + Math.cos(angle) * inner,
      y1: center + Math.sin(angle) * inner,
      x2: center + Math.cos(angle) * outer,
      y2: center + Math.sin(angle) * outer,
    }
  }

  const ring = { cx: center, cy: center, r, fill: 'none', strokeWidth: stroke, strokeLinecap: 'round' as const, transform: `rotate(${START_DEG} ${center} ${center})` }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="overflow-visible">
        <circle {...ring} stroke={track} strokeDasharray={dash(1)} />
        {projectedFraction > usedFraction && (
          <circle {...ring} stroke={color} strokeOpacity={0.28} strokeDasharray={dash(projectedFraction)} />
        )}
        <circle
          {...ring}
          className="gauge-arc"
          stroke={color}
          strokeDasharray={dash(usedFraction)}
          style={glow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
        />
        {tick && <line {...tick} stroke={limitColor} strokeWidth={3} strokeLinecap="round" />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
