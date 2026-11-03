import { isAlive, type Category, type Cycle, type Meter, type MeterDB, type Reading, type SyncFields } from './schema'

// All writes go through here so updated_at / _dirty / soft delete stay consistent for sync.

const nowISO = () => new Date().toISOString()

function newRow(userId: string): SyncFields {
  const t = nowISO()
  return { id: crypto.randomUUID(), user_id: userId, created_at: t, updated_at: t, deleted_at: null, _dirty: 1 }
}

type TableName = 'meter_categories' | 'meter_meters' | 'meter_cycles' | 'meter_readings'

// Untyped on purpose (Dexie's generics don't compose here); the exported wrappers below are typed.
async function touch(db: MeterDB, table: TableName, id: string, changes: Record<string, unknown>) {
  await db.table(table).update(id, { ...changes, updated_at: nowISO(), _dirty: 1 })
}

const softDelete = (db: MeterDB, table: TableName, id: string) => touch(db, table, id, { deleted_at: nowISO() })

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

type CategoryData = Pick<Category, 'name' | 'icon' | 'unit'>

const DEFAULT_CATEGORIES: CategoryData[] = [
  { name: 'Bijli', icon: 'zap', unit: 'units' },
  { name: 'Gas', icon: 'flame', unit: 'm³' },
  { name: 'Pani', icon: 'droplet', unit: 'gallons' },
]

/** Adds Bijli, Gas and Pani, skipping any name the user already has. */
export async function addDefaultCategories(db: MeterDB, userId: string) {
  await db.transaction('rw', db.meter_categories, async () => {
    const existing = (await db.meter_categories.toArray()).filter(isAlive)
    const names = new Set(existing.map((c) => c.name.toLowerCase()))
    let sort = Math.max(0, ...existing.map((c) => c.sort_order))
    for (const c of DEFAULT_CATEGORIES) {
      if (!names.has(c.name.toLowerCase())) await db.meter_categories.add({ ...newRow(userId), ...c, sort_order: ++sort })
    }
  })
}

/** Returns the new category's id. */
export async function addCategory(db: MeterDB, userId: string, data: CategoryData) {
  const last = await db.meter_categories.orderBy('sort_order').last()
  const row = { ...newRow(userId), ...data, sort_order: (last?.sort_order ?? 0) + 1 }
  await db.meter_categories.add(row)
  return row.id
}

export const updateCategory = (db: MeterDB, id: string, changes: Partial<CategoryData>) =>
  touch(db, 'meter_categories', id, changes)

export class CategoryInUseError extends Error {}

/** Categories that still hold meters can't be deleted. */
export async function deleteCategory(db: MeterDB, id: string) {
  const used = await db.meter_meters.where('category_id').equals(id).filter(isAlive).count()
  if (used > 0) throw new CategoryInUseError()
  await softDelete(db, 'meter_categories', id)
}

// ---------------------------------------------------------------------------
// Meters
// ---------------------------------------------------------------------------

type MeterData = Pick<Meter, 'category_id' | 'name' | 'alert_limit' | 'is_active'>

/** Returns the new meter's id. */
export async function addMeter(db: MeterDB, userId: string, data: MeterData) {
  const last = await db.meter_meters.orderBy('sort_order').last()
  const row = { ...newRow(userId), ...data, sort_order: (last?.sort_order ?? 0) + 1 }
  await db.meter_meters.add(row)
  return row.id
}

export const updateMeter = (db: MeterDB, id: string, changes: Partial<MeterData>) => touch(db, 'meter_meters', id, changes)

/** Removes the meter with all its months and readings. */
export async function deleteMeter(db: MeterDB, id: string) {
  await db.transaction('rw', [db.meter_meters, db.meter_cycles, db.meter_readings, db.photos], async () => {
    const readings = await db.meter_readings.where('meter_id').equals(id).filter(isAlive).toArray()
    for (const r of readings) await removeReading(db, r)
    const cycles = await db.meter_cycles.where('meter_id').equals(id).filter(isAlive).toArray()
    for (const c of cycles) await softDelete(db, 'meter_cycles', c.id)
    await softDelete(db, 'meter_meters', id)
  })
}

