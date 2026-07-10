import type { VoiceRecord } from '@/types'

import { getDb } from './db'
import { deleteRecordingFile } from './files'
import { addTags } from './tags'

type RecordRow = {
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
}

function rowToRecord(r: RecordRow): VoiceRecord {
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
  }
}

// All records — pinned first, then newest first (PWA default sort).
export async function getRecords(): Promise<VoiceRecord[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<RecordRow>(
    'SELECT * FROM records ORDER BY pinned DESC, createdAt DESC'
  )
  return rows.map(rowToRecord)
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
    `INSERT INTO records (id, name, folderId, audioUri, durationSec, createdAt, pinned, tags, archived, type, textContent, trimStart, trimEnd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, folderId = excluded.folderId, audioUri = excluded.audioUri,
       durationSec = excluded.durationSec, pinned = excluded.pinned, tags = excluded.tags,
       archived = excluded.archived, type = excluded.type, textContent = excluded.textContent,
       trimStart = excluded.trimStart, trimEnd = excluded.trimEnd`,
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
    ]
  )
  if (record.tags.length > 0) {
    await addTags(record.tags)
  }
}

// Delete the DB row and its audio file (unless another record shares the
// file — "save trim as copy" reuses the original audio).
export async function deleteRecord(id: string): Promise<void> {
  const db = await getDb()
  const record = await getRecord(id)
  if (!record) return
  await db.runAsync('DELETE FROM records WHERE id = ?', [id])
  if (record.audioUri) {
    const shared = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM records WHERE audioUri = ?',
      [record.audioUri]
    )
    if (!shared || shared.n === 0) {
      deleteRecordingFile(record.audioUri)
    }
  }
}

export async function moveRecord(id: string, folderId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE records SET folderId = ? WHERE id = ?', [folderId, id])
}
