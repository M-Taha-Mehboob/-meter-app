// Chart colours come from CSS variables in src/index.css, so they follow light/dark mode.
// Same validated palette as My Expenses: blue = units used, its lighter step = spread-out
// (estimated) days, orange = the alert limit, red = over the limit.

export const chartColors = {
  usage: 'var(--chart-usage)',
  estimate: 'var(--chart-estimate)',
  limit: 'var(--chart-limit)',
  over: 'var(--chart-over)',
  track: 'var(--chart-track)',
  surface: 'var(--card)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tick: 'var(--chart-tick)',
  cursor: 'var(--chart-cursor)',
}

export const axisTick = { fill: chartColors.tick, fontSize: 12 }

/** Round axis ticks from 0 (e.g. 0 / 5 / 10 / 15) instead of Recharts' odd steps. */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((s) => s * magnitude).find((s) => s >= raw)!
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 1000) / 1000)
}
