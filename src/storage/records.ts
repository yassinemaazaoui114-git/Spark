import type { VoiceRecord } from '@/types'

import { getDb } from './db'
import { addTags } from './tags'

export type RecordRow = {
  id: string
  name: string
  folderId: string
  audioUri: string
  durationSec: number
  createdAt: number
  pinned: number
  tags: string
  archived: number
  type: string
  textContent: string
  trimStart: number | null
  trimEnd: number | null
  cutStart: number | null
  cutEnd: number | null
  deletedAt: number | null
}

export function rowToRecord(r: RecordRow): VoiceRecord {
  let tags: string[] = []
  try {
    const parsed = JSON.parse(r.tags)
    if (Array.isArray(parsed)) tags = parsed
  } catch {
    // corrupt tags column — treat as untagged
  }
  return {
    id: r.id,
    name: r.name,
    folderId: r.folderId,
    audioUri: r.audioUri,
    durationSec: r.durationSec,
    createdAt: r.createdAt,
    pinned: r.pinned === 1,
    tags,
    archived: r.archived === 1,
    type: r.type === 'text' ? 'text' : 'audio',
    textContent: r.textContent,
    trimStart: r.trimStart,
    trimEnd: r.trimEnd,
    cutStart: r.cutStart,
    cutEnd: r.cutEnd,
    deletedAt: r.deletedAt ?? null,
  }
}

// All active records — soft-deleted excluded, pinned first, newest first.
export async function getRecords(): Promise<VoiceRecord[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<RecordRow>(
    'SELECT * FROM records WHERE deletedAt IS NULL ORDER BY pinned DESC, createdAt DESC'
  )
  return rows.map(rowToRecord)
}

// Every record id, INCLUDING soft-deleted ones — for backup import, where a
// record sitting in the trash must still block re-import under the same id.
export async function getAllRecordIds(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM records')
  return rows.map((r) => r.id)
}

export async function getRecord(id: string): Promise<VoiceRecord | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<RecordRow>('SELECT * FROM records WHERE id = ?', [id])
  return row ? rowToRecord(row) : null
}

export async function getRecordsByFolder(folderId: string): Promise<VoiceRecord[]> {
  const all = await getRecords()
  return all.filter((r) => r.folderId === folderId)
}

export async function getRecordsByTag(tag: string): Promise<VoiceRecord[]> {
  const all = await getRecords()
  return all.filter((r) => r.tags.includes(tag))
}

// Insert or update (upsert by id). Also registers any new tags.
export async function saveRecord(record: VoiceRecord): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO records (id, name, folderId, audioUri, durationSec, createdAt, pinned, tags, archived, type, textContent, trimStart, trimEnd, cutStart, cutEnd, deletedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, folderId = excluded.folderId, audioUri = excluded.audioUri,
       durationSec = excluded.durationSec, pinned = excluded.pinned, tags = excluded.tags,
       archived = excluded.archived, type = excluded.type, textContent = excluded.textContent,
       trimStart = excluded.trimStart, trimEnd = excluded.trimEnd,
       cutStart = excluded.cutStart, cutEnd = excluded.cutEnd, deletedAt = excluded.deletedAt`,
    [
      record.id,
      record.name,
      record.folderId,
      record.audioUri,
      record.durationSec,
      record.createdAt,
      record.pinned ? 1 : 0,
      JSON.stringify(record.tags),
      record.archived ? 1 : 0,
      record.type,
      record.textContent,
      record.trimStart,
      record.trimEnd,
      record.cutStart,
      record.cutEnd,
      record.deletedAt ?? null,
    ]
  )
  if (record.tags.length > 0) {
    await addTags(record.tags)
  }
}

export async function moveRecord(id: string, folderId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE records SET folderId = ? WHERE id = ?', [folderId, id])
}

// ---------- Batch operations (multi-select) ----------

function placeholders(n: number): string {
  return Array(n).fill('?').join(',')
}

export async function batchMoveRecords(ids: string[], folderId: string): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  await db.runAsync(
    `UPDATE records SET folderId = ? WHERE id IN (${placeholders(ids.length)})`,
    [folderId, ...ids]
  )
}

export async function batchSetArchived(ids: string[], archived: boolean): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  await db.runAsync(
    `UPDATE records SET archived = ? WHERE id IN (${placeholders(ids.length)})`,
    [archived ? 1 : 0, ...ids]
  )
}
