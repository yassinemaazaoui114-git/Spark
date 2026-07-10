import { useCallback, useEffect, useMemo, useState } from 'react'

import { formatDateKey } from '@/storage/format'
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from '@/storage/searches'
import type { VoiceRecord } from '@/types'

// Search over records with three modes (PWA had name/date; content mode is
// Yassine's addition):
// - name:    record names only
// - content: text-note bodies only
// - date:    local calendar date, optional end date for a range
// Always excludes archived; scoped to a folder when one is open.

export type SearchMode = 'name' | 'content' | 'date'

export const SEARCH_MODES: SearchMode[] = ['name', 'content', 'date']

export function useSearch(records: VoiceRecord[], folderId: string | null) {
  const [mode, setMode] = useState<SearchMode>('name')
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [recents, setRecents] = useState<string[]>([])

  const loadRecents = useCallback(async () => {
    setRecents(await getRecentSearches())
  }, [])

  useEffect(() => {
    loadRecents()
  }, [loadRecents])

  const trimmed = query.trim().toLowerCase()
  const active = mode === 'date' ? startDate != null : trimmed.length > 0

  const results = useMemo(() => {
    if (!active) return []
    const startKey = startDate ? formatDateKey(startDate) : ''
    const endKey = endDate ? formatDateKey(endDate) : null
    return records.filter((r) => {
      if (r.archived) return false
      if (folderId && r.folderId !== folderId) return false
      switch (mode) {
        case 'name':
          return r.name.toLowerCase().includes(trimmed)
        case 'content':
          return r.type === 'text' && r.textContent.toLowerCase().includes(trimmed)
        case 'date': {
          const recKey = formatDateKey(new Date(r.createdAt))
          return endKey ? recKey >= startKey && recKey <= endKey : recKey === startKey
        }
      }
    })
  }, [records, trimmed, active, folderId, mode, startDate, endDate])

  // Human label for the active date selection ("2026-07-11" or "a → b")
  const dateLabel = useMemo(() => {
    if (!startDate) return ''
    const start = formatDateKey(startDate)
    return endDate ? `${start} → ${formatDateKey(endDate)}` : start
  }, [startDate, endDate])

  // Cycle Name → Content → Date → Name, clearing the previous input (PWA
  // cleared on toggle too)
  const cycleMode = useCallback(() => {
    setMode((m) => SEARCH_MODES[(SEARCH_MODES.indexOf(m) + 1) % SEARCH_MODES.length])
    setQuery('')
    setStartDate(null)
    setEndDate(null)
  }, [])

  const submit = useCallback(
    async (q?: string) => {
      if (mode === 'date') return
      const value = (q ?? query).trim()
      if (!value) return
      await addRecentSearch(value)
      await loadRecents()
    },
    [mode, query, loadRecents]
  )

  const clearRecents = useCallback(async () => {
    await clearRecentSearches()
    setRecents([])
  }, [])

  const reset = useCallback(() => {
    setMode('name')
    setQuery('')
    setStartDate(null)
    setEndDate(null)
  }, [])

  return {
    mode,
    cycleMode,
    query,
    setQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dateLabel,
    active,
    results,
    recents,
    submit,
    clearRecents,
    reset,
  }
}

export type Search = ReturnType<typeof useSearch>
