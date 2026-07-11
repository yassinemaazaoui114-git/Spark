import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { EmptyState } from '@/components/EmptyState'
import { LazyList } from '@/components/LazyList'
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
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <LazyList
          items={results}
          keyExtractor={(r) => r.id}
          renderItem={(r) => (
            <RecordCard
              record={r}
              folderName={folders.find((f) => f.id === r.folderId)?.name || 'Unknown'}
              onChanged={onChanged}
            />
          )}
        />
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
  list: {
    gap: spacing.sm,
  },
})
