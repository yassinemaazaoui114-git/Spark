import type { Folder } from '@/types'

import { getDb } from './db'

// Ported from the PWA storage.ts folder functions.

export const DEFAULT_FOLDERS: Omit<Folder, 'createdAt'>[] = [
  { id: 'inbox', name: 'Inbox / Unsorted', icon: 'Inbox', isDefault: true, order: 0, parentId: null, color: '#8b5cf6' },
  { id: 'video-ideas', name: 'Video ideas', icon: 'Video', order: 1, parentId: null, color: '#8b5cf6' },
  { id: 'blog-posts', name: 'Blog posts', icon: 'PenLine', order: 2, parentId: null, color: '#8b5cf6' },
  { id: 'app-ideas', name: 'App ideas', icon: 'Lightbulb', order: 3, parentId: null, color: '#8b5cf6' },
  { id: 'random-sparks', name: 'Random sparks', icon: 'Sparkles', order: 4, parentId: null, color: '#8b5cf6' },
]

type FolderRow = {
  id: string
  name: string
  icon: string
  createdAt: number
  isDefault: number
  ord: number
  parentId: string | null
  color: string
}

function rowToFolder(r: FolderRow): Folder {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    createdAt: r.createdAt,
    isDefault: r.isDefault === 1,
    order: r.ord,
    parentId: r.parentId,
    color: r.color,
  }
}

export async function ensureSeedFolders(): Promise<Folder[]> {
  const db = await getDb()
  const existing = await getFolders()
  if (existing.length > 0) return existing
  const now = Date.now()
  for (const f of DEFAULT_FOLDERS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO folders (id, name, icon, createdAt, isDefault, ord, parentId, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [f.id, f.name, f.icon, now, f.isDefault ? 1 : 0, f.order, f.parentId, f.color]
    )
  }
  return getFolders()
}

export async function getFolders(): Promise<Folder[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<FolderRow>('SELECT * FROM folders ORDER BY ord ASC, createdAt ASC')
  return rows.map(rowToFolder)
}

export async function getTopLevelFolders(): Promise<Folder[]> {
  const all = await getFolders()
  return all.filter((f) => !f.parentId)
}

export async function getSubFolders(parentId: string): Promise<Folder[]> {
  const all = await getFolders()
  return all.filter((f) => f.parentId === parentId)
}

// Insert or update (upsert by id)
export async function saveFolder(folder: Folder): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO folders (id, name, icon, createdAt, isDefault, ord, parentId, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, icon = excluded.icon, isDefault = excluded.isDefault,
       ord = excluded.ord, parentId = excluded.parentId, color = excluded.color`,
    [
      folder.id,
      folder.name,
      folder.icon,
      folder.createdAt,
      folder.isDefault ? 1 : 0,
      folder.order,
      folder.parentId,
      folder.color,
    ]
  )
}

// Persist a fully reordered list of top-level folder ids (drag-to-reorder)
export async function saveFolderOrder(orderedIds: string[]): Promise<void> {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE folders SET ord = ? WHERE id = ?', [i, orderedIds[i]])
    }
  })
}

// Delete a folder: its records move to Inbox, its sub-folders move to the
// deleted folder's parent (or top level).
export async function deleteFolder(folderId: string): Promise<void> {
  const db = await getDb()
  const deleted = await db.getFirstAsync<FolderRow>('SELECT * FROM folders WHERE id = ?', [folderId])
  if (!deleted) return
  const newParentId = deleted.parentId ?? null
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE records SET folderId = 'inbox' WHERE folderId = ?", [folderId])
    await db.runAsync('UPDATE folders SET parentId = ? WHERE parentId = ?', [newParentId, folderId])
    await db.runAsync('DELETE FROM folders WHERE id = ?', [folderId])
  })
}
