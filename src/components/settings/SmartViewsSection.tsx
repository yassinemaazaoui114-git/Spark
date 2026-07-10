import { useFocusEffect, useRouter } from 'expo-router'
import { Archive, ChevronRight, Clock, Sparkles } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { setSmartFolder, type SmartFolder } from '@/lib/smart-folder'
import { getRecords } from '@/storage/records'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Settings → Smart views grid (All / This week / This month) + Archive card.
// Selecting one jumps to the home tab showing that view (PWA behavior).

export function SmartViewsSection() {
  const { tokens } = useTheme()
  const router = useRouter()
  const [archivedCount, setArchivedCount] = useState(0)

  useFocusEffect(
    useCallback(() => {
      ;(async () => {
        const records = await getRecords()
        setArchivedCount(records.filter((r) => r.archived).length)
      })()
    }, [])
  )

  const open = (view: SmartFolder) => {
    haptic('light')
    setSmartFolder(view)
    router.navigate('/')
  }

  return (
    <View>
      {/* Archive quick-access card */}
      <Pressable
        onPress={() => open('archive')}
        style={({ pressed }) => [
          styles.archiveCard,
          {
            backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
            borderColor: tokens.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open archive"
      >
        <View style={[styles.archiveIcon, { backgroundColor: 'rgba(113,113,122,0.2)' }]}>
          <Archive size={18} color="#d4d4d8" strokeWidth={2} />
        </View>
        <View style={styles.archiveBody}>
          <Text style={[styles.archiveTitle, { color: tokens.textPrimary }]}>Archive</Text>
          <Text style={[styles.archiveMeta, { color: tokens.textMuted }]}>
            {archivedCount} archived record{archivedCount !== 1 ? 's' : ''} · hidden from folders
          </Text>
        </View>
        <ChevronRight size={16} color={tokens.textFaint} strokeWidth={2} />
      </Pressable>

      {/* Smart views 3-grid */}
      <View style={styles.sectionHeader}>
        <Sparkles size={12} color={tokens.textFaint} strokeWidth={2} />
        <Text style={[styles.sectionTitle, { color: tokens.textFaint }]}>SMART VIEWS</Text>
      </View>
      <View style={styles.grid}>
        <GridButton
          label="All"
          icon={<Sparkles size={16} color="#c4b5fd" strokeWidth={2} />}
          onPress={() => open('all')}
        />
        <GridButton
          label="This week"
          icon={<Clock size={16} color="#93c5fd" strokeWidth={2} />}
          onPress={() => open('week')}
        />
        <GridButton
          label="This month"
          icon={<Clock size={16} color="#93c5fd" strokeWidth={2} />}
          onPress={() => open('month')}
        />
      </View>
    </View>
  )
}

function GridButton({
  label,
  icon,
  onPress,
}: {
  label: string
  icon: React.ReactNode
  onPress: () => void
}) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridBtn,
        {
          backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
          borderColor: tokens.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text style={[styles.gridLabel, { color: tokens.textPrimary }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  archiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  archiveIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveBody: {
    flex: 1,
    minWidth: 0,
  },
  archiveTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  archiveMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gridBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  gridLabel: {
    fontSize: 12,
  },
})
