import { StyleSheet, Text, View } from 'react-native'

import { RecordCard } from '@/components/RecordCard'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

// Search results list — count header + RecordCards (PWA search section).
// Empty state gets the butterfly illustration in Step 26.

type Props = {
  results: VoiceRecord[]
  query: string
  folders: Folder[]
  onChanged: () => void
}

export function SearchResults({ results, query, folders, onChanged }: Props) {
  const { tokens } = useTheme()

  return (
    <View>
      <Text style={[styles.header, { color: tokens.textSecondary }]}>
        {results.length} result{results.length !== 1 ? 's' : ''}
        <Text style={{ color: tokens.textFaint }}> by name</Text>
      </Text>

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: tokens.textSecondary }]}>
            No matches for &ldquo;{query.trim()}&rdquo;
          </Text>
          <Text style={[styles.emptyMessage, { color: tokens.textMuted }]}>
            Try a different keyword.
          </Text>
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
  header: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.md,
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
