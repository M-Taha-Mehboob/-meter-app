import { AlertTriangle, Siren } from 'lucide-react'
import type { CycleStats } from '../lib/cycle'
import { formatNumber } from '../lib/format'
import Modal from './Modal'
import { buttonPrimary } from './styles'

/** Popup after a reading when the month has crossed the limit or is heading past it. */
export default function AlertSheet({ meterName, unit, stats, onClose }: { meterName: string; unit: string; stats: CycleStats; onClose: () => void }) {
  const { used, limit, projected, allowedPerDay, avgPerDay, daysLeft, status } = stats
  if (limit === null || (status !== 'warn' && status !== 'over')) return null
  const over = status === 'over'
  const u = (n: number) => `${formatNumber(n)} ${unit}`

  return (
    <Modal title={over ? 'Limit crossed' : 'Heading over your limit'} onClose={onClose}>
      <div className="space-y-4">
        <div className={`flex gap-3 rounded-2xl p-4 ${over ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'}`}>
          {over ? <Siren size={22} className="shrink-0" /> : <AlertTriangle size={22} className="shrink-0" />}
          <p className="text-sm font-medium">
            {over
              ? `${meterName} has used ${u(used)} this month, past your limit of ${u(limit)} by ${u(used - limit)}.`
              : `${meterName} has used ${u(used)} so far. At this pace the month ends near ${u(projected ?? used)}, over your limit of ${u(limit)}.`}
          </p>
        </div>
        {!over && allowedPerDay !== null && (
          <p className="text-sm text-ink-2">
            To stay under {u(limit)}, keep to about <span className="font-bold text-ink">{u(allowedPerDay)} a day</span> for the
            remaining {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
            {avgPerDay !== null && ` (now ${u(avgPerDay)} a day)`}.
          </p>
        )}
        <button onClick={onClose} className={`w-full ${buttonPrimary}`}>
          OK
        </button>
      </div>
    </Modal>
  )
}
