import { LinearGradient } from 'expo-linear-gradient'
import { Clock, Hash, Mic, Pin } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { GlassDialog } from '@/components/GlassDialog'
import { folderIcon } from '@/constants/icons'
import { haptic } from '@/lib/haptics'
import type { Stats } from '@/lib/stats'
import { formatLongDuration } from '@/storage/format'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Full stats sheet (Step 28) — PWA stats dialog port: 4 gradient hero tiles,
// secondary rows, per-folder bar breakdown. Opened from Settings → Your stats.

type Props = {
  visible: boolean
  onClose: () => void
  stats: Stats
}

// PWA hero tile gradients (from-*/20 → to-*/20 with */30 borders)
const HERO_TILES = [
  {
    key: 'recordings',
    label: 'Recordings',
    colors: ['rgba(139,92,246,0.20)', 'rgba(217,70,239,0.20)'] as const,
    border: 'rgba(167,139,250,0.30)',
  },
  {
    key: 'audio',
    label: 'Total audio',
    colors: ['rgba(59,130,246,0.20)', 'rgba(139,92,246,0.20)'] as const,
    border: 'rgba(96,165,250,0.30)',
  },
  {
    key: 'streak',
    label: 'Day streak',
    colors: ['rgba(245,158,11,0.20)', 'rgba(244,63,94,0.20)'] as const,
    border: 'rgba(251,191,36,0.30)',
  },
  {
    key: 'week',
    label: 'This week',
    colors: ['rgba(16,185,129,0.20)', 'rgba(59,130,246,0.20)'] as const,
    border: 'rgba(52,211,153,0.30)',
  },
]

export function StatsSheet({ visible, onClose, stats }: Props) {
  const { tokens } = useTheme()

  const heroValues: Record<string, string> = {
    recordings: String(stats.totalRecords),
    audio: formatLongDuration(stats.totalSeconds),
    streak: String(stats.streak),
    week: String(stats.thisWeek),
  }

  const maxCount = Math.max(...stats.perFolder.map((f) => f.count), 1)

  return (
    <GlassDialog
      visible={visible}
      onRequestClose={onClose}
      title="Your stats"
      footer={
        <Pressable
          onPress={() => {
            haptic('light')
            onClose()
          }}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && { backgroundColor: tokens.surfaceSubtle },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close stats"
        >
          <Text style={[styles.closeText, { color: tokens.textSecondary }]}>Close</Text>
        </Pressable>
      }
    >
      {/* Hero stats — 4 big numbers */}
      <View style={styles.heroGrid}>
        {HERO_TILES.map((tile) => (
          <LinearGradient
            key={tile.key}
            colors={tile.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroTile, { borderColor: tile.border }]}
          >
            <Text
              style={[styles.heroValue, { color: tokens.textPrimary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {heroValues[tile.key]}
            </Text>
            <Text style={[styles.heroLabel, { color: tokens.textMuted }]}>{tile.label}</Text>
          </LinearGradient>
        ))}
      </View>

      {/* Secondary stats */}
      <View
        style={[
          styles.secondaryCard,
          { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
        ]}
      >
        <SecondaryRow
          icon={<Clock size={14} color={tokens.textMuted} strokeWidth={2} />}
          label="Average length"
          value={formatLongDuration(stats.avgDuration)}
        />
        <SecondaryRow
          icon={<Pin size={14} color={tokens.textMuted} strokeWidth={2} />}
          label="Pinned"
          value={String(stats.pinnedCount)}
        />
        <SecondaryRow
          icon={<Mic size={14} color={tokens.textMuted} strokeWidth={2} />}
          label="Voice / Text"
          value={`${stats.voiceCount} / ${stats.textCount}`}
        />
        {stats.topTag && (
          <SecondaryRow
            icon={<Hash size={14} color={tokens.textMuted} strokeWidth={2} />}
            label="Top tag"
            value={`#${stats.topTag[0]} · ${stats.topTag[1]}`}
            valueColor={tokens.accentTextStrong}
          />
        )}
      </View>

      {/* Per-folder breakdown */}
      {stats.perFolder.length > 0 && (
        <View style={styles.folderSection}>
          <Text style={[styles.sectionHeading, { color: tokens.textFaint }]}>By folder</Text>
          <View style={styles.folderList}>
            {stats.perFolder.map(({ folder, count, seconds }) => {
              const Icon = folderIcon(folder.icon)
              const barWidth = (count / maxCount) * 100
              return (
                <View
                  key={folder.id}
                  style={[
                    styles.folderRow,
                    { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
                  ]}
                >
                  {/* Horizontal usage bar behind the row content */}
                  <View
                    style={[
                      styles.folderBar,
                      { width: `${barWidth}%`, backgroundColor: tokens.accentTint },
                    ]}
                  />
                  <View style={styles.folderRowInner}>
                    <Icon size={14} color={tokens.textMuted} strokeWidth={2} />
                    <Text
                      style={[styles.folderName, { color: tokens.textSecondary }]}
                      numberOfLines={1}
                    >
                      {folder.name}
                    </Text>
                    <Text style={[styles.folderMeta, { color: tokens.textMuted }]}>
                      {count} · {formatLongDuration(seconds)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {stats.totalRecords === 0 && (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: tokens.textMuted }]}>No recordings yet</Text>
          <Text style={[styles.emptyText, { color: tokens.textFaint }]}>
            Start capturing thoughts to see your stats here.
          </Text>
        </View>
      )}
    </GlassDialog>
  )
}

function SecondaryRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
}) {
  const { tokens } = useTheme()
  return (
    <View style={styles.secondaryRow}>
      <View style={styles.secondaryLabel}>
        {icon}
        <Text style={[styles.secondaryLabelText, { color: tokens.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.secondaryValue, { color: valueColor ?? tokens.textSecondary }]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroTile: {
    // Two tiles per row inside the dialog (gap accounted via basis)
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  heroLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  secondaryCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: 10,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryLabelText: {
    fontSize: 13,
  },
  secondaryValue: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  folderSection: {
    marginTop: spacing.lg,
  },
  sectionHeading: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  folderList: {
    gap: 6,
  },
  folderRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  folderBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  folderRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  folderName: {
    flex: 1,
    fontSize: 13,
  },
  folderMeta: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 11,
    marginTop: 4,
  },
  closeBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  closeText: {
    fontSize: 14,
  },
})
