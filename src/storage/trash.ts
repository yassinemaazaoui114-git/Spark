import type { Folder, VoiceRecord } from '@/types'

import { getDb } from './db'
import { deleteRecordingFile } from './files'
import { rowToFolder, type FolderRow } from './folders'
import { rowToRecord, type RecordRow } from './records'

// Recently Deleted (Trash) — soft-deleted items live here for 30 days, then
// the auto-purge on app open removes them for good.

export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

// ---------- Soft delete / restore ----------

export async function softDeleteRecord(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE records SET deletedAt = ? WHERE id = ?', [Date.now(), id])
}

export async function softDeleteRecords(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  await db.runAsync(
    `UPDATE records SET deletedAt = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
    [Date.now(), ...ids]
  )
}

// Restore a record to its folder; if that folder is itself in the trash (or
// gone), the record lands in Inbox instead of becoming an orphan.
export async function restoreRecord(id: string): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<RecordRow>('SELECT * FROM records WHERE id = ?', [id])
  if (!row) return
  const folderAlive = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM folders WHERE id = ? AND deletedAt IS NULL',
    [row.folderId]
  )
  await db.runAsync('UPDATE records SET deletedAt = NULL, folderId = ? WHERE id = ?', [
    folderAlive ? row.folderId : 'inbox',
    id,
  ])
}

// Restore a folder together with all its trashed records.
export async function restoreFolder(folderId: string): Promise<void> {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE folders SET deletedAt = NULL WHERE id = ?', [folderId])
    await db.runAsync('UPDATE records SET deletedAt = NULL WHERE folderId = ?', [folderId])
  })
}

// ---------- Reading the trash ----------

export async function getDeletedRecords(): Promise<VoiceRecord[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<RecordRow>(
    'SELECT * FROM records WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC'
  )
  return rows.map(rowToRecord)
}

export async function getDeletedFolders(): Promise<Folder[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<FolderRow>(
    'SELECT * FROM folders WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC'
  )
  return rows.map(rowToFolder)
}

export async function getTrashCount(): Promise<number> {
  const db = await getDb()
  const r = await db.getFirstAsync<{ n: number }>(
    'SELECT (SELECT COUNT(*) FROM records WHERE deletedAt IS NOT NULL) + (SELECT COUNT(*) FROM folders WHERE deletedAt IS NOT NULL) AS n'
  )
  return r?.n ?? 0
}

// ---------- Delete forever ----------

// Remove the row and its audio file (unless another record shares the file —
// "save trim as copy" reuses the original audio).
export async function permanentlyDeleteRecord(id: string): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<RecordRow>('SELECT * FROM records WHERE id = ?', [id])
  if (!row) return
  await db.runAsync('DELETE FROM records WHERE id = ?', [id])
  if (row.audioUri) {
    const shared = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM records WHERE audioUri = ?',
      [row.audioUri]
    )
    if (!shared || shared.n === 0) {
      deleteRecordingFile(row.audioUri)
    }
  }
}

// Hard-delete a trashed folder and every trashed record still inside it.
export async function permanentlyDeleteFolder(folderId: string): Promise<void> {
  const db = await getDb()
  const rows = await db.getAllAsync<RecordRow>(
    'SELECT * FROM records WHERE folderId = ? AND deletedAt IS NOT NULL',
    [folderId]
  )
  for (const r of rows) {
    await permanentlyDeleteRecord(r.id)
  }
  await db.runAsync('DELETE FROM folders WHERE id = ?', [folderId])
}

export async function emptyTrash(): Promise<void> {
  const records = await getDeletedRecords()
  for (const r of records) {
    await permanentlyDeleteRecord(r.id)
  }
  const folders = await getDeletedFolders()
  const db = await getDb()
  for (const f of folders) {
    await db.runAsync('DELETE FROM folders WHERE id = ?', [f.id])
  }
}

// Auto-purge on app open: everything trashed before `cutoff` is gone forever.
export async function purgeOldDeleted(cutoff: number): Promise<void> {
  const db = await getDb()
  const rows = await db.getAllAsync<RecordRow>(
    'SELECT * FROM records WHERE deletedAt IS NOT NULL AND deletedAt < ?',
    [cutoff]
  )
  for (const r of rows) {
    await permanentlyDeleteRecord(r.id)
  }
  await db.runAsync('DELETE FROM folders WHERE deletedAt IS NOT NULL AND deletedAt < ?', [cutoff])
}
