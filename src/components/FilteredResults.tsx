import { Clock, Hash, Pin, X } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { EmptyState } from '@/components/EmptyState'
import { LazyList } from '@/components/LazyList'
import { RecordCard } from '@/components/RecordCard'
import { SortMenu } from '@/components/SortMenu'
import type { RecordFilters } from '@/hooks/useRecordFilters'
import { useTheme } from '@/theme/ThemeContext'
import { accent, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// Filtered record list (PWA filtered views): icon + combined label header,
// count, sort menu, Clear button, RecordCards.

type Props = {
  filters: RecordFilters
  folders: Folder[]
  onChanged: () => void
}

export function FilteredResults({ filters, folders, onChanged }: Props) {
  const { theme, tokens } = useTheme()

  const labels: string[] = []
  if (filters.pinnedOnly) labels.push('Pinned')
  if (filters.duration === 'long') labels.push('Long (2min+)')
  if (filters.duration === 'short') labels.push('Short (<30s)')
  if (filters.tag) labels.push(`#${filters.tag}`)

  const HeaderIcon = filters.pinnedOnly ? Pin : filters.duration ? Clock : Hash
  const iconColor = filters.pinnedOnly
    ? accent.amber
    : filters.duration
      ? theme === 'light'
        ? '#047857'
        : '#6ee7b7'
      : tokens.accentIcon

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <HeaderIcon
            size={13}
            color={iconColor}
            fill={filters.pinnedOnly ? accent.amber : 'transparent'}
            strokeWidth={2}
          />
          <Text
            style={[styles.headerText, { color: tokens.textSecondary }]}
            numberOfLines={1}
          >
            {labels.join(' + ')}
            <Text style={{ color: tokens.textFaint }}>
              {' '}
              · {filters.results.length} record{filters.results.length !== 1 ? 's' : ''}
            </Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <SortMenu value={filters.sort} onChange={filters.setSort} />
          <Pressable
            onPress={filters.reset}
            hitSlop={6}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
          >
            <X size={11} color={tokens.textMuted} strokeWidth={2} />
            <Text style={[styles.clearText, { color: tokens.textMuted }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {filters.results.length === 0 ? (
        <EmptyState title="No records match" message="Try a different filter combination." />
      ) : (
        <LazyList
          items={filters.results}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clearText: {
    fontSize: 11,
  },
  list: {
    gap: spacing.sm,
  },
})
