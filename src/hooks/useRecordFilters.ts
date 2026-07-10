import { useCallback, useMemo, useState } from 'react'

import { sortRecords, type SortOption } from '@/lib/sort-records'
import type { VoiceRecord } from '@/types'

// Quick filters (PWA chips): Pinned, Long (≥2min), Short (<30s), one tag —
// fully combinable (the PWA combined them inside folders; we combine
// everywhere). Scoped to the open folder when one is set.

export type DurationFilter = 'long' | 'short' | null

export function useRecordFilters(records: VoiceRecord[], folderId: string | null) {
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [duration, setDuration] = useState<DurationFilter>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('newest')

  const active = pinnedOnly || duration != null || tag != null

  const scoped = useMemo(
    () =>
      records.filter((r) => {
        if (r.archived) return false
        if (folderId && r.folderId !== folderId) return false
        return true
      }),
    [records, folderId]
  )

  const results = useMemo(() => {
    if (!active) return []
    const filtered = scoped.filter((r) => {
      if (pinnedOnly && !r.pinned) return false
      if (duration === 'long' && r.durationSec < 120) return false
      if (duration === 'short' && r.durationSec >= 30) return false
      if (tag && !r.tags.includes(tag)) return false
      return true
    })
    return sortRecords(filtered, sort)
  }, [scoped, active, pinnedOnly, duration, tag, sort])

  const togglePinned = useCallback(() => setPinnedOnly((p) => !p), [])
  const toggleDuration = useCallback(
    (d: 'long' | 'short') => setDuration((cur) => (cur === d ? null : d)),
    []
  )
  const toggleTag = useCallback(
    (t: string) => setTag((cur) => (cur === t ? null : t)),
    []
  )

  const reset = useCallback(() => {
    setPinnedOnly(false)
    setDuration(null)
    setTag(null)
  }, [])

  return {
    pinnedOnly,
    duration,
    tag,
    sort,
    setSort,
    active,
    results,
    scoped,
    togglePinned,
    toggleDuration,
    toggleTag,
    reset,
  }
}

export type RecordFilters = ReturnType<typeof useRecordFilters>
