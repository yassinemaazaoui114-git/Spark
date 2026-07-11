import { BarChart3, ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import type { Stats } from '@/lib/stats'
import { formatLongDuration } from '@/storage/format'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// "Your stats" quick-access card (PWA port) — summary line, opens the full
// stats sheet (Step 28).

type Props = {
  stats: Stats
  onPress: () => void
}

export function StatsCard({ stats, onPress }: Props) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={() => {
        haptic('light')
        onPress()
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
          borderColor: tokens.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Your stats"
    >
      <View style={styles.iconChip}>
        <BarChart3 size={18} color={tokens.accentIconSoft} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: tokens.textPrimary }]}>Your stats</Text>
        <Text style={[styles.meta, { color: tokens.textMuted }]}>
          {stats.totalRecords} recording{stats.totalRecords !== 1 ? 's' : ''} ·{' '}
          {formatLongDuration(stats.totalSeconds)} total · {stats.streak}-day streak
        </Text>
      </View>
      <ChevronRight size={16} color={tokens.textFaint} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.25)',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
  },
})
