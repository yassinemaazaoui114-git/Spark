import { getDb } from './db'

// Centralized list of all tags ever used (PWA 'tags' key).

export async function getAllTags(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ name: string }>('SELECT name FROM tags ORDER BY name ASC')
  return rows.map((r) => r.name)
}

export async function addTags(tags: string[]): Promise<void> {
  const db = await getDb()
  for (const t of tags) {
    const trimmed = t.trim()
    if (trimmed) {
      await db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', [trimmed])
    }
  }
}

export async function removeTag(tag: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM tags WHERE name = ?', [tag])
}

// Delete a tag completely: from the central list AND from every record.
export async function deleteTagCompletely(tag: string): Promise<void> {
  const db = await getDb()
  await removeTag(tag)
  const rows = await db.getAllAsync<{ id: string; tags: string }>(
    'SELECT id, tags FROM records WHERE tags LIKE ?',
    [`%${JSON.stringify(tag).slice(1, -1)}%`]
  )
  for (const row of rows) {
    let tags: string[] = []
    try {
      const parsed = JSON.parse(row.tags)
      if (Array.isArray(parsed)) tags = parsed
    } catch {
      continue
    }
    if (tags.includes(tag)) {
      await db.runAsync('UPDATE records SET tags = ? WHERE id = ?', [
        JSON.stringify(tags.filter((t) => t !== tag)),
        row.id,
      ])
    }
  }
}
