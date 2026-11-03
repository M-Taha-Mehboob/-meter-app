import { Bar, CartesianGrid, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CycleSummary } from '../../lib/cycle'
import { cycleLabel, formatNumber } from '../../lib/format'
import { LegendItem, TooltipCard } from './ChartParts'
import { axisTick, chartColors, niceTicks } from './theme'

const MAX_BARS = 12

/** Units per month (oldest left), the month in progress lighter, the alert limit as a line. */
export default function CycleHistoryChart({ summaries, unit, limit }: { summaries: CycleSummary[]; unit: string; limit: number | null }) {
  const data = summaries
    .slice(0, MAX_BARS)
    .reverse()
    .map((s) => ({ ...s, label: cycleLabel(s.cycle.start_date).slice(0, 3) }))
  const ticks = niceTicks(Math.max(limit ?? 0, ...data.map((d) => d.used)))

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        <LegendItem color={chartColors.usage} label="Units" />
        {data.some((d) => d.current) && <LegendItem color={chartColors.estimate} label="This month so far" />}
        {limit !== null && <LegendItem color={chartColors.limit} label="Alert limit" shape="line" />}
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: chartColors.axis }} interval={0} />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={48}
              domain={[0, ticks[ticks.length - 1]]}
              ticks={ticks}
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Tooltip
              cursor={{ fill: chartColors.cursor }}
              content={({ active, payload }) => {
                const s = active ? (payload?.[0]?.payload as CycleSummary | undefined) : undefined
                if (!s) return null
                return (
                  <TooltipCard
                    title={cycleLabel(s.cycle.start_date)}
                    rows={[
                      { label: s.current ? 'So far' : 'Used', value: `${formatNumber(s.used)} ${unit}` },
                      { label: 'Per day', value: s.avgPerDay === null ? '–' : formatNumber(s.avgPerDay) },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="used" barSize={18} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.cycle.id} fill={d.current ? chartColors.estimate : chartColors.usage} />
              ))}
            </Bar>
            {limit !== null && <ReferenceLine y={limit} stroke={chartColors.limit} strokeWidth={2} ifOverflow="extendDomain" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
