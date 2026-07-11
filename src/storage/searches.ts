import type { SavedSearch } from '@/types'

import { getDb } from './db'
import { PREF_KEYS, getJsonPref, setJsonPref } from './prefs'

// ---------- Recent searches (AsyncStorage, max 5, dedup, newest first) ----------

export async function getRecentSearches(): Promise<string[]> {
  return getJsonPref<string[]>(PREF_KEYS.recentSearches, [])
}

export async function addRecentSearch(query: string): Promise<void> {
  const trimmed = query.trim()
  if (!trimmed) return
  const existing = await getRecentSearches()
  const filtered = existing.filter((s) => s !== trimmed)
  filtered.unshift(trimmed)
  await setJsonPref(PREF_KEYS.recentSearches, filtered.slice(0, 5))
}

export async function clearRecentSearches(): Promise<void> {
  await setJsonPref(PREF_KEYS.recentSearches, [])
}

// ---------- Saved searches (SQLite) ----------

type SavedSearchRow = {
  id: string
  name: string
  query: string
  mode: string
  folderId: string | null
  tag: string | null
  durationMin: number | null
  durationMax: number | null
  createdAt: number
}

function rowToSavedSearch(r: SavedSearchRow): SavedSearch {
  return {
    id: r.id,
    name: r.name,
    query: r.query,
    mode: r.mode === 'content' ? 'content' : 'name',
    folderId: r.folderId,
    tag: r.tag,
    durationFilter:
      r.durationMin != null && r.durationMax != null ? [r.durationMin, r.durationMax] : null,
    createdAt: r.createdAt,
  }
}

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<SavedSearchRow>(
    'SELECT * FROM saved_searches ORDER BY createdAt ASC'
  )
  return rows.map(rowToSavedSearch)
}

export async function addSavedSearch(search: SavedSearch): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT OR REPLACE INTO saved_searches (id, name, query, mode, folderId, tag, durationMin, durationMax, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      search.id,
      search.name,
      search.query,
      search.mode ?? 'name',
      search.folderId ?? null,
      search.tag ?? null,
      search.durationFilter?.[0] ?? null,
      search.durationFilter?.[1] ?? null,
      search.createdAt,
    ]
  )
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM saved_searches WHERE id = ?', [id])
}
