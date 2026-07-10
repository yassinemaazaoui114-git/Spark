import { Hash, Pin } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

import type { RecordFilters } from '@/hooks/useRecordFilters'
import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius } from '@/theme/tokens'

// Horizontal quick-filter chip row (PWA port): Pinned (amber), Long/Short
// (emerald), one violet chip per tag. Chips combine.

type Props = {
  filters: RecordFilters
  allTags: string[]
}

export function FilterChips({ filters, allTags }: Props) {
  const { tokens } = useTheme()
  const hasPinned = filters.scoped.some((r) => r.pinned)

  if (!hasPinned && allTags.length === 0 && filters.scoped.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {hasPinned && (
        <Chip
          label="Pinned"
          icon={
            <Pin
              size={10}
              color={filters.pinnedOnly ? '#fde68a' : tokens.textMuted}
              fill={filters.pinnedOnly ? '#fde68a' : 'transparent'}
              strokeWidth={2}
            />
          }
          active={filters.pinnedOnly}
          activeStyle={styles.amberActive}
          activeTextColor="#fde68a"
          onPress={() => filters.togglePinned()}
        />
      )}
      <Chip
        label="Long"
        active={filters.duration === 'long'}
        activeStyle={styles.emeraldActive}
        activeTextColor="#a7f3d0"
        onPress={() => filters.toggleDuration('long')}
      />
      <Chip
        label="Short"
        active={filters.duration === 'short'}
        activeStyle={styles.emeraldActive}
        activeTextColor="#a7f3d0"
        onPress={() => filters.toggleDuration('short')}
      />
      {allTags.map((t) => (
        <Chip
          key={t}
          label={t}
          icon={
            <Hash
              size={10}
              color={filters.tag === t ? '#ddd6fe' : tokens.textMuted}
              strokeWidth={2}
            />
          }
          active={filters.tag === t}
          activeStyle={styles.violetActive}
          activeTextColor="#ddd6fe"
          onPress={() => filters.toggleTag(t)}
        />
      ))}
    </ScrollView>
  )
}

function Chip({
  label,
  icon,
  active,
  activeStyle,
  activeTextColor,
  onPress,
}: {
  label: string
  icon?: React.ReactNode
  active: boolean
  activeStyle: object
  activeTextColor: string
  onPress: () => void
}) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={() => {
        haptic('light')
        onPress()
      }}
      style={[
        styles.chip,
        active
          ? activeStyle
          : { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter: ${label}`}
    >
      {icon}
      <Text
        style={[styles.chipText, { color: active ? activeTextColor : tokens.textMuted }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
    flexGrow: 0,
  },
  content: {
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  amberActive: {
    backgroundColor: 'rgba(245,158,11,0.25)',
    borderColor: 'rgba(251,191,36,0.5)',
  },
  emeraldActive: {
    backgroundColor: 'rgba(16,185,129,0.25)',
    borderColor: 'rgba(52,211,153,0.5)',
  },
  violetActive: {
    backgroundColor: 'rgba(139,92,246,0.3)',
    borderColor: 'rgba(167,139,250,0.5)',
  },
})
