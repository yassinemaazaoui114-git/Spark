import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { RecordCard } from '@/components/RecordCard'
import { SortMenu } from '@/components/SortMenu'
import type { Search } from '@/hooks/useSearch'
import { sortRecords, type SortOption } from '@/lib/sort-records'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// Search results list — count header + sort + RecordCards, mode-aware copy.
// Empty state gets the butterfly illustration in Step 26.

type Props = {
  search: Search
  folders: Folder[]
  onChanged: () => void
}

export function SearchResults({ search, folders, onChanged }: Props) {
  const { tokens } = useTheme()
  const [sort, setSort] = useState<SortOption>('newest')
  const { mode, query, dateLabel } = search
  const results = sortRecords(search.results, sort)

  const emptyTitle =
    mode === 'date'
      ? `No records on ${dateLabel}`
      : `No matches for “${query.trim()}”`
  const emptyMessage =
    mode === 'date' ? 'Try a different date.' : 'Try a different keyword.'

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: tokens.textSecondary }]}>
          {results.length} result{results.length !== 1 ? 's' : ''}
          <Text style={{ color: tokens.textFaint }}> by {mode}</Text>
        </Text>
        {results.length > 0 && <SortMenu value={sort} onChange={setSort} />}
      </View>

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: tokens.textSecondary }]}>{emptyTitle}</Text>
          <Text style={[styles.emptyMessage, { color: tokens.textMuted }]}>{emptyMessage}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {results.map((r) => (
            <RecordCard
              key={r.id}
              record={r}
              folderName={folders.find((f) => f.id === r.folderId)?.name || 'Unknown'}
              onChanged={onChanged}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  header: {
    fontSize: 13,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyMessage: {
    fontSize: 12,
  },
  list: {
    gap: spacing.sm,
  },
})
