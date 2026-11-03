import Dexie, { type EntityTable } from 'dexie'

/** Columns every synced table has (mirror of supabase/migrations/001_meter_init.sql). */
export interface SyncFields {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  /** 1 = changed locally and not yet pushed to Supabase. */
  _dirty: 0 | 1
}

export type CategoryIcon = 'zap' | 'flame' | 'droplet' | 'gauge'

export interface Category extends SyncFields {
  name: string
  icon: CategoryIcon
  /** Shown after numbers, e.g. "units", "m³". */
  unit: string
  sort_order: number
}

export interface Meter extends SyncFields {
  category_id: string
  name: string
  /** Alert when the month's units reach this; null = no alert. */
  alert_limit: number | null
  sort_order: number
  is_active: boolean
}

export interface Cycle extends SyncFields {
  meter_id: string
  /** Local dates, YYYY-MM-DD. end_date = expected next bill reading date. */
  start_date: string
  end_date: string
  opening_reading: number
}

export interface Reading extends SyncFields {
  meter_id: string
  cycle_id: string
  reading: number
  /** ISO timestamp. */
  taken_at: string
  note: string | null
  /** Path in the meter-photos bucket, or null. */
  photo_path: string | null
}

/**
 * Photo files (not a synced table). "upload" = taken on this device, not uploaded yet;
 * "done" = same as the server copy (blob cached for offline viewing); "delete" = remove from server.
 */
export interface PhotoFile {
  path: string
  blob: Blob | null
  state: 'upload' | 'done' | 'delete'
}

export type MeterDB = Dexie & {
  meter_categories: EntityTable<Category, 'id'>
  meter_meters: EntityTable<Meter, 'id'>
  meter_cycles: EntityTable<Cycle, 'id'>
  meter_readings: EntityTable<Reading, 'id'>
  photos: EntityTable<PhotoFile, 'path'>
}

/** One IndexedDB database per user, so family members on a shared device never mix data. */
export function openMeterDB(userId: string): MeterDB {
  const db = new Dexie(`my-meters-${userId}`) as MeterDB
  db.version(1).stores({
    meter_categories: 'id, sort_order, updated_at, _dirty',
    meter_meters: 'id, category_id, sort_order, updated_at, _dirty',
    meter_cycles: 'id, meter_id, [meter_id+start_date], updated_at, _dirty',
    meter_readings: 'id, meter_id, cycle_id, updated_at, _dirty',
    photos: 'path, state',
  })
  return db
}

export const isAlive = (row: SyncFields) => row.deleted_at === null