// ---------------------------------------------------------------------------
// Cycles (billing months)
// ---------------------------------------------------------------------------

type CycleData = Pick<Cycle, 'start_date' | 'end_date' | 'opening_reading'>

/** Starts a month. Readings noted on or after its start date (before the bill came) move into it. */
export async function startCycle(db: MeterDB, userId: string, meterId: string, data: CycleData, moveReadingIds: string[] = []) {
  const row = { ...newRow(userId), meter_id: meterId, ...data }
  await db.transaction('rw', [db.meter_cycles, db.meter_readings], async () => {
    await db.meter_cycles.add(row)
    for (const id of moveReadingIds) await touch(db, 'meter_readings', id, { cycle_id: row.id })
  })
  return row.id
}

export const updateCycle = (db: MeterDB, id: string, changes: CycleData) => touch(db, 'meter_cycles', id, changes)

/** Removes the month and its readings. */
export async function deleteCycle(db: MeterDB, id: string) {
  await db.transaction('rw', [db.meter_cycles, db.meter_readings, db.photos], async () => {
    const readings = await db.meter_readings.where('cycle_id').equals(id).filter(isAlive).toArray()
    for (const r of readings) await removeReading(db, r)
    await softDelete(db, 'meter_cycles', id)
  })
}

// ---------------------------------------------------------------------------
// Readings and their photos
// ---------------------------------------------------------------------------

type ReadingData = Pick<Reading, 'reading' | 'taken_at' | 'note'>

/** A fresh file name for every photo, so a replaced photo never shows a stale cached copy. */
const photoPath = (userId: string, readingId: string) => `${userId}/${readingId}-${crypto.randomUUID().slice(0, 8)}.jpg`

async function queuePhotoUpload(db: MeterDB, path: string, blob: Blob) {
  await db.photos.put({ path, blob, state: 'upload' })
}

/** A photo never uploaded is just dropped; an uploaded one is queued for removal from the server. */
async function queuePhotoDelete(db: MeterDB, path: string) {
  const local = await db.photos.get(path)
  if (local?.state === 'upload') await db.photos.delete(path)
  else await db.photos.put({ path, blob: null, state: 'delete' })
}

export async function addReading(
  db: MeterDB,
  userId: string,
  target: { meter_id: string; cycle_id: string },
  data: ReadingData,
  photo: Blob | null,
) {
  await db.transaction('rw', db.meter_readings, db.photos, async () => {
    const row = { ...newRow(userId), ...target, ...data, photo_path: null as string | null }
    if (photo) {
      row.photo_path = photoPath(userId, row.id)
      await queuePhotoUpload(db, row.photo_path, photo)
    }
    await db.meter_readings.add(row)
  })
}

/** photo: undefined = keep, null = remove, Blob = replace. */
export async function updateReading(db: MeterDB, reading: Reading, data: ReadingData, photo: Blob | null | undefined) {
  await db.transaction('rw', db.meter_readings, db.photos, async () => {
    let photo_path = reading.photo_path
    if (photo !== undefined) {
      if (reading.photo_path) await queuePhotoDelete(db, reading.photo_path)
      photo_path = null
      if (photo) {
        photo_path = photoPath(reading.user_id, reading.id)
        await queuePhotoUpload(db, photo_path, photo)
      }
    }
    await touch(db, 'meter_readings', reading.id, { ...data, photo_path })
  })
}

async function removeReading(db: MeterDB, reading: Reading) {
  if (reading.photo_path) await queuePhotoDelete(db, reading.photo_path)
  await softDelete(db, 'meter_readings', reading.id)
}

export async function deleteReading(db: MeterDB, reading: Reading) {
  await db.transaction('rw', db.meter_readings, db.photos, () => removeReading(db, reading))
}
