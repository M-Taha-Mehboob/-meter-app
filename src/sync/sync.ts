import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeterDB, SyncFields } from '../db/schema'
import { PHOTO_BUCKET } from '../lib/photo'

// Offline-first sync between the device's Dexie DB and Supabase (same design as My Expenses).
//
// photos: upload new photo files first, so a reading never reaches another device before its photo.
// push: upsert every local row with _dirty = 1 (parents first, for the foreign keys / RLS checks),
//       then mark it clean, unless it was edited again while the request was in flight.
// photos: remove files of deleted or replaced photos from Storage.
// pull: fetch rows changed on the server since the last pull, keyset-paged on (updated_at, id).
//       Rows that still have unpushed local edits are skipped; the local edit wins and goes up next push.
// Nothing is ever hard-deleted; deletions travel as deleted_at.

export const SYNC_TABLES = ['meter_categories', 'meter_meters', 'meter_cycles', 'meter_readings'] as const
type SyncTable = (typeof SYNC_TABLES)[number]

const PUSH_BATCH = 500
const PULL_PAGE = 1000
/** Postgres numeric arrives as a string; nullable ones stay null. */
const NUMERIC_COLUMNS = ['alert_limit', 'opening_reading', 'reading']

type Cursor = { ts: string; id: string }

const cursorKey = (userId: string, table: SyncTable) => `my-meters:${userId}:pulled:${table}`

function readCursor(userId: string, table: SyncTable): Cursor | null {
  try {
    const raw = localStorage.getItem(cursorKey(userId, table))
    return raw ? (JSON.parse(raw) as Cursor) : null
  } catch {
    return null
  }
}

function writeCursor(userId: string, table: SyncTable, cursor: Cursor) {
  localStorage.setItem(cursorKey(userId, table), JSON.stringify(cursor))
}

export async function countPending(db: MeterDB): Promise<number> {
  let total = await db.photos.where('state').anyOf('upload', 'delete').count()
  for (const table of SYNC_TABLES) total += await db.table(table).where('_dirty').equals(1).count()
  return total
}

export async function syncNow(db: MeterDB, client: SupabaseClient, userId: string) {
  // Also refreshes an expired access token.
  const { data } = await client.auth.getSession()
  if (!data.session) throw new Error('Signed out on the server: sign out and sign in again to sync.')
  if (data.session.user.id !== userId) throw new Error('Signed in as a different user.')

  await uploadPhotos(db, client)
  for (const table of SYNC_TABLES) await push(db, client, userId, table)
  await removePhotos(db, client)
  for (const table of SYNC_TABLES) await pull(db, client, userId, table)
}

async function uploadPhotos(db: MeterDB, client: SupabaseClient) {
  const queued = await db.photos.where('state').equals('upload').toArray()
  for (const photo of queued) {
    if (!photo.blob) continue
    const { error } = await client.storage
      .from(PHOTO_BUCKET)
      .upload(photo.path, photo.blob, { contentType: 'image/jpeg', upsert: true })
    if (error) throw new Error(`Photo upload failed: ${error.message}`)
    // Keep the blob as the offline copy, unless the photo was removed meanwhile.
    await db.transaction('rw', db.photos, async () => {
      const current = await db.photos.get(photo.path)
      if (current?.state === 'upload') await db.photos.update(photo.path, { state: 'done' })
    })
  }
}

async function removePhotos(db: MeterDB, client: SupabaseClient) {
  const queued = await db.photos.where('state').equals('delete').toArray()
  if (queued.length === 0) return
  const paths = queued.map((p) => p.path)
  const { error } = await client.storage.from(PHOTO_BUCKET).remove(paths)
  if (error) throw new Error(`Photo delete failed: ${error.message}`)
  await db.photos.bulkDelete(paths)
}

async function push(db: MeterDB, client: SupabaseClient, userId: string, table: SyncTable) {
  const local = db.table<SyncFields, string>(table)
  const dirty = (await local.where('_dirty').equals(1).toArray()).filter((r) => r.user_id === userId)

  for (let i = 0; i < dirty.length; i += PUSH_BATCH) {
    const batch = dirty.slice(i, i + PUSH_BATCH)
    const payload = batch.map(({ _dirty, ...row }) => row)
    const { data, error } = await client.from(table).upsert(payload).select('id, updated_at')
    if (error) throw new Error(`Upload ${table} failed: ${error.message}`)

    const serverStamp = new Map((data as { id: string; updated_at: string }[]).map((r) => [r.id, r.updated_at]))
    await db.transaction('rw', local, async () => {
      for (const sent of batch) {
        const current = await local.get(sent.id)
        if (!current || current.updated_at !== sent.updated_at) continue // edited meanwhile: next round
        await local.update(sent.id, { _dirty: 0, updated_at: serverStamp.get(sent.id) ?? sent.updated_at })
      }
    })
  }
}

async function pull(db: MeterDB, client: SupabaseClient, userId: string, table: SyncTable) {
  const local = db.table<SyncFields, string>(table)
  let cursor = readCursor(userId, table)

  for (;;) {
    let query = client
      .from(table)
      .select('*')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PULL_PAGE)
    if (cursor) {
      // Values are quoted because timestamps contain PostgREST's reserved characters (: .)
      query = query.or(`updated_at.gt."${cursor.ts}",and(updated_at.eq."${cursor.ts}",id.gt.${cursor.id})`)
    }
    const { data, error } = await query
    if (error) throw new Error(`Download ${table} failed: ${error.message}`)
    const rows = data as Record<string, unknown>[]
    if (rows.length === 0) break

    await db.transaction('rw', local, async () => {
      const existing = await local.bulkGet(rows.map((r) => r.id as string))
      const incoming = rows.filter((_, i) => existing[i]?._dirty !== 1).map(toLocalRow)
      await local.bulkPut(incoming)
    })

    const last = rows[rows.length - 1]
    cursor = { ts: last.updated_at as string, id: last.id as string }
    writeCursor(userId, table, cursor)
    if (rows.length < PULL_PAGE) break
  }
}

function toLocalRow(row: Record<string, unknown>): SyncFields {
  const copy: Record<string, unknown> = { ...row, _dirty: 0 }
  for (const col of NUMERIC_COLUMNS) if (col in copy && copy[col] !== null) copy[col] = Number(copy[col])
  return copy as unknown as SyncFields
}
