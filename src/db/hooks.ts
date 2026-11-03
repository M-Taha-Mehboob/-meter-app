import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { cycleStats, sortReadings, summarizeCycles, type CycleStats } from '../lib/cycle'
import { isAlive, type Category, type Cycle, type Meter, type MeterDB, type Reading } from './schema'

/** Non-deleted categories in display order. undefined while loading. */
export function useCategories(db: MeterDB) {
  return useLiveQuery(async () => (await db.meter_categories.orderBy('sort_order').toArray()).filter(isAlive), [db])
}

/** Non-deleted meters in display order. undefined while loading. */
export function useMeters(db: MeterDB) {
  return useLiveQuery(async () => (await db.meter_meters.orderBy('sort_order').toArray()).filter(isAlive), [db])
}

/** A meter's months, oldest first. */
async function getCycles(db: MeterDB, meterId: string): Promise<Cycle[]> {
  return db.meter_cycles
    .where('[meter_id+start_date]')
    .between([meterId, Dexie.minKey], [meterId, Dexie.maxKey])
    .filter(isAlive)
    .toArray()
}

export interface MeterView {
  meter: Meter
  category: Category | undefined
  /** The month in progress (the latest one started), or null before the first opening reading. */
  cycle: Cycle | null
  /** All months, oldest first. */
  cycles: Cycle[]
  /** Readings of the current month, oldest first. */
  readings: Reading[]
  stats: CycleStats | null
}

/** One meter with its current month, read once (e.g. to check the limit right after a save). */
export async function loadMeterView(db: MeterDB, meterId: string): Promise<MeterView | null> {
  const meter = await db.meter_meters.get(meterId)
  return meter && isAlive(meter) ? getMeterView(db, meter) : null
}

async function getMeterView(db: MeterDB, meter: Meter): Promise<MeterView> {
  const [category, cycles] = await Promise.all([db.meter_categories.get(meter.category_id), getCycles(db, meter.id)])
  const cycle = cycles.at(-1) ?? null
  const readings = cycle
    ? sortReadings(await db.meter_readings.where('cycle_id').equals(cycle.id).filter(isAlive).toArray())
    : []
  return {
    meter,
    category: category && isAlive(category) ? category : undefined,
    cycle,
    cycles,
    readings,
    stats: cycle ? cycleStats(cycle, readings, meter.alert_limit) : null,
  }
}

/** Every meter with its current month. undefined while loading. */
export function useMeterViews(db: MeterDB) {
  return useLiveQuery(async () => {
    const meters = (await db.meter_meters.orderBy('sort_order').toArray()).filter(isAlive)
    return Promise.all(meters.map((m) => getMeterView(db, m)))
  }, [db])
}

/** One meter with its current month. undefined while loading, null when it doesn't exist. */
export function useMeterView(db: MeterDB, meterId: string | undefined) {
  return useLiveQuery(async () => (meterId ? loadMeterView(db, meterId) : null), [db, meterId])
}

/** One line per month of a meter, newest first. undefined while loading. */
export function useCycleHistory(db: MeterDB, meterId: string | undefined) {
  return useLiveQuery(async () => {
    if (!meterId) return []
    const cycles = await getCycles(db, meterId)
    const readings = await db.meter_readings.where('meter_id').equals(meterId).filter(isAlive).toArray()
    const byCycle = new Map<string, Reading[]>()
    for (const r of readings) byCycle.set(r.cycle_id, [...(byCycle.get(r.cycle_id) ?? []), r])
    return summarizeCycles(cycles, byCycle)
  }, [db, meterId])
}
