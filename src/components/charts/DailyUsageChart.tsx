import { Bar, CartesianGrid, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayUsage } from '../../lib/cycle'
import { dateAt, formatNumber, formatShortDate } from '../../lib/format'
import { LegendItem, TooltipCard } from './ChartParts'
import { axisTick, chartColors, niceTicks } from './theme'

type Props = {
  days: DayUsage[]
  unit: string
  /** Units a day that keep the month at the limit (limit / days in the month); null without a limit. */
  dailyLimit: number | null
}

/** Units per day of the current month. Days without their own reading are drawn lighter. */
export default function DailyUsageChart({ days, unit, dailyLimit }: Props) {
  const data = days.map((d) => ({ ...d, label: String(dateAt(d.date).getDate()) }))
  const top = Math.max(0, dailyLimit ?? 0, ...days.map((d) => d.units ?? 0))
  const ticks = niceTicks(top)
  const anyEstimated = days.some((d) => d.estimated && d.units !== null)

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        <LegendItem color={chartColors.usage} label="Reading that day" />
        {anyEstimated && <LegendItem color={chartColors.estimate} label="Spread from a longer gap" />}
        {dailyLimit !== null && <LegendItem color={chartColors.limit} label="Daily share of limit" shape="line" />}
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis
              dataKey="label"
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: chartColors.axis }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[0, ticks[ticks.length - 1]]}
              ticks={ticks}
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Tooltip
              cursor={{ fill: chartColors.cursor }}
              content={({ active, payload }) => {
                const d = active ? (payload?.[0]?.payload as DayUsage | undefined) : undefined
                if (!d) return null
                return (
                  <TooltipCard
                    title={formatShortDate(d.date)}
                    rows={[
                      { label: d.units === null ? 'No reading yet' : d.estimated ? 'About' : 'Used', value: d.units === null ? '' : `${formatNumber(d.units)} ${unit}` },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="units" barSize={10} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.date} fill={d.estimated ? chartColors.estimate : chartColors.usage} />
              ))}
            </Bar>
            {dailyLimit !== null && (
              <ReferenceLine y={dailyLimit} stroke={chartColors.limit} strokeWidth={2} strokeDasharray="5 4" ifOverflow="extendDomain" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
