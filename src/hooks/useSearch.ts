import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from '@/storage/searches'
import type { VoiceRecord } from '@/types'

// Name search over records (PWA port): matches record name AND text-note
// content, case-insensitive, excludes archived, scoped to a folder when one
// is open. Submitting stores the query in recent searches (cap 5).

export function useSearch(records: VoiceRecord[], folderId: string | null) {
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState<string[]>([])

  const loadRecents = useCallback(async () => {
    setRecents(await getRecentSearches())
  }, [])

  useEffect(() => {
    loadRecents()
  }, [loadRecents])

  const trimmed = query.trim().toLowerCase()
  const active = trimmed.length > 0

  const results = useMemo(() => {
    if (!active) return []
    return records.filter((r) => {
      if (r.archived) return false
      if (folderId && r.folderId !== folderId) return false
      const nameMatch = r.name.toLowerCase().includes(trimmed)
      const textMatch =
        r.type === 'text' && r.textContent.toLowerCase().includes(trimmed)
      return nameMatch || textMatch
    })
  }, [records, trimmed, active, folderId])

  const submit = useCallback(
    async (q?: string) => {
      const value = (q ?? query).trim()
      if (!value) return
      await addRecentSearch(value)
      await loadRecents()
    },
    [query, loadRecents]
  )

  const clearRecents = useCallback(async () => {
    await clearRecentSearches()
    setRecents([])
  }, [])

  const reset = useCallback(() => setQuery(''), [])

  return { query, setQuery, active, results, recents, submit, clearRecents, reset }
}
