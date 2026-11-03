import { useState } from 'react'
import { useDb } from '../auth/context'
import { loadMeterView, type MeterView } from '../db/hooks'
import type { Reading } from '../db/schema'
import type { CycleStats } from '../lib/cycle'
import AlertSheet from './AlertSheet'
import ReadingForm from './ReadingForm'

/**
 * The reading form, followed by the limit popup when the saved reading puts the month over (or on
 * pace for) the limit. Correcting an old reading only pops up when it changed the month's status.
 */
export default function ReadingFlow({ view, reading, onClose }: { view: MeterView; reading?: Reading; onClose: () => void }) {
  const { db } = useDb()
  const [alert, setAlert] = useState<CycleStats | null>(null)
  const unit = view.category?.unit ?? 'units'
  if (!view.cycle) return null

  async function onSaved() {
    const fresh = await loadMeterView(db, view.meter.id)
    const stats = fresh?.stats
    const alarming = stats && (stats.status === 'warn' || stats.status === 'over')
    const changed = !reading || stats?.status !== view.stats?.status
    if (stats && alarming && changed) setAlert(stats)
    else onClose()
  }

  if (alert) return <AlertSheet meterName={view.meter.name} unit={unit} stats={alert} onClose={onClose} />
  return (
    <ReadingForm
      meterName={view.meter.name}
      unit={unit}
      cycle={view.cycle}
      readings={view.readings}
      reading={reading}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
