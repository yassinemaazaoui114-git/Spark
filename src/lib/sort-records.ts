import { stripStoredTimestampPrefix } from '@/storage/format'
import type { VoiceRecord } from '@/types'

// Record sorting (PWA sortRecords port). Pinned records always come first,
// then the chosen order applies.

export type SortOption = 'newest' | 'oldest' | 'longest' | 'shortest' | 'name-az' | 'name-za'

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'longest', label: 'Longest first' },
  { id: 'shortest', label: 'Shortest first' },
  { id: 'name-az', label: 'Name A → Z' },
  { id: 'name-za', label: 'Name Z → A' },
]

export function sortRecords<T extends VoiceRecord>(arr: T[], option: SortOption): T[] {
  const sorted = [...arr]
  const pinnedFirst = (a: T, b: T): number =>
    a.pinned !== b.pinned ? (b.pinned ? 1 : -1) : 0

  const name = (r: T) => stripStoredTimestampPrefix(r.name)

  switch (option) {
    case 'newest':
      return sorted.sort((a, b) => pinnedFirst(a, b) || b.createdAt - a.createdAt)
    case 'oldest':
      return sorted.sort((a, b) => pinnedFirst(a, b) || a.createdAt - b.createdAt)
    case 'longest':
      return sorted.sort((a, b) => pinnedFirst(a, b) || b.durationSec - a.durationSec)
    case 'shortest':
      return sorted.sort((a, b) => pinnedFirst(a, b) || a.durationSec - b.durationSec)
    case 'name-az':
      return sorted.sort((a, b) => pinnedFirst(a, b) || name(a).localeCompare(name(b)))
    case 'name-za':
      return sorted.sort((a, b) => pinnedFirst(a, b) || name(b).localeCompare(name(a)))
  }
}
