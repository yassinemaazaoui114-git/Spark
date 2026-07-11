import { Archive, Clock, Sparkles, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { EmptyState } from '@/components/EmptyState'
import { LazyList } from '@/components/LazyList'
import { RecordCard } from '@/components/RecordCard'
import { SortMenu } from '@/components/SortMenu'
import type { SmartFolder } from '@/lib/smart-folder'
import { sortRecords, type SortOption } from '@/lib/sort-records'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'
import type { Folder, VoiceRecord } from '@/types'

// Smart folder views (PWA port): All / This week (7d) / This month (30d) /
// Archive — icon header, count, sort, Clear. The Archive view is the one
// place archived records are visible (restore via the action sheet).

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

// Icon colors per theme: pale shades on dark, deep shades on light
const META: Record<
  SmartFolder,
  { label: string; Icon: typeof Sparkles; color: { dark: string; light: string } }
> = {
  all: { label: 'All records', Icon: Sparkles, color: { dark: '#c4b5fd', light: '#7c3aed' } },
  week: { label: 'This week', Icon: Clock, color: { dark: '#93c5fd', light: '#2563eb' } },
  month: { label: 'This month', Icon: Clock, color: { dark: '#93c5fd', light: '#2563eb' } },
  archive: { label: 'Archive', Icon: Archive, color: { dark: '#d4d4d8', light: '#52525b' } },
}

export function filterSmartFolder(records: VoiceRecord[], smart: SmartFolder): VoiceRecord[] {
  const now = Date.now()
  switch (smart) {
    case 'all':
      return records.filter((r) => !r.archived)
    case 'week':
      return records.filter((r) => !r.archived && r.createdAt >= now - WEEK_MS)
    case 'month':
      return records.filter((r) => !r.archived && r.createdAt >= now - MONTH_MS)
    case 'archive':
      return records.filter((r) => r.archived)
  }
}

type Props = {
  smart: SmartFolder
  records: VoiceRecord[]
  folders: Folder[]
  onClear: () => void
  onChanged: () => void
}

export function SmartFolderView({ smart, records, folders, onClear, onChanged }: Props) {
  const { theme, tokens } = useTheme()
  const [sort, setSort] = useState<SortOption>('newest')

  const { label, Icon, color } = META[smart]
  const iconColor = color[theme]
  const results = sortRecords(filterSmartFolder(records, smart), sort)

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon size={13} color={iconColor} strokeWidth={2} />
          <Text style={[styles.headerText, { color: tokens.textSecondary }]} numberOfLines={1}>
            {label}
            <Text style={{ color: tokens.textFaint }}>
              {' '}
              · {results.length} record{results.length !== 1 ? 's' : ''}
            </Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          {results.length > 0 && <SortMenu value={sort} onChange={setSort} />}
          <Pressable
            onPress={onClear}
            hitSlop={6}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Close smart view"
          >
            <X size={11} color={tokens.textMuted} strokeWidth={2} />
            <Text style={[styles.clearText, { color: tokens.textMuted }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {results.length === 0 ? (
        <EmptyState
          title={smart === 'archive' ? 'Archive is empty' : 'Nothing here yet'}
          message={
            smart === 'archive'
              ? 'Archived records will appear here.'
              : 'No records match this view.'
          }
        />
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
